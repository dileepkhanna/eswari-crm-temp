import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from accounts.permissions import CompanyAccessPermission
from .models import ASECustomer
from .serializers import ASECustomerSerializer, ASECustomerListSerializer, CallLogSerializer, CustomerNoteSerializer

logger = logging.getLogger(__name__)


class ASECustomerPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 2000  # Increased to support larger datasets


class ASECustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ASE Customers (simple version)
    """
    queryset = ASECustomer.objects.none()  # Required by DRF router; actual data from get_queryset
    serializer_class = ASECustomerSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    pagination_class = ASECustomerPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Search fields
    search_fields = [
        'name',
        'phone',
        'email',
        'notes',
    ]
    
    # Filter fields
    filterset_fields = [
        'call_status',
        'assigned_to',
        'is_converted',
    ]
    
    # Ordering fields
    ordering_fields = [
        'created_at',
        'updated_at',
        'name',
        'call_status',
        'scheduled_date',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ASECustomer.objects.select_related('company', 'assigned_to', 'created_by').all()

        if user.role == 'admin':
            company_id = self.request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs
        if user.role == 'hr':
            return qs.filter(company=user.company)

        qs = qs.filter(company=user.company)

        if user.role == 'employee':
            # Show records assigned to OR created by this employee
            return qs.filter(Q(assigned_to=user) | Q(created_by=user)).distinct()

        if user.role == 'manager':
            employee_ids = list(
                user.__class__.objects.filter(manager=user, company=user.company).values_list('id', flat=True)
            )
            employee_ids.append(user.id)
            # Also show unassigned records in the company so managers can assign them
            return qs.filter(
                Q(assigned_to__id__in=employee_ids) |
                Q(created_by__id__in=employee_ids) |
                Q(assigned_to__isnull=True)
            ).distinct()

        return qs
    
    def get_serializer_class(self):
        """
        Use different serializers for different actions
        """
        if self.action == 'list':
            return ASECustomerListSerializer
        return ASECustomerSerializer
    
    def perform_create(self, serializer):
        """
        Set created_by and company when creating ASE customer.
        Employees are auto-assigned to themselves.
        """
        user = self.request.user
        if user.role in ['manager', 'employee']:
            serializer.save(
                created_by=user,
                company=user.company,
                assigned_to=user,  # auto-assign to creator
            )
        else:
            # Admin/HR must specify company in request data
            company = serializer.validated_data.get('company')
            if not company:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'company': 'This field is required.'})
            serializer.save(created_by=user)
    
    def perform_update(self, serializer):
        """Auto-create a CallLog entry when call_status changes."""
        from .models import CallLog
        instance = serializer.instance
        old_status = instance.call_status
        updated = serializer.save()
        new_status = updated.call_status
        if new_status != old_status:
            CallLog.objects.create(
                customer=updated,
                called_by=self.request.user,
                call_status=new_status,
                custom_status=updated.custom_call_status if new_status == 'custom' else None,
                notes=None,
            )
    
    def perform_destroy(self, instance):
        """
        Custom delete logic with role-based permissions.
        - Employees can only delete customers they created or are assigned to
        - Managers can delete any customer in their team
        - Admin/HR can delete any customer in their company
        """
        user = self.request.user
        
        # Admin and HR can delete any customer in their accessible companies
        if user.role in ['admin', 'hr']:
            instance.delete()
            return
        
        # Managers can delete any customer in their company
        if user.role == 'manager':
            if instance.company_id == user.company_id:
                instance.delete()
                return
            else:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to delete this customer.")
        
        # Employees can only delete customers they created or are assigned to
        if user.role == 'employee':
            if instance.assigned_to_id == user.id or instance.created_by_id == user.id:
                instance.delete()
                return
            else:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only delete customers that are assigned to you or created by you.")

    @action(detail=False, methods=['get'])
    def check_phone(self, request):
        """
        Check if a phone number already exists in the company.
        Query params: ?phone=<number>&exclude_id=<id> (exclude_id for edit mode)
        Returns: {"exists": true/false}
        """
        phone = request.query_params.get('phone', '').strip()
        exclude_id = request.query_params.get('exclude_id')
        if not phone:
            return Response({'exists': False})
        user = request.user
        company = getattr(user, 'company', None)
        if user.role == 'admin':
            company_id = request.query_params.get('company')
            if company_id:
                from accounts.models import Company
                try:
                    company = Company.objects.get(id=company_id)
                except Company.DoesNotExist:
                    pass
        if not company:
            return Response({'exists': False})
        qs = ASECustomer.objects.filter(phone=phone, company=company)
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        return Response({'exists': qs.exists()})

    @action(detail=True, methods=['get', 'post'])
    def notes_history(self, request, pk=None):
        """GET: list notes for a customer. POST: append a new note."""
        from .models import CustomerNote
        customer = self.get_object()

        if request.method == 'GET':
            notes = CustomerNote.objects.filter(customer=customer).select_related('author')
            serializer = CustomerNoteSerializer(notes, many=True)
            return Response(serializer.data)

        # POST — append new note
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        note = CustomerNote.objects.create(
            customer=customer,
            author=request.user,
            content=content,
        )
        return Response(CustomerNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def call_logs(self, request, pk=None):
        """GET: list call logs for a customer. POST: add a manual call log entry."""
        from .models import CallLog
        customer = self.get_object()

        if request.method == 'GET':
            logs = CallLog.objects.filter(customer=customer).select_related('called_by')
            serializer = CallLogSerializer(logs, many=True)
            return Response(serializer.data)

        # POST — manual log entry
        data = {
            'customer': customer.id,
            'call_status': request.data.get('call_status', customer.call_status),
            'custom_status': request.data.get('custom_status'),
            'notes': request.data.get('notes'),
        }
        serializer = CallLogSerializer(data=data)
        if serializer.is_valid():
            serializer.save(called_by=request.user, customer=customer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def team_performance(self, request):
        """
        Per-employee performance stats for managers and admins.
        Returns: calls_today, answered_today, answered_rate, conversions_this_week, total_assigned
        Scoped to the requesting user's team (manager sees their employees; admin sees all in company).
        Optional: ?company=<id> for admin cross-company view.
        """
        from django.utils import timezone
        from django.db.models import Count, Q
        from .models import CallLog
        from accounts.models import User

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timezone.timedelta(days=now.weekday())  # Monday

        user = request.user

        # Determine which employees to report on
        if user.role == 'admin':
            company_id = request.query_params.get('company') or getattr(user.company, 'id', None)
            employees = User.objects.filter(
                company_id=company_id,
                role__in=['employee', 'manager'],
                is_active=True,
            ).exclude(id=user.id) if company_id else User.objects.none()
        elif user.role == 'manager':
            employee_ids = list(
                User.objects.filter(manager=user, company=user.company).values_list('id', flat=True)
            )
            employees = User.objects.filter(id__in=employee_ids, is_active=True)
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        results = []
        for emp in employees.select_related('company'):
            # Calls logged today (via CallLog)
            calls_today = CallLog.objects.filter(
                called_by=emp,
                called_at__gte=today_start,
            ).count()

            # Answered today
            answered_today = CallLog.objects.filter(
                called_by=emp,
                called_at__gte=today_start,
                call_status='answered',
            ).count()

            # Conversions this week (customers converted by this employee)
            conversions_week = ASECustomer.objects.filter(
                assigned_to=emp,
                is_converted=True,
                updated_at__gte=week_start,
            ).count()

            # Total assigned (active, non-converted)
            total_assigned = ASECustomer.objects.filter(
                assigned_to=emp,
                is_converted=False,
            ).count()

            # Pending (still pending status)
            pending = ASECustomer.objects.filter(
                assigned_to=emp,
                call_status='pending',
                is_converted=False,
            ).count()

            answered_rate = round((answered_today / calls_today * 100) if calls_today > 0 else 0)

            results.append({
                'employee_id': emp.id,
                'name': f"{emp.first_name} {emp.last_name}".strip() or emp.username,
                'role': emp.role,
                'calls_today': calls_today,
                'answered_today': answered_today,
                'answered_rate': answered_rate,
                'conversions_this_week': conversions_week,
                'total_assigned': total_assigned,
                'pending': pending,
            })

        # Sort by calls_today desc
        results.sort(key=lambda x: x['calls_today'], reverse=True)

        return Response({
            'date': str(timezone.localdate()),
            'week_start': str(week_start.date()),
            'employees': results,
        })

    @action(detail=False, methods=['get'])
    def overdue_follow_ups(self, request):
        """
        Return count (and optionally results) of overdue follow-ups:
        scheduled_date is in the past AND call_status is still 'pending'.
        """
        now = timezone.now()
        qs = self.get_queryset().filter(
            scheduled_date__lt=now,
            call_status='pending',
        )
        count_only = request.query_params.get('count_only', 'false').lower() == 'true'
        if count_only:
            return Response({'count': qs.count()})
        serializer = ASECustomerListSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def follow_ups(self, request):
        """
        Return today's follow-ups for the current user.
        Also accepts ?date=YYYY-MM-DD to query a specific date.
        """
        from .tasks import get_todays_followups_for_user
        from django.utils import timezone
        from datetime import date as date_type

        date_param = request.query_params.get('date')
        if date_param:
            try:
                target_date = date_type.fromisoformat(date_param)
            except ValueError:
                return Response({'error': 'Invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = timezone.localdate()

        qs = get_todays_followups_for_user(request.user)
        # Re-filter by the requested date (get_todays_followups_for_user uses today internally)
        qs = ASECustomer.objects.filter(
            id__in=qs.values_list('id', flat=True),
            scheduled_date__date=target_date,
        )

        serializer = ASECustomerListSerializer(qs, many=True)
        return Response({
            'date': str(target_date),
            'count': qs.count(),
            'results': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get ASE customer statistics
        """
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_call_status': {},
            'converted': queryset.filter(is_converted=True).count(),
            'pending_calls': queryset.filter(call_status='pending').count(),
        }
        
        # Call status breakdown
        for status_choice in ASECustomer.CALL_STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(call_status=status_code).count()
            stats['by_call_status'][status_code] = {
                'count': count,
                'label': status_choice[1]
            }
        
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """
        Bulk assign multiple customers to an employee.
        Expects: {"customer_ids": [...], "assigned_to": <user_id>}
        """
        customer_ids = request.data.get('customer_ids', [])
        assigned_to_id = request.data.get('assigned_to')

        if not customer_ids:
            return Response({'error': 'No customer IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not assigned_to_id:
            return Response({'error': 'assigned_to is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from accounts.models import User

            # Determine the company scope from the first customer in the queryset
            qs = self.get_queryset().filter(id__in=customer_ids)
            if not qs.exists():
                return Response({'error': 'No matching customers found'}, status=status.HTTP_400_BAD_REQUEST)

            # Collect all distinct companies from the selected customers
            customer_companies = set(qs.values_list('company_id', flat=True))

            # Assignee must belong to one of those companies (same-company enforcement)
            assignee = User.objects.filter(
                id=assigned_to_id,
                is_active=True,
                company_id__in=customer_companies,
            ).exclude(role='admin').first()

            if not assignee:
                return Response(
                    {'error': 'User not found or does not belong to the same company as the selected customers'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            updated = qs.update(assigned_to=assignee)

            return Response({
                'success': True,
                'updated': updated,
                'assigned_to': assignee.get_full_name() or assignee.username,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """
        Bulk update call_status for multiple customers.
        Expects: {"customer_ids": [...], "call_status": "<status>"}
        """
        customer_ids = request.data.get('customer_ids', [])
        new_status = request.data.get('call_status', '').strip()

        if not customer_ids:
            return Response({'error': 'No customer IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_status:
            return Response({'error': 'call_status is required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [s[0] for s in ASECustomer.CALL_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(id__in=customer_ids)
        updated = qs.update(call_status=new_status)
        return Response({'success': True, 'updated': updated})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete multiple customers with proper permission checks.
        Expects: {"customer_ids": [...]}
        """
        try:
            customer_ids = request.data.get('customer_ids', [])
            if not customer_ids:
                return Response({'error': 'No customer IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            qs = self.get_queryset().filter(id__in=customer_ids)
            
            # Convert to list to avoid .distinct() issue with .delete()
            customers_to_delete = list(qs)
            
            if not customers_to_delete:
                return Response({'error': 'No customers found to delete'}, status=status.HTTP_404_NOT_FOUND)
            
            # For employees, verify they can delete each customer
            if user.role == 'employee':
                denied_customers = []
                
                for customer in customers_to_delete:
                    if customer.assigned_to_id != user.id and customer.created_by_id != user.id:
                        denied_customers.append(customer.name or customer.phone)
                
                if denied_customers:
                    return Response({
                        'error': f'You can only delete customers assigned to you or created by you. Cannot delete: {", ".join(denied_customers[:3])}{"..." if len(denied_customers) > 3 else ""}'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # For managers, verify company access
            elif user.role == 'manager':
                for customer in customers_to_delete:
                    if customer.company_id != user.company_id:
                        return Response({
                            'error': 'You can only delete customers from your company'
                        }, status=status.HTTP_403_FORBIDDEN)
            
            # Delete each customer individually (avoids .distinct() issue)
            deleted_count = 0
            for customer in customers_to_delete:
                customer.delete()
                deleted_count += 1
            
            return Response({'success': True, 'deleted': deleted_count})
        except Exception as e:
            logger.error(f"Error in bulk_delete: {str(e)}", exc_info=True)
            return Response({'error': f'Failed to delete customers: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import ASE customers in a single DB transaction.
        Expects: {"customers": [{phone, name, company_name, ...}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        from django.db import transaction as db_transaction

        rows = request.data.get('customers', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No customers provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        # Build assignee pool: employee → self, manager → team + self, admin/hr → no auto-assign
        from accounts.models import User as UserModel
        if user.role == 'employee':
            assignees = [user]
        elif user.role == 'manager':
            team_ids = list(
                UserModel.objects.filter(manager=user, company=company, is_active=True).values_list('id', flat=True)
            )
            team_ids.append(user.id)
            assignees = list(UserModel.objects.filter(id__in=team_ids))
        else:
            assignees = []

        to_create = []
        errors = []

        # Pre-fetch existing phones in this company to detect duplicates efficiently
        existing_phones = set(
            ASECustomer.objects.filter(company=company).values_list('phone', flat=True)
        )
        seen_phones = set()  # track duplicates within the import batch itself

        for i, row in enumerate(rows):
            phone = str(row.get('phone', '')).strip()
            if not phone:
                errors.append({'row': i + 1, 'error': 'Phone is required'})
                continue
            if phone in existing_phones:
                errors.append({'row': i + 1, 'phone': phone, 'error': f"Phone '{phone}' already exists in your company"})
                continue
            if phone in seen_phones:
                errors.append({'row': i + 1, 'phone': phone, 'error': f"Phone '{phone}' is duplicated in this import"})
                continue
            seen_phones.add(phone)
            try:
                assigned_to = assignees[len(to_create) % len(assignees)] if assignees else None
                to_create.append(ASECustomer(
                    phone=phone,
                    name=row.get('name') or None,
                    email=row.get('email') or None,
                    company_name=row.get('company_name') or None,
                    call_status=row.get('call_status', 'pending'),
                    notes=row.get('notes') or None,
                    company=company,
                    created_by=user,
                    assigned_to=assigned_to,
                ))
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with db_transaction.atomic():
                created = ASECustomer.objects.bulk_create(to_create, batch_size=500)
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def import_customers(self, request):
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file type
        if not file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response(
                {'error': 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import pandas as pd
            
            # Read file based on type
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            
            # Validate required columns - only phone is required
            required_columns = ['phone']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response(
                    {'error': f'Missing required columns: {", ".join(missing_columns)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get available employees for auto-assignment
            from accounts.models import User
            user_role = request.user.role
            if user_role == 'employee':
                # Employee imports → assign all to themselves
                employees_list = [request.user]
            elif user_role == 'manager':
                # Manager imports → round-robin across team + self
                team_ids = list(
                    User.objects.filter(manager=request.user, company=request.user.company, is_active=True).values_list('id', flat=True)
                )
                team_ids.append(request.user.id)
                employees_list = list(User.objects.filter(id__in=team_ids))
            else:
                # Admin/HR → round-robin across all active non-admin users in company
                employees_list = list(User.objects.filter(
                    company=request.user.company,
                    role__in=['employee', 'manager'],
                    is_active=True
                ).order_by('id'))
            
            created_customers = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Prepare customer data - only use the 3 template fields
                    customer_data = {
                        'phone': str(row['phone']).strip(),
                        'name': str(row.get('name', '')).strip() if pd.notna(row.get('name')) else None,
                        'company_name': str(row.get('company_name', '')).strip() if pd.notna(row.get('company_name')) else None,
                        'call_status': 'pending',  # Default status
                        'company': request.user.company,
                        'created_by': request.user,
                    }
                    
                    # Auto-assign to employees in round-robin fashion
                    if employees_list:
                        assigned_employee = employees_list[len(created_customers) % len(employees_list)]
                        customer_data['assigned_to'] = assigned_employee
                    
                    # Create customer
                    customer = ASECustomer.objects.create(**customer_data)
                    created_customers.append({
                        'id': customer.id,
                        'name': customer.name,
                        'phone': customer.phone,
                        'assigned_to': customer.assigned_to.username if customer.assigned_to else None
                    })
                    
                except Exception as e:
                    errors.append({
                        'row': index + 1,
                        'error': str(e),
                        'data': dict(row)
                    })
            
            return Response({
                'success': True,
                'message': f'Successfully imported {len(created_customers)} customers',
                'created_customers': created_customers,
                'errors': errors,
                'total_processed': len(df),
                'total_created': len(created_customers),
                'total_errors': len(errors)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to process file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_customers(self, request):
        """
        Export ASE customers to Excel file
        """
        try:
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            # Get customers
            customers = self.get_queryset()
            
            # Prepare data for export
            data = []
            for customer in customers:
                data.append({
                    'ID': customer.id,
                    'Name': customer.name,
                    'Phone': customer.phone,
                    'Email': customer.email or '',
                    'Call Status': customer.get_call_status_display(),
                    'Custom Call Status': customer.custom_call_status or '',
                    'Company': customer.company.name,
                    'Assigned To': customer.assigned_to_name or '',
                    'Notes': customer.notes or '',
                    'Is Converted': 'Yes' if customer.is_converted else 'No',
                    'Converted Lead ID': customer.converted_lead_id or '',
                    'Created At': customer.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'Created By': customer.created_by_name,
                })
            
            # Create DataFrame
            df = pd.DataFrame(data)
            
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='ASE Customers', index=False)
            
            output.seek(0)
            
            # Create response
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="ase_customers_export.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to export customers: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def teammates(self, request):
        """
        Return the list of users that the current user can assign customers to.
        - employee: their manager's team (all employees under the same manager) + themselves
        - manager: their direct reports + themselves
        - admin/hr: all non-admin users in the company (or ?company=<id> for admin)
        """
        from accounts.models import User as UserModel
        user = request.user

        if user.role == 'admin':
            company_id = request.query_params.get('company') or getattr(user.company, 'id', None)
            if company_id:
                qs = UserModel.objects.filter(
                    company_id=company_id,
                    is_active=True,
                ).exclude(role='admin').order_by('first_name', 'last_name')
            else:
                qs = UserModel.objects.none()
        elif user.role == 'hr':
            qs = UserModel.objects.filter(
                company=user.company,
                is_active=True,
            ).exclude(role='admin').order_by('first_name', 'last_name')
        elif user.role == 'manager':
            team_ids = list(
                UserModel.objects.filter(manager=user, company=user.company, is_active=True).values_list('id', flat=True)
            )
            team_ids.append(user.id)
            qs = UserModel.objects.filter(id__in=team_ids).order_by('first_name', 'last_name')
        else:
            # employee: find teammates (same manager) + themselves
            if user.manager:
                team_ids = list(
                    UserModel.objects.filter(manager=user.manager, company=user.company, is_active=True).values_list('id', flat=True)
                )
            else:
                team_ids = [user.id]
            qs = UserModel.objects.filter(id__in=team_ids).order_by('first_name', 'last_name')

        data = [
            {
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': u.role,
            }
            for u in qs
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """
        Download Excel template for customer import
        """
        try:
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            # Create template data - only phone, name, and company_name
            template_data = {
                'phone': ['1234567890', '0987654321'],
                'name': ['John Doe', 'Jane Smith'],
                'company_name': ['ABC Corp', 'XYZ Ltd']
            }
            
            df = pd.DataFrame(template_data)
            
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Template', index=False)
                
                # Add instructions sheet - only for the 3 fields
                instructions = pd.DataFrame({
                    'Field': ['phone', 'name', 'company_name'],
                    'Required': ['Yes', 'No', 'No'],
                    'Description': [
                        'Phone number (required - digits only)',
                        'Customer full name (optional)',
                        'Company name (optional)'
                    ]
                })
                instructions.to_excel(writer, sheet_name='Instructions', index=False)
            
            output.seek(0)
            
            # Create response
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="ase_customers_import_template.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create template: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reassign_customer(self, request, pk=None):
        """
        Reassign customer to another employee (telecaller workflow)
        """
        customer = self.get_object()
        
        new_assignee_id = request.data.get('assigned_to')
        reason = request.data.get('reason', '')
        
        if not new_assignee_id:
            return Response(
                {'error': 'New assignee is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from accounts.models import User
            if not new_assignee_id or str(new_assignee_id).strip() == '':
                # Remove assignment
                old_assignee = customer.assigned_to
                customer.assigned_to = None
                customer.save()
                return Response({
                    'success': True,
                    'message': 'Assignment removed',
                    'old_assignee': old_assignee.username if old_assignee else None,
                    'new_assignee': None,
                })
            new_assignee = User.objects.get(
                id=new_assignee_id,
                company=customer.company,
                is_active=True
            )

            # Employees can only reassign to managers (same company)
            if request.user.role == 'employee' and new_assignee.role != 'manager':
                return Response(
                    {'error': 'Employees can only assign customers to managers'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            old_assignee = customer.assigned_to
            customer.assigned_to = new_assignee
            customer.save()
            
            # Log the reassignment activity
            activity_data = {
                'activity_type': 'reassignment',
                'title': f'Customer reassigned from {old_assignee.username if old_assignee else "Unassigned"} to {new_assignee.username}',
                'description': f'Reason: {reason}' if reason else 'No reason provided',
                'metadata': {
                    'old_assignee_id': old_assignee.id if old_assignee else None,
                    'new_assignee_id': new_assignee.id,
                    'reason': reason
                }
            }
            
            self.add_activity(request, pk, activity_data)
            
            return Response({
                'success': True,
                'message': f'Customer reassigned to {new_assignee.username}',
                'old_assignee': old_assignee.username if old_assignee else None,
                'new_assignee': new_assignee.username
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid assignee'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to reassign customer: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def add_activity(self, request, pk=None, activity_data=None):
        """
        Add activity to customer
        """
        customer = self.get_object()
        
        # Use provided activity_data or get from request
        if activity_data is None:
            activity_data = request.data
        
        # Create activity record (simplified - you can expand this)
        activity = {
            'customer_id': customer.id,
            'activity_type': activity_data.get('activity_type', 'note'),
            'title': activity_data.get('title', ''),
            'description': activity_data.get('description', ''),
            'metadata': activity_data.get('metadata', {}),
            'created_by': request.user.id,
            'created_at': timezone.now().isoformat()
        }
        
        # For now, just return success (you can implement proper activity logging later)
        return Response({
            'success': True,
            'message': 'Activity added successfully',
            'activity': activity
        })
    
    def auto_reassign_remaining_customers(self, converted_employee, manager):
        """
        Auto-reassign remaining customers when an employee converts a customer to lead
        """
        try:
            from accounts.models import User
            
            # Get remaining non-converted customers assigned to this employee
            remaining_customers = ASECustomer.objects.filter(
                assigned_to=converted_employee,
                is_converted=False,
                company=converted_employee.company
            ).exclude(converted_lead_id__isnull=False)
            
            if not remaining_customers.exists():
                return
            
            # Get other available employees/telecallers
            available_employees = User.objects.filter(
                company=converted_employee.company,
                role__in=['employee', 'telecaller'],
                is_active=True
            ).exclude(id=converted_employee.id)
            
            if not available_employees.exists():
                return
            
            # Redistribute customers among available employees
            for i, customer in enumerate(remaining_customers):
                new_assignee = available_employees[i % available_employees.count()]
                customer.assigned_to = new_assignee
                customer.save()
                
                # Log the auto-reassignment
                logger.info(f"Auto-reassigned customer {customer.id} from {converted_employee.username} to {new_assignee.username}")
                
        except Exception as e:
            # Log error but don't fail the conversion
            logger.error(f"Failed to auto-reassign customers: {str(e)}")
    
    @action(detail=True, methods=['post'])
    def convert_to_lead(self, request, pk=None):
        """
        Convert ASE Customer to ASE Lead
        """
        # Debug: Log the incoming data
        logger.info(f"Converting customer {pk} with data: {request.data}")
        
        customer = self.get_object()
        
        if customer.is_converted:
            return Response(
                {'error': 'Customer has already been converted to a lead'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import ASE Lead model and serializer
        from ase_leads.models import ASELead
        from ase_leads.serializers import ASELeadSerializer
        
        # Prepare lead data from customer and request data
        lead_data = {
            # Copy basic info from customer — fall back to phone if name is blank
            'contact_person': (customer.name or '').strip() or request.data.get('contact_person', '').strip() or customer.phone,
            'phone': customer.phone,
            'notes': customer.notes or '',
            
            # Get additional info from request
            'company_name': request.data.get('company_name', ''),
            'industry': request.data.get('industry', 'other'),
            'service_interests': request.data.get('service_interests', []),
            'budget_amount': request.data.get('budget_amount', request.data.get('budget_range', '')),
            'marketing_goals': request.data.get('marketing_goals', ''),
            'has_website': request.data.get('has_website', False),
            'has_social_media': request.data.get('has_social_media', False),
            'current_seo_agency': request.data.get('current_seo_agency', ''),
            'status': request.data.get('status', 'new'),
            'priority': request.data.get('priority', 'medium'),
            
            # Set company (use the customer's company ID)
            'company': customer.company.id,
            
            # Lead source
            'lead_source': 'customer_conversion',
        }
        
        # Only add email if customer has one
        if customer.email:
            lead_data['email'] = customer.email
        
        # Only add website if it's a valid URL
        website = request.data.get('website', '').strip()
        if website and website.startswith(('http://', 'https://')):
            lead_data['website'] = website
        
        # Set assigned_to if customer has one
        if customer.assigned_to:
            lead_data['assigned_to'] = customer.assigned_to.id
        
        # Debug: Log the prepared lead data
        logger.info(f"Prepared lead data: {lead_data}")
        
        # Create the lead using the serializer with proper context
        lead_serializer = ASELeadSerializer(
            data=lead_data,
            context={'request': request, 'override_company': customer.company}
        )
        if lead_serializer.is_valid():
            try:
                lead = lead_serializer.save(created_by=request.user)
                
                # Update customer as converted
                customer.is_converted = True
                customer.converted_lead_id = str(lead.id)
                
                # Auto-reassign remaining customers if this was assigned to an employee
                if customer.assigned_to and customer.assigned_to.role in ['employee', 'telecaller']:
                    self.auto_reassign_remaining_customers(customer.assigned_to, request.user)
                
                customer.save()
                
                return Response({
                    'success': True,
                    'message': 'Customer successfully converted to lead',
                    'lead_id': str(lead.id),
                    'customer_id': str(customer.id)
                })
            except Exception as e:
                # Log the error for debugging
                logger.error(f"Error saving lead: {str(e)}")
                
                return Response(
                    {'error': f'Failed to save lead: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Log validation errors for debugging
            logger.error(f"Lead validation errors: {lead_serializer.errors}")
            
            return Response(
                {'error': 'Failed to create lead', 'details': lead_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )