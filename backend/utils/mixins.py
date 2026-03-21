"""
Mixins for company-based filtering and access control.
"""
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ObjectDoesNotExist
from accounts.models import Company


class CompanyFilterMixin:
    """
    Mixin to automatically filter querysets by company based on user role.
    
    Usage: Add to ViewSet classes that need company filtering.
    
    Role-based filtering:
    - Admin and HR: Can see all companies (optionally filtered by company parameter)
    - Manager and Employee: Can only see their own company's data
    """
    
    def get_queryset(self):
        """
        Filter queryset based on user role and company.
        
        Returns:
            QuerySet: Filtered queryset based on user's role and company
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin and HR can see all companies
        if user.role in ['admin', 'hr']:
            # Check for company filter parameter
            company_id = self.request.query_params.get('company')
            if company_id:
                queryset = queryset.filter(company_id=company_id)
            # Otherwise return all
            return queryset
        
        # Managers and Employees see only their company
        return queryset.filter(company=user.company)
    
    def perform_create(self, serializer):
        """
        Auto-assign company on creation based on user role.
        
        - Admin/HR: Must specify company explicitly in request data
        - Manager/Employee: Automatically use their assigned company
        
        Validates:
        - Company exists and is active before creating entities
        
        Args:
            serializer: The serializer instance
            
        Raises:
            ValidationError: If admin/hr user doesn't specify company
            ValidationError: If company doesn't exist or is inactive
        """
        user = self.request.user
        
        # Admin and HR must specify company explicitly
        if user.role in ['admin', 'hr']:
            # Company should be in request data
            if 'company' not in serializer.validated_data:
                raise ValidationError({
                    'company': 'This field is required for admin/hr users'
                })
            
            # Validate company exists and is active
            company = serializer.validated_data.get('company')
            if company:
                try:
                    # Refresh from database to ensure we have latest data
                    company_obj = Company.objects.get(id=company.id)
                    if not company_obj.is_active:
                        raise ValidationError({
                            'company': 'Company is not active'
                        })
                except ObjectDoesNotExist:
                    raise ValidationError({
                        'company': 'Company does not exist'
                    })
            
            # Save with the specified company
            serializer.save()
        else:
            # Managers and Employees use their own company
            # Validate their company is still active
            if not user.company.is_active:
                raise ValidationError({
                    'company': 'Your company is not active. Please contact an administrator.'
                })
            serializer.save(company=user.company)
