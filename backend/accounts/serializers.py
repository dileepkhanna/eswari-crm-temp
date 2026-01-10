from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    employees_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'manager', 'manager_name', 'employees_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'manager_name', 'employees_count']
    
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

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone', 'role', 'manager']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate manager assignment
        role = attrs.get('role')
        manager = attrs.get('manager')
        
        if role == 'employee' and not manager:
            # Manager is required for employees
            raise serializers.ValidationError("Manager must be assigned for employees")
        elif role in ['admin', 'manager'] and manager:
            # Admins and managers shouldn't have managers
            raise serializers.ValidationError("Admins and managers cannot have managers assigned")
        
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