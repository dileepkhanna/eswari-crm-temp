from rest_framework import serializers
from .models import Lead
from accounts.serializers import UserSerializer
from accounts.permissions import should_hide_contact_details
from utils.validators import CompanyValidationMixin

class CompanyNestedSerializer(serializers.Serializer):
    """Lightweight nested serializer for company information"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)

class LeadSerializer(CompanyValidationMixin, serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    company_detail = CompanyNestedSerializer(source='company', read_only=True)
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def validate(self, data):
        """
        Validate the entire lead data including duplicate phone check
        """
        # Check for duplicate phone number in the same company
        phone = data.get('phone')
        company = data.get('company')
        
        # For create operation
        if not self.instance and phone and company:
            if Lead.objects.filter(phone=phone, company=company).exists():
                raise serializers.ValidationError({
                    'phone': f'A lead with phone number "{phone}" already exists in this company.'
                })
        
        # For update operation
        if self.instance and phone and company:
            existing = Lead.objects.filter(phone=phone, company=company).exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError({
                    'phone': f'A lead with phone number "{phone}" already exists in this company.'
                })
        
        return data
    
    def validate_assigned_to(self, value):
        """
        Validate that the assigned_to user can be assigned based on the requesting user's role.
        - Admin: Can assign to anyone (employees, managers, or themselves)
        - Manager: Can assign to their team members or themselves
        - Employee: Can only assign to themselves (auto-assigned)
        """
        request = self.context.get('request')
        if not request or not request.user:
            return value
        
        requesting_user = request.user
        
        # If no assignment, that's fine
        if not value:
            return value
        
        # Admin can assign to anyone
        if requesting_user.role == 'admin':
            # Validate that the assigned user is an employee or manager
            if value.role not in ['employee', 'manager']:
                raise serializers.ValidationError(
                    "Leads can only be assigned to employees or managers."
                )
            return value
        
        # Manager can assign to their team members or themselves
        if requesting_user.role == 'manager':
            # Check if assigned user is in manager's team or is the manager themselves
            from accounts.models import User
            team_members = User.objects.filter(
                manager=requesting_user, 
                company=requesting_user.company
            )
            if value != requesting_user and value not in team_members:
                raise serializers.ValidationError(
                    "You can only assign leads to yourself or your team members."
                )
            return value
        
        # Employee can only assign to themselves
        if requesting_user.role == 'employee':
            if value != requesting_user:
                raise serializers.ValidationError(
                    "You can only assign leads to yourself."
                )
            return value
        
        return value
    
    def to_representation(self, instance):
        """Mask contact details based on user permissions"""
        data = super().to_representation(instance)
        
        # Get the requesting user from context
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        requesting_user = request.user
        
        # Determine the owner of this lead data
        # Priority: assigned_to > created_by
        owner_user = instance.assigned_to or instance.created_by
        
        if owner_user and should_hide_contact_details(requesting_user, owner_user):
            # Mask sensitive contact information
            data['phone'] = '***HIDDEN***'
            data['email'] = '***HIDDEN***'
            data['address'] = '***HIDDEN***'
            if data.get('description'):
                data['description'] = '***HIDDEN***'
        
        return data