from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Customer, CallAllocation
from .serializers import CustomerSerializer, CallAllocationSerializer

User = get_user_model()


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination
    
    def get_queryset(self):
        user = self.request.user
        print(f"DEBUG: User {user.username} (ID: {user.id}, Role: {user.role}) requesting customers")
        
        # Base queryset with optimized database queries
        base_queryset = Customer.objects.select_related('assigned_to', 'created_by')
        
        # Admin and managers can see all customers
        if user.role in ['admin', 'manager']:
            queryset = base_queryset.all()
            print(f"DEBUG: Admin/Manager - returning {queryset.count()} customers")
            return queryset
        
        # Employees can only see their assigned customers
        elif user.role == 'employee':
            queryset = base_queryset.filter(assigned_to=user)
            print(f"DEBUG: Employee - returning {queryset.count()} assigned customers")
            for customer in queryset:
                print(f"DEBUG: - {customer.name or 'Unknown'} ({customer.phone})")
            return queryset
        
        # Default: no access
        print(f"DEBUG: No access for user {user.username}")
        return Customer.objects.none()
    
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
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Bulk import customers from Excel data"""
        customers_data = request.data.get('customers', [])
        
        if not customers_data:
            return Response(
                {'error': 'No customer data provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"DEBUG: Bulk importing {len(customers_data)} customers by user {request.user.username} (Role: {request.user.role})")
        
        created_customers = []
        errors = []
        duplicates = []
        
        for i, customer_data in enumerate(customers_data):
            try:
                # Validate required fields
                if not customer_data.get('phone'):
                    errors.append(f"Row {i+1}: Phone number is required")
                    continue
                
                phone = customer_data['phone']
                
                # Check if customer with this phone already exists
                if Customer.objects.filter(phone=phone).exists():
                    existing_customer = Customer.objects.get(phone=phone)
                    duplicates.append(f"Row {i+1}: Phone {phone} already exists (Customer: {existing_customer.name or 'Unknown'})")
                    continue
                
                assigned_to_id = customer_data.get('assigned_to')
                if assigned_to_id:
                    print(f"DEBUG: Customer {phone} will be assigned to user ID {assigned_to_id}")
                
                # Create customer
                customer = Customer.objects.create(
                    name=customer_data.get('name'),
                    phone=phone,
                    call_status=customer_data.get('call_status', 'pending'),
                    custom_call_status=customer_data.get('custom_call_status'),
                    assigned_to_id=assigned_to_id,
                    scheduled_date=customer_data.get('scheduled_date'),
                    notes=customer_data.get('notes'),
                    created_by=request.user
                )
                created_customers.append(customer)
                
            except Exception as e:
                if 'UNIQUE constraint failed' in str(e) or 'duplicate key value' in str(e):
                    duplicates.append(f"Row {i+1}: Phone {customer_data.get('phone', 'Unknown')} already exists")
                else:
                    errors.append(f"Row {i+1}: {str(e)}")
        
        print(f"DEBUG: Successfully created {len(created_customers)} customers with {len(errors)} errors and {len(duplicates)} duplicates")
        
        # Serialize created customers
        serializer = self.get_serializer(created_customers, many=True)
        
        # Combine errors and duplicates for response
        all_issues = errors + duplicates
        
        return Response({
            'created': len(created_customers),
            'errors': all_issues,
            'duplicates': len(duplicates),
            'customers': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def convert_to_lead(self, request, pk=None):
        """Convert customer to lead"""
        customer = self.get_object()
        
        if customer.is_converted:
            return Response(
                {'error': 'Customer is already converted to a lead'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as converted (in real app, would create actual lead)
        customer.is_converted = True
        customer.converted_lead_id = f"lead_{customer.id}_{customer.created_at.timestamp()}"
        customer.save()
        
        serializer = self.get_serializer(customer)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign customers to an employee"""
        customer_ids = request.data.get('customer_ids', [])
        employee_id = request.data.get('employee_id')
        
        if not customer_ids:
            return Response(
                {'error': 'No customer IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate employee
        if employee_id and employee_id != 'unassigned':
            try:
                employee = User.objects.get(id=employee_id, role='employee')
            except User.DoesNotExist:
                return Response(
                    {'error': 'Employee not found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            employee = None
        
        # Update customers
        updated_count = Customer.objects.filter(
            id__in=customer_ids
        ).update(assigned_to=employee)
        
        return Response({
            'updated': updated_count,
            'assigned_to': employee.username if employee else 'unassigned'
        })


class CallAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = CallAllocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin and managers can see all allocations
        if user.role in ['admin', 'manager']:
            return CallAllocation.objects.all()
        
        # Employees can only see their own allocations
        elif user.role == 'employee':
            return CallAllocation.objects.filter(employee=user)
        
        return CallAllocation.objects.none()