from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from django.db import transaction

from accounts.permissions import CompanyAccessPermission
from .models import ASELead
from .serializers import ASELeadSerializer, ASELeadListSerializer
from eswari_crm.ws_utils import notify_ase_data_changed


class ASELeadPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 2000  # Increased to support larger datasets


class ASELeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ASE Leads
    """
    queryset = ASELead.objects.none()  # Required by DRF router; actual data from get_queryset
    serializer_class = ASELeadSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    pagination_class = ASELeadPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Search fields
    search_fields = [
        'company_name',
        'contact_person',
        'email',
        'phone',
        'industry',
        'notes',
    ]
    
    # Filter fields
    filterset_fields = [
        'status',
        'priority',
        'industry',
        'assigned_to',
        'created_by',
        'has_website',
        'has_social_media',
    ]
    
    # Ordering fields
    ordering_fields = [
        'created_at',
        'updated_at',
        'company_name',
        'status',
        'priority',
        'next_follow_up',
        'estimated_project_value',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ASELead.objects.select_related('company', 'assigned_to', 'created_by').all()

        # Role-based scoping
        if user.is_superuser:
            company_id = self.request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
        elif user.role == 'admin':
            company_id = self.request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
            else:
                qs = qs.filter(company=user.company)
        elif user.role == 'hr':
            qs = qs.filter(company=user.company)
        elif not user.company:
            return qs.none()
        elif user.role == 'employee':
            qs = qs.filter(company=user.company).filter(Q(assigned_to=user) | Q(created_by=user)).distinct()
        elif user.role == 'manager':
            employee_ids = list(
                user.__class__.objects.filter(manager=user, company=user.company).values_list('id', flat=True)
            )
            employee_ids.append(user.id)
            qs = qs.filter(company=user.company).filter(
                Q(assigned_to__id__in=employee_ids) | Q(created_by__id__in=employee_ids)
            ).distinct()
        else:
            return qs.none()

        # Date filters
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        month = self.request.query_params.get('month')

        if month and not (date_from or date_to):
            # Use date range instead of __year/__month which operates in UTC
            # and misses records created near midnight in IST
            try:
                from datetime import date, timedelta
                year_str, month_str = month.split('-')
                y, m = int(year_str), int(month_str)
                first = date(y, m, 1)
                next_first = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
                last = next_first - timedelta(days=1)
                qs = qs.filter(created_at__date__gte=first, created_at__date__lte=last)
            except (ValueError, IndexError):
                pass

        if date_from:
            from datetime import datetime
            try:
                qs = qs.filter(created_at__date__gte=datetime.strptime(date_from, '%Y-%m-%d').date())
            except ValueError:
                pass
        if date_to:
            from datetime import datetime
            try:
                qs = qs.filter(created_at__date__lte=datetime.strptime(date_to, '%Y-%m-%d').date())
            except ValueError:
                pass

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ASELeadListSerializer
        return ASELeadSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in ['admin', 'hr']:
            company = serializer.validated_data.get('company')
            if not company:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'company': 'This field is required for admin/hr users.'})
            # Default assigned_to to the creating user if not provided
            if not serializer.validated_data.get('assigned_to'):
                serializer.save(created_by=user, assigned_to=user)
            else:
                serializer.save(created_by=user)
        elif user.role == 'employee':
            # Employee leads are ALWAYS assigned to themselves — no override allowed
            # Remove assigned_to from validated_data if present
            validated_data = serializer.validated_data
            if 'assigned_to' in validated_data:
                validated_data.pop('assigned_to')
            
            serializer.save(created_by=user, company=user.company, assigned_to=user)
        elif user.role == 'manager':
            # Default assigned_to to manager themselves if not explicitly provided
            if not serializer.validated_data.get('assigned_to'):
                # Remove assigned_to from validated_data if present
                validated_data = serializer.validated_data
                if 'assigned_to' in validated_data:
                    validated_data.pop('assigned_to')
                
                serializer.save(created_by=user, company=user.company, assigned_to=user)
            else:
                serializer.save(created_by=user, company=user.company)
        else:
            serializer.save(created_by=user, company=user.company)
        
        # Notify all ASE clients of new lead
        notify_ase_data_changed('leads', 'created')
    
    def perform_destroy(self, instance):
        record_id = instance.id
        instance.delete()
        notify_ase_data_changed('leads', 'deleted', record_id=record_id)

    @action(detail=False, methods=['get'])
    def creators(self, request):
        """
        Return all unique creators (created_by users) for the current queryset.
        No pagination — returns full list for filter dropdowns.
        """
        from accounts.models import User as UserModel

        user = request.user
        qs = ASELead.objects.all()

        if user.is_superuser:
            company_id = request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
        elif user.role in ['admin', 'hr']:
            company_id = request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
            elif user.company:
                qs = qs.filter(company=user.company)
            else:
                qs = qs.none()
        else:
            qs = self.get_queryset()

        creator_ids = qs.values_list('created_by', flat=True).distinct()
        users = UserModel.objects.filter(id__in=creator_ids).values('id', 'first_name', 'last_name', 'username')
        data = [
            {
                'id': u['id'],
                'name': f"{u['first_name']} {u['last_name']}".strip() or u['username']
            }
            for u in users
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def check_phone(self, request):
        """
        Check if a phone number already exists in the company.
        Query params: ?phone=<number>&exclude_id=<id>&company=<id>
        Returns: {"exists": true/false}
        """
        phone = request.query_params.get('phone', '').strip()
        exclude_id = request.query_params.get('exclude_id')
        company_id = request.query_params.get('company')
        if not phone:
            return Response({'exists': False})
        user = request.user
        # Use explicit company param if provided (admin switching companies), else user's company
        if company_id:
            qs = ASELead.objects.filter(phone=phone, company_id=company_id)
        else:
            company = getattr(user, 'company', None)
            if not company:
                return Response({'exists': False})
            qs = ASELead.objects.filter(phone=phone, company=company)
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        return Response({'exists': qs.exists()})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get ASE lead statistics
        """
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_status': {},
            'by_priority': {},
            'by_industry': {},
            'total_estimated_value': 0,
            'total_monthly_retainer': 0,
        }
        
        # Status breakdown
        for status_choice in ASELead.STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(status=status_code).count()
            stats['by_status'][status_code] = {
                'count': count,
                'label': status_choice[1]
            }
        
        # Priority breakdown
        priority_choices = [
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ]
        for priority_choice in priority_choices:
            priority_code = priority_choice[0]
            count = queryset.filter(priority=priority_code).count()
            stats['by_priority'][priority_code] = {
                'count': count,
                'label': priority_choice[1]
            }
        
        # Calculate totals using DB aggregation (no Python loops)
        totals = queryset.aggregate(
            total_value=Sum('estimated_project_value'),
            total_retainer=Sum('monthly_retainer'),
        )
        stats['total_estimated_value'] = totals['total_value'] or 0
        stats['total_monthly_retainer'] = totals['total_retainer'] or 0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def follow_ups(self, request):
        """
        Get leads that need follow-up
        """
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            next_follow_up__date__lte=today
        ).exclude(
            status__in=['won', 'lost']
        )
        
        serializer = ASELeadListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def high_priority(self, request):
        """
        Get high priority leads
        """
        queryset = self.get_queryset().filter(
            priority__in=['high', 'urgent']
        ).exclude(
            status__in=['won', 'lost']
        )
        
        serializer = ASELeadListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import ASE leads in a single DB transaction.
        Expects: {"leads": [{...}, {...}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        rows = request.data.get('leads', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No leads provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        # For employee: assign all to themselves
        # For manager: round-robin across their team (including themselves)
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

        for i, row in enumerate(rows):
            try:
                assigned_to = assignees[i % len(assignees)] if assignees else None
                obj = ASELead(
                    company_name=row.get('company_name', ''),
                    contact_person=row.get('contact_person', ''),
                    email=row.get('email') or None,
                    phone=row.get('phone', ''),
                    website=row.get('website') or None,
                    industry=row.get('industry', 'other'),
                    budget_amount=row.get('budget_amount', ''),
                    status=row.get('status', 'new'),
                    priority=row.get('priority', 'medium'),
                    marketing_goals=row.get('marketing_goals', ''),
                    notes=row.get('notes', ''),
                    has_website=bool(row.get('has_website', False)),
                    has_social_media=bool(row.get('has_social_media', False)),
                    service_interests=row.get('service_interests', []),
                    company=company,
                    created_by=user,
                    assigned_to=assigned_to,
                )
                to_create.append(obj)
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with transaction.atomic():
                created = ASELead.objects.bulk_create(
                    to_create,
                    batch_size=500,
                    ignore_conflicts=True,  # skip duplicate phone+company rows
                )
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def export_by_ids(self, request):
        """
        Export specific leads by ID list as Excel/CSV.
        Expects: {"ids": [1, 2, 3, ...], "format": "xlsx"} (format optional, defaults to xlsx)
        Returns: Excel file download
        """
        import io
        import openpyxl
        from django.http import HttpResponse

        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset().filter(id__in=ids)
        if not queryset.exists():
            return Response({'error': 'No leads found for given IDs'}, status=status.HTTP_404_NOT_FOUND)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'ASE Leads'

        headers = [
            'ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Website',
            'Industry', 'Company Size', 'Annual Revenue',
            'Services', 'Budget', 'Current Marketing Spend',
            'Has Website', 'Has Social Media', 'Current SEO Agency',
            'Marketing Goals', 'Lead Source', 'Referral Source',
            'Status', 'Priority',
            'Assigned To', 'Created By',
            'First Contact', 'Last Contact', 'Next Follow-up',
            'Est. Project Value', 'Monthly Retainer',
            'Notes', 'Created At',
        ]
        ws.append(headers)

        for lead in queryset:
            ws.append([
                lead.id,
                lead.company_name,
                lead.contact_person,
                lead.email or '',
                lead.phone,
                lead.website or '',
                lead.industry,
                lead.company_size or '',
                lead.annual_revenue or '',
                ', '.join(lead.service_interests_display),
                lead.budget_amount or '',
                lead.current_marketing_spend or '',
                'Yes' if lead.has_website else 'No',
                'Yes' if lead.has_social_media else 'No',
                lead.current_seo_agency or '',
                lead.marketing_goals or '',
                lead.lead_source or '',
                lead.referral_source or '',
                lead.status,
                lead.priority,
                lead.assigned_to_name or '',
                lead.created_by_name or '',
                str(lead.first_contact_date.date()) if lead.first_contact_date else '',
                str(lead.last_contact_date.date()) if lead.last_contact_date else '',
                str(lead.next_follow_up.date()) if lead.next_follow_up else '',
                str(lead.estimated_project_value) if lead.estimated_project_value else '',
                str(lead.monthly_retainer) if lead.monthly_retainer else '',
                lead.notes or '',
                str(lead.created_at.date()),
            ])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="ase-leads-export-{len(ids)}.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def bulk_delete_by_ids(self, request):
        """
        Delete specific leads by ID list.
        Expects: {"ids": [1, 2, 3, ...]}
        Returns: {"deleted_count": N}
        """
        user = request.user
        if user.role not in ['admin', 'manager'] and not user.is_superuser:
            raise PermissionDenied("Only admins and managers can bulk delete.")

        ids = request.data.get('ids', [])
        if not ids:
            return Response({'deleted_count': 0})

        # Scope strictly to the company — never allow cross-company deletes
        qs = ASELead.objects.filter(id__in=ids)
        if user.is_superuser:
            company_id = request.data.get('company') or request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
        elif user.role in ['admin', 'hr']:
            company_id = request.data.get('company') or request.query_params.get('company')
            if company_id:
                qs = qs.filter(company_id=company_id)
            elif user.company:
                qs = qs.filter(company=user.company)
            else:
                return Response({'deleted_count': 0})
        else:
            # manager / employee — always scope to their own company
            if not user.company:
                return Response({'deleted_count': 0})
            qs = qs.filter(company=user.company)

        count = qs.count()
        with transaction.atomic():
            qs.delete()

        return Response({'deleted_count': count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_delete_by_filter(self, request):
        """
        Delete all ASE leads matching the given filters.
        Used for cross-page "select all matching" bulk delete.
        Expects: {"search": "...", "status": "new", "priority": "high"}  (all optional)
        Returns: {"deleted_count": N}
        """
        user = request.user
        if user.role not in ['admin', 'manager']:
            raise PermissionDenied("Only admins and managers can bulk delete by filter.")

        queryset = self.get_queryset()

        search = request.data.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(contact_person__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(notes__icontains=search)
            )

        status_filter = request.data.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority_filter = request.data.get('priority', '').strip()
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        count = queryset.count()
        with transaction.atomic():
            queryset.delete()

        return Response({'deleted_count': count}, status=status.HTTP_200_OK)