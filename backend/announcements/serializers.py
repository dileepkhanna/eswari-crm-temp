from rest_framework import serializers
from .models import Announcement
from django.contrib.auth import get_user_model
from accounts.models import Company

User = get_user_model()

class CompanyNestedSerializer(serializers.Serializer):
    """Lightweight nested serializer for company information"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    assigned_employee_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='employee'),
        source='assigned_employees',
        required=False,
        allow_null=True
    )
    assigned_employee_details = serializers.SerializerMethodField()
    
    # Legacy single company support
    company_detail = CompanyNestedSerializer(source='company', read_only=True)
    
    # New multiple companies support
    company_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Company.objects.all(),  # Default queryset, will be filtered in __init__
        source='companies',
        required=False,
        allow_null=True,
        write_only=True,
        allow_empty=True
    )
    companies_detail = CompanyNestedSerializer(source='companies', many=True, read_only=True)
    
    document_url_field = serializers.URLField(source='document_url', required=False, allow_blank=True, write_only=True)
    document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'message', 'priority', 'target_roles', 
            'assigned_employee_ids', 'assigned_employee_details',
            'document', 'document_name', 'document_url', 'document_url_field',
            'is_active', 'expires_at', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 
            # Legacy single company fields
            'company', 'company_detail',
            # New multiple companies fields
            'company_ids', 'companies_detail'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'created_by_name', 'assigned_employee_details', 'document_url']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set queryset for company_ids based on user role
        if hasattr(self, 'context') and 'request' in self.context:
            user = self.context['request'].user
            if user.role in ['admin', 'hr']:
                # Admin and HR can select any company
                self.fields['company_ids'].queryset = Company.objects.all()
            elif user.company:
                # Non-admin/HR users can only select their own company
                self.fields['company_ids'].queryset = Company.objects.filter(id=user.company.id)
            else:
                # No company access
                self.fields['company_ids'].queryset = Company.objects.none()
        else:
            # Default to all companies if no context
            self.fields['company_ids'].queryset = Company.objects.all()
    
    def get_created_by_name(self, obj):
        """Get the display name of the user who created the announcement"""
        if obj.created_by:
            if obj.created_by.first_name or obj.created_by.last_name:
                return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return obj.created_by.username
        return "Unknown"
    
    def get_assigned_employee_details(self, obj):
        """Get details of assigned employees"""
        employees = obj.assigned_employees.all()
        return [
            {
                'id': emp.id,
                'username': emp.username,
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'email': emp.email
            }
            for emp in employees
        ]
    
    def get_document_url(self, obj):
        """Get the full URL for the document"""
        if obj.document_url:
            # Return the external URL directly
            return obj.document_url
        elif obj.document:
            # Return the full URL for uploaded files
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.document.url)
                except (KeyError, AttributeError):
                    # Fallback if request doesn't have proper META data
                    return obj.document.url
            return obj.document.url
        return None
    
    def create(self, validated_data):
        # Extract assigned_employees and companies before creating
        assigned_employees = validated_data.pop('assigned_employees', [])
        companies = validated_data.pop('companies', [])
        
        # Set created_by from the request user
        user = self.context['request'].user
        validated_data['created_by'] = user
        
        # Handle company assignment based on user role and input
        if companies:
            # Multiple companies selected - this is the new way
            if user.role not in ['admin', 'hr']:
                # Non-admin/HR users can only create announcements for their own company
                user_company_ids = [user.company.id] if user.company else []
                selected_company_ids = [c.id for c in companies]
                
                if not all(cid in user_company_ids for cid in selected_company_ids):
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({
                        'company_ids': 'You can only create announcements for your own company.'
                    })
            
            # Admin and HR users can create announcements for any companies
            # Set legacy company field to first company for document upload path
            # This ensures document upload works correctly
            validated_data['company'] = companies[0]
            
        elif 'company' in validated_data and validated_data['company']:
            # Legacy single company mode
            companies = [validated_data['company']]
            
        else:
            # No companies specified - handle based on user role
            if user.role in ['admin', 'hr']:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'company_ids': 'Admin and HR users must specify at least one company for the announcement.'
                })
            elif user.company:
                # For non-admin/HR users, automatically use their company
                companies = [user.company]
                validated_data['company'] = user.company  # Keep legacy field for backward compatibility
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'company_ids': 'User must have a company assigned or specify companies for the announcement.'
                })
        
        # Create the announcement
        announcement = super().create(validated_data)
        
        # Set companies (new way)
        if companies:
            announcement.companies.set(companies)
        
        # Set assigned employees
        if assigned_employees:
            announcement.assigned_employees.set(assigned_employees)
        
        return announcement
    
    def update(self, instance, validated_data):
        # Extract assigned_employees and companies if present
        assigned_employees = validated_data.pop('assigned_employees', None)
        companies = validated_data.pop('companies', None)
        
        # If companies are being updated and there are documents, ensure legacy company is set
        if companies is not None and len(companies) > 0:
            # Set legacy company to first company for document upload path consistency
            validated_data['company'] = companies[0]
        
        # Update the announcement
        announcement = super().update(instance, validated_data)
        
        # Update companies if provided
        if companies is not None:
            announcement.companies.set(companies)
        
        # Update assigned employees if provided
        if assigned_employees is not None:
            announcement.assigned_employees.set(assigned_employees)
        
        return announcement