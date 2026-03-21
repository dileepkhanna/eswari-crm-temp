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