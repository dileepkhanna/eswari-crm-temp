from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Company
from utils.validators import CompanyValidationMixin, ManagerValidationMixin

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    employees_count = serializers.SerializerMethodField()
    employees_names = serializers.SerializerMethodField()
    company_info = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'manager', 'manager_name', 'employees_count', 'employees_names', 'company', 'company_info', 'created_at']
        read_only_fields = ['id', 'created_at', 'manager_name', 'employees_count', 'employees_names', 'company_info']
    
    def get_manager_name(self, obj):
        """Get the manager's full name"""
        if obj.manager:
            return f"{obj.manager.first_name} {obj.manager.last_name}".strip() or obj.manager.username
        return None
    
    def get_employees_count(self, obj):
        """Get count of employees under this manager"""
        if obj.role == 'manager':
            return obj.employees.count()
        return 0
    
    def get_employees_names(self, obj):
        """Get list of employee names under this manager"""
        if obj.role == 'manager':
            employees = obj.employees.all()
            return [f"{emp.first_name} {emp.last_name}".strip() or emp.username for emp in employees]
        return []
    
    def get_company_info(self, obj):
        """Get company information with logo URL"""
        if obj.company:
            request = self.context.get('request')
            logo_url = None
            if obj.company.logo:
                if request:
                    logo_url = request.build_absolute_uri(obj.company.logo.url)
                else:
                    logo_url = obj.company.logo.url
            
            return {
                'id': obj.company.id,
                'name': obj.company.name,
                'code': obj.company.code,
                'logo_url': logo_url
            }
        return None
    
    def validate(self, attrs):
        """Validate manager assignment is from same company"""
        manager = attrs.get('manager')
        company = attrs.get('company') or (self.instance.company if self.instance else None)
        
        # Validate manager is from same company
        if manager and company:
            if manager.company_id != company.id:
                raise serializers.ValidationError({
                    'manager': 'Manager must be from the same company'
                })
        
        return attrs

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='manager'), 
        required=False, 
        allow_null=True,
        help_text="Assign a manager (only for employees)"
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        help_text="Company assignment (optional for admin and HR roles)"
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone', 'role', 'manager', 'company']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate manager assignment
        role = attrs.get('role')
        manager = attrs.get('manager')
        company = attrs.get('company')
        
        # Company is required for manager and employee roles
        if role in ['manager', 'employee'] and not company:
            raise serializers.ValidationError({
                'company': 'Company assignment is required for manager and employee roles'
            })
        
        # Admin and HR roles can work without company assignment (global access)
        if role in ['admin', 'hr'] and company:
            # Optional: Allow admin/HR to be assigned to a company if desired
            pass
        
        if role == 'employee' and not manager:
            # Manager is required for employees
            raise serializers.ValidationError("Manager must be assigned for employees")
        elif role in ['admin', 'manager'] and manager:
            # Admins and managers shouldn't have managers
            raise serializers.ValidationError("Admins and managers cannot have managers assigned")
        
        # Validate manager is from same company (only if both have companies)
        if manager and company and manager.company:
            if manager.company_id != company.id:
                raise serializers.ValidationError({
                    'manager': 'Manager must be from the same company'
                })
        
        # Validate company exists and is active (if provided)
        if company and not company.is_active:
            raise serializers.ValidationError({
                'company': 'Company is not active'
            })
        
        # Handle empty email
        email = attrs.get('email', '').strip()
        if not email:
            attrs['email'] = None
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # Don't pop username - let the model auto-generate it
        user = User.objects.create_user(**validated_data)
        return user


class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model with all fields including logo URL.
    """
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'code', 'logo', 'logo_url', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_logo_url(self, obj):
        """Get the full URL for the company logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def validate_code(self, value):
        """Ensure company code is uppercase and alphanumeric"""
        if not value:
            raise serializers.ValidationError("Company code is required")
        
        # Convert to uppercase and replace spaces with underscores
        cleaned_code = value.upper().replace(' ', '_')
        
        # Validate alphanumeric (allow underscores)
        if not all(c.isalnum() or c == '_' for c in cleaned_code):
            raise serializers.ValidationError(
                "Company code must contain only letters, numbers, and underscores"
            )
        
        return cleaned_code


class CompanyListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for company lists (id, name, code, logo, is_active).
    """
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'code', 'logo_url', 'is_active', 'created_at']
    
    def get_logo_url(self, obj):
        """Get the full URL for the company logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
