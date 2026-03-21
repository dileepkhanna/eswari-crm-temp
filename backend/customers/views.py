from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse
from .models import Customer, CallAllocation
from .serializers import CustomerSerializer, CallAllocationSerializer
from .services import ImportService, ValidationService, ConversionService, AnalyticsService
from .sanitization import InputSanitizer
from leads.models import Lead
from leads.serializers import LeadSerializer
from accounts.permissions import filter_by_user_access, can_hr_access_module, CompanyAccessPermission
from utils.mixins import CompanyFilterMixin

User = get_user_model()


class CustomerPagination(PageNumberPagination):
    """Custom pagination for customer list"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class CustomerViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    pagination_class = CustomerPagination  # Enable pagination with custom class
    
    def check_permissions(self, request):
        """Block HR users from accessing customers"""
        super().check_permissions(request)
        if request.user.role == 'hr':
            raise PermissionDenied("Access denied. HR users do not have permission to access this module.")
    
    def get_queryset(self):
        user = self.request.user
        print(f"DEBUG: User {user.username} (ID: {user.id}, Role: {user.role}) requesting customers")
        
        # Base queryset with optimized database queries
        base_queryset = Customer.objects.select_related('company', 'assigned_to', 'created_by')
        
        # Use the centralized permission filter
        queryset = filter_by_user_access(
            base_queryset, 
            user, 
            assigned_to_field='assigned_to',
            created_by_field='created_by'
        )
        
        # Apply filters from query parameters with sanitization
        # Filter by conversion status
        converted = self.request.query_params.get('converted', None)
        if converted is not None and converted.lower() != 'all':
            # Sanitize query parameter
            converted = InputSanitizer.sanitize_query_param(
                converted, 
                allowed_values=['true', 'false', 'all']
            )
            if converted == 'true':
                queryset = queryset.filter(is_converted=True)
            elif converted == 'false':
                queryset = queryset.filter(is_converted=False)
        
        # Filter by call status
        call_status = self.request.query_params.get('call_status', None)
        if call_status:
            # Sanitize query parameter
            call_status = InputSanitizer.sanitize_query_param(
                call_status,
                allowed_values=['pending', 'answered', 'not_answered', 'busy', 'switched_off', 
                               'not_reachable', 'callback', 'interested', 'not_interested']
            )
            if call_status:
                queryset = queryset.filter(call_status=call_status)
        
        # Search by name or phone (sanitize search term)
        search = self.request.query_params.get('search', None)
        if search:
            # Sanitize search input
            search = InputSanitizer.sanitize_string(search, max_length=100)
            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search) | Q(phone__icontains=search)
                )
        
        # Apply sorting/ordering
        ordering = self.request.query_params.get('ordering', None)
        if ordering:
            # Validate ordering field to prevent SQL injection (whitelist approach)
            valid_fields = ['created_at', '-created_at', 'name', '-name', 'call_status', '-call_status']
            ordering = InputSanitizer.sanitize_query_param(ordering, allowed_values=valid_fields)
            if ordering:
                queryset = queryset.order_by(ordering)
            else:
                # Default to created_at descending if invalid field provided
                queryset = queryset.order_by('-created_at')
        
        print(f"DEBUG: Returning {queryset.count()} customers for {user.role}")
        return queryset
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        # All authenticated users can create, read, update customers they have access to
        return [IsAuthenticated()]
    
    def perform_update(self, serializer):
        """Handle customer updates"""
        user = self.request.user
        customer = self.get_object()
        print(f"DEBUG: Updating customer {customer.id} by user {user.username} (ID: {user.id}, Role: {user.role})")
        
        # Employees can only update customers assigned to them
        if user.role == 'employee' and customer.assigned_to != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only update customers assigned to you.")
        
        serializer.save()
        print(f"DEBUG: Customer {customer.id} updated successfully")
    
    def perform_create(self, serializer):
        """Automatically set created_by to the current user"""
        user = self.request.user
        print(f"DEBUG: Creating customer by user {user.username} (ID: {user.id}, Role: {user.role})")
        
        try:
            # For employees, automatically assign the customer to themselves
            if user.role == 'employee':
                serializer.save(created_by=user, assigned_to=user)
                print(f"DEBUG: Employee created customer and auto-assigned to themselves")
            else:
                serializer.save(created_by=user)
                print(f"DEBUG: Admin/Manager created customer without auto-assignment")
        except Exception as e:
            # Handle duplicate phone number error
            if 'UNIQUE constraint failed' in str(e) or 'duplicate key value' in str(e):
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"phone": ["A customer with this phone number already exists."]})
            else:
                raise e
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='import')
    def import_customers(self, request):
        """
        Import customers from CSV or Excel file
        
        Endpoint: POST /api/customers/import/
        
        Request:
            - file: CSV or Excel file
            - import_type: 'csv' or 'excel'
        
        Response:
            {
                "success": true,
                "summary": {
                    "total_rows": 100,
                    "success_count": 95,
                    "duplicate_count": 3,
                    "error_count": 2,
                    "errors": [
                        {"row": 5, "phone": "123", "name": "John", "error": "Invalid phone format"},
                        ...
                    ]
                }
            }
        
        Validates:
            - REQ-001: CSV file upload support
            - REQ-005: Import summary
            - REQ-007: Clear error messages
            - REQ-075: File upload security validation
        """
        # Get file and import type
        file_obj = request.FILES.get('file')
        import_type = request.data.get('import_type', 'csv')
        
        if not file_obj:
            return Response(
                {
                    'success': False,
                    'error': 'No file provided',
                    'message': 'Please upload a CSV or Excel file'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file upload for security
        try:
            InputSanitizer.validate_file_upload(file_obj)
        except ValidationError as e:
            return Response(
                {
                    'success': False,
                    'error': 'File validation failed',
                    'message': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Parse file based on import type
            if import_type == 'csv':
                rows = ImportService.parse_csv(file_obj)
            elif import_type == 'excel':
                rows = ImportService.parse_excel(file_obj)
            else:
                return Response(
                    {
                        'success': False,
                        'error': 'Invalid import type',
                        'message': 'Import type must be "csv" or "excel"'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate import data (includes sanitization)
            valid_rows, error_rows = ImportService.validate_import_data(
                rows,
                request.user.company_id
            )
            
            # Bulk create customers
            if valid_rows:
                result = ImportService.bulk_create_customers(
                    valid_rows,
                    request.user,
                    request.user.company
                )
                success_count = result['success_count']
                duplicates_skipped = result['duplicates_skipped']
            else:
                success_count = 0
                duplicates_skipped = 0
            
            # Build response summary
            summary = {
                'total_rows': len(rows),
                'success_count': success_count,
                'duplicate_count': duplicates_skipped,
                'error_count': len(error_rows),
                'errors': error_rows
            }
            
            return Response({
                'success': True,
                'summary': summary
            })
            
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'error': 'File processing error',
                    'message': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='import/preview')
    def import_preview(self, request):
        """
        Preview import data before actual import
        
        Endpoint: POST /api/customers/import/preview/
        
        Request:
            - file: CSV or Excel file
            - import_type: 'csv' or 'excel'
        
        Response:
            {
                "preview": [
                    {"row": 1, "phone": "1234567890", "name": "John Doe", "valid": true},
                    {"row": 2, "phone": "invalid", "name": "Jane", "valid": false, "error": "Invalid phone"},
                    ...
                ],
                "total_rows": 100,
                "valid_count": 95,
                "error_count": 5
            }
        
        Validates:
            - REQ-013: Preview before import
            - REQ-075: File upload security validation
        """
        # Get file and import type
        file_obj = request.FILES.get('file')
        import_type = request.data.get('import_type', 'csv')
        
        if not file_obj:
            return Response(
                {
                    'error': 'No file provided',
                    'message': 'Please upload a CSV or Excel file'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file upload for security
        try:
            InputSanitizer.validate_file_upload(file_obj)
        except ValidationError as e:
            return Response(
                {
                    'error': 'File validation failed',
                    'message': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Parse file based on import type
            if import_type == 'csv':
                rows = ImportService.parse_csv(file_obj)
            elif import_type == 'excel':
                rows = ImportService.parse_excel(file_obj)
            else:
                return Response(
                    {
                        'error': 'Invalid import type',
                        'message': 'Import type must be "csv" or "excel"'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Limit preview to first 100 rows
            preview_rows = rows[:100]
            
            # Validate preview data
            valid_rows, error_rows = ImportService.validate_import_data(
                preview_rows,
                request.user.company_id
            )
            
            # Build preview array
            preview = []
            error_map = {err['row']: err for err in error_rows}
            
            for idx, row in enumerate(preview_rows, start=1):
                if idx in error_map:
                    error_info = error_map[idx]
                    preview.append({
                        'row': idx,
                        'phone': row.get('phone', ''),
                        'name': row.get('name', ''),
                        'valid': False,
                        'error': error_info['error']
                    })
                else:
                    preview.append({
                        'row': idx,
                        'phone': row.get('phone', ''),
                        'name': row.get('name', ''),
                        'valid': True
                    })
            
            return Response({
                'preview': preview,
                'total_rows': len(preview_rows),
                'valid_count': len(valid_rows),
                'error_count': len(error_rows)
            })
            
        except Exception as e:
            return Response(
                {
                    'error': 'File processing error',
                    'message': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='import/template')
    def import_template(self, request):
        """
        Download CSV template for customer import
        
        Endpoint: GET /api/customers/import/template/
        
        Response:
            CSV file download with headers: phone,name
        
        Validates:
            - REQ-001: CSV template support
        """
        # Create CSV content
        csv_content = "phone,name\n"
        
        # Create HTTP response with CSV content
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="customer_import_template.csv"'
        
        return response
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete customers by IDs."""
        customer_ids = request.data.get('customer_ids', [])
        if not customer_ids:
            return Response({'error': 'No customer IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(id__in=customer_ids)
        deleted_count, _ = qs.delete()
        return Response({'success': True, 'deleted': deleted_count})

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Bulk import customers using bulk_create for performance"""
        customers_data = request.data.get('customers', [])

        if not customers_data:
            return Response(
                {'error': 'No customer data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction as db_transaction

        to_create = []
        errors = []
        duplicate_phones = set(
            Customer.objects.filter(
                phone__in=[str(c.get('phone', '')) for c in customers_data]
            ).values_list('phone', flat=True)
        )

        for i, customer_data in enumerate(customers_data):
            phone = str(customer_data.get('phone', '')).strip()
            if not phone:
                errors.append(f"Row {i+1}: Phone number is required")
                continue
            if phone in duplicate_phones:
                errors.append(f"Row {i+1}: Phone {phone} already exists")
                continue
            to_create.append(Customer(
                name=customer_data.get('name'),
                phone=phone,
                call_status=customer_data.get('call_status', 'pending'),
                custom_call_status=customer_data.get('custom_call_status'),
                assigned_to_id=customer_data.get('assigned_to'),
                scheduled_date=customer_data.get('scheduled_date'),
                notes=customer_data.get('notes'),
                company=request.user.company,
                created_by=request.user,
            ))

        created_count = 0
        if to_create:
            with db_transaction.atomic():
                created = Customer.objects.bulk_create(to_create, batch_size=500, ignore_conflicts=True)
                created_count = len(created)

        return Response({
            'created': created_count,
            'errors': errors,
            'duplicates': len([e for e in errors if 'already exists' in e]),
        })
    
    @action(detail=True, methods=['get'], url_path='conversion-form')
    def conversion_form(self, request, pk=None):
        """
        Get customer data for pre-filling conversion form
        
        Returns:
            - customer: Basic customer information
            - pre_filled: Data to pre-fill in the lead form
            - can_convert: Boolean indicating if conversion is allowed
            - reason: Reason if conversion is not allowed
            
        Validates: REQ-029, REQ-031
        """
        customer = self.get_object()
        
        # Check conversion eligibility
        can_convert, reason = ValidationService.validate_conversion_eligibility(customer)
        
        # Prepare pre-filled data
        pre_filled = {
            'name': customer.name or '',
            'phone': customer.phone,
            'description': customer.notes or '',
            'source': 'customer_conversion'
        }
        
        return Response({
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'phone': customer.phone,
                'notes': customer.notes
            },
            'pre_filled': pre_filled,
            'can_convert': can_convert,
            'reason': reason if not can_convert else None
        })
    
    @action(detail=True, methods=['post'], url_path='convert-to-lead')
    def convert_to_lead(self, request, pk=None):
        """
        Convert customer to lead with additional lead data
        
        Request Body:
            - email (optional): Lead email
            - address (optional): Lead address
            - requirement_type: Villa/Apartment/House/Plot
            - bhk_requirement: 1/2/3/4/5+
            - budget_min: Minimum budget
            - budget_max: Maximum budget
            - preferred_location: Preferred location
            - status: new/hot/warm/cold
            - follow_up_date (optional): Follow-up date
            
        Returns:
            - success: Boolean
            - lead: Created lead object
            - customer: Updated customer object
            
        Validates: REQ-028, REQ-030, REQ-033, REQ-034, REQ-045, REQ-074
        """
        customer = self.get_object()
        
        # Permission check: Verify user has permission to convert customers (REQ-074)
        # Employees can only convert customers assigned to them
        if request.user.role == 'employee' and customer.assigned_to != request.user:
            return Response({
                'success': False,
                'error': 'permission_denied',
                'message': 'You do not have permission to convert this customer. You can only convert customers assigned to you.'
            }, status=status.HTTP_403_FORBIDDEN)
        lead_data = request.data
        
        try:
            # Convert customer to lead using ConversionService
            lead = ConversionService.convert_single(
                customer=customer,
                lead_data=lead_data,
                user=request.user
            )
            
            # Refresh customer from database to get updated state
            customer.refresh_from_db()
            
            # Serialize the response
            lead_serializer = LeadSerializer(lead, context={'request': request})
            customer_serializer = self.get_serializer(customer)
            
            return Response({
                'success': True,
                'lead': lead_serializer.data,
                'customer': customer_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'conversion_failed',
                'message': f'Failed to convert customer to lead: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='bulk-convert')
    def bulk_convert(self, request):
        """
        Bulk convert multiple customers to leads
        
        Request Body:
            - customer_ids: Array of customer IDs to convert
            - default_values: Object with default values for all conversions
                - requirement_type
                - bhk_requirement
                - budget_min
                - budget_max
                - status
                - preferred_location (optional)
                - email (optional)
                - address (optional)
                
        Returns:
            - success: Boolean
            - summary: Conversion summary
                - total: Total customers processed
                - success_count: Successfully converted
                - skipped_count: Already converted (skipped)
                - error_count: Failed conversions
                - errors: List of error details
                
        Validates: REQ-037, REQ-038, REQ-039, REQ-040, REQ-074
        """
        customer_ids = request.data.get('customer_ids', [])
        default_values = request.data.get('default_values', {})
        
        # Validate input
        if not customer_ids:
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'customer_ids array is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(customer_ids, list):
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'customer_ids must be an array'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Permission check: Verify user has permission to convert customers (REQ-074)
        # Employees can only convert customers assigned to them
        if request.user.role == 'employee':
            # Check if all customers are assigned to the requesting user
            customers = Customer.objects.filter(id__in=customer_ids, company=request.user.company)
            unauthorized_customers = customers.exclude(assigned_to=request.user)
            
            if unauthorized_customers.exists():
                return Response({
                    'success': False,
                    'error': 'permission_denied',
                    'message': f'You do not have permission to convert all selected customers. You can only convert customers assigned to you. {unauthorized_customers.count()} customer(s) are not assigned to you.'
                }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Call ConversionService for bulk conversion
            summary = ConversionService.convert_bulk(
                customer_ids=customer_ids,
                default_values=default_values,
                user=request.user
            )
            
            return Response({
                'success': True,
                'summary': summary
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'bulk_conversion_failed',
                'message': f'Bulk conversion failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign customers to an employee (same-company only)"""
        customer_ids = request.data.get('customer_ids', [])
        employee_id = request.data.get('employee_id')
        
        if not customer_ids:
            return Response(
                {'error': 'No customer IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate employee
        if employee_id and employee_id != 'unassigned':
            # Determine company scope from the selected customers
            qs = self.get_queryset().filter(id__in=customer_ids)
            if not qs.exists():
                return Response({'error': 'No matching customers found'}, status=status.HTTP_400_BAD_REQUEST)

            customer_companies = set(qs.values_list('company_id', flat=True))

            # Enforce same-company: assignee must be employee/manager/telecaller in the customer's company
            employee = User.objects.filter(
                id=employee_id,
                role__in=['employee', 'manager', 'telecaller'],
                company_id__in=customer_companies,
            ).first()

            if not employee:
                return Response(
                    {'error': 'Employee not found or does not belong to the same company as the selected customers'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            employee = None
            qs = self.get_queryset().filter(id__in=customer_ids)
        
        # Update customers
        updated_count = qs.update(assigned_to=employee)
        
        return Response({
            'updated': updated_count,
            'assigned_to': employee.username if employee else 'unassigned'
        })
    
    @action(detail=False, methods=['get'], url_path='analytics/conversion-rate')
    def analytics_conversion_rate(self, request):
        """
        Get conversion rate analytics with optional date range filtering
        
        Endpoint: GET /api/customers/analytics/conversion-rate/
        
        Query Parameters:
            - start_date (optional): Start date in YYYY-MM-DD format
            - end_date (optional): End date in YYYY-MM-DD format
        
        Response:
            {
                "total_customers": 1000,
                "converted_customers": 450,
                "conversion_rate": 45.0,
                "period": {
                    "start": "2024-01-01",
                    "end": "2024-01-31"
                }
            }
        
        Validates:
            - REQ-053: Track conversion rate (customers → leads)
            - REQ-059: Show conversion rate percentage
        """
        from datetime import datetime
        
        # Get query parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Parse dates if provided
        start_date = None
        end_date = None
        
        try:
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str)
            if end_date_str:
                end_date = datetime.fromisoformat(end_date_str)
        except ValueError as e:
            return Response(
                {
                    'error': 'Invalid date format',
                    'message': 'Dates must be in YYYY-MM-DD format'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get conversion rate from AnalyticsService
        result = AnalyticsService.get_conversion_rate(
            company_id=request.user.company_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return Response(result)
    
    @action(detail=False, methods=['get'], url_path='analytics/conversion-by-user')
    def analytics_conversion_by_user(self, request):
        """
        Get conversion statistics grouped by user
        
        Endpoint: GET /api/customers/analytics/conversion-by-user/
        
        Response:
            {
                "users": [
                    {
                        "user_id": 1,
                        "user_name": "John Smith",
                        "total_customers": 100,
                        "converted": 45,
                        "conversion_rate": 45.0
                    },
                    ...
                ]
            }
        
        Validates:
            - REQ-055: Show conversion by user
            - REQ-060: Show top converters (users)
        """
        # Get conversion by user from AnalyticsService
        users = AnalyticsService.get_conversion_by_user(
            company_id=request.user.company_id
        )
        
        return Response({'users': users})
    
    @action(detail=False, methods=['get'], url_path='analytics/conversion-trend')
    def analytics_conversion_trend(self, request):
        """
        Get daily conversion trend over specified number of days
        
        Endpoint: GET /api/customers/analytics/conversion-trend/
        
        Query Parameters:
            - days (optional): Number of days to include in trend (default: 30)
        
        Response:
            {
                "trend": [
                    {"date": "2024-01-01", "conversions": 15},
                    {"date": "2024-01-02", "conversions": 20},
                    ...
                ]
            }
        
        Validates:
            - REQ-057: Display conversion trend over time
        """
        # Get days parameter (default to 30)
        days_str = request.query_params.get('days', '30')
        
        try:
            days = int(days_str)
            if days <= 0:
                raise ValueError("Days must be positive")
        except ValueError:
            return Response(
                {
                    'error': 'Invalid days parameter',
                    'message': 'Days must be a positive integer'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get conversion trend from AnalyticsService
        trend = AnalyticsService.get_conversion_trend(
            company_id=request.user.company_id,
            days=days
        )
        
        return Response({'trend': trend})
    
    @action(detail=False, methods=['get'], url_path='analytics/pending-conversions')
    def analytics_pending_conversions(self, request):
        """
        Get count of customers with is_converted=false (pending conversions)
        
        Endpoint: GET /api/customers/analytics/pending-conversions/
        
        Response:
            {
                "pending_conversions": 45,
                "total_customers": 100,
                "converted_customers": 55
            }
        
        Validates:
            - REQ-058: Show "Pending Conversions" count
        """
        # Get pending conversions count from AnalyticsService
        result = AnalyticsService.get_pending_conversions_count(
            company_id=request.user.company_id
        )
        
        return Response(result)


class CallAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = CallAllocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination
    
    def check_permissions(self, request):
        """Block HR users from accessing call allocations"""
        super().check_permissions(request)
        if request.user.role == 'hr':
            raise PermissionDenied("Access denied. HR users do not have permission to access this module.")
    
    def get_queryset(self):
        user = self.request.user
        base_queryset = CallAllocation.objects.select_related('employee', 'created_by')
        # Note: CallAllocation doesn't have company field, so no company select_related needed
        
        # Use the centralized permission filter
        queryset = filter_by_user_access(
            base_queryset,
            user,
            assigned_to_field='employee',  # CallAllocation uses 'employee' instead of 'assigned_to'
            created_by_field='created_by'
        )
        
        return queryset