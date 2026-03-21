from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer, CallAllocation
from accounts.permissions import should_hide_contact_details
from utils.validators import CompanyValidationMixin


class CompanyNestedSerializer(serializers.Serializer):
    """Lightweight nested serializer for company information"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)


class ConvertedLeadSerializer(serializers.Serializer):
    """Nested serializer for converted lead information"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    requirement_type = serializers.CharField(read_only=True)
    bhk_requirement = serializers.CharField(read_only=True)
    budget_min = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    budget_max = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    preferred_location = serializers.CharField(read_only=True)
    source = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class CustomerSerializer(CompanyValidationMixin, serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    company_detail = CompanyNestedSerializer(source='company', read_only=True)
    converted_lead = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'call_status', 'custom_call_status',
            'assigned_to', 'assigned_to_name', 'created_by', 'created_by_name',
            'scheduled_date', 'call_date', 'notes', 'is_converted',
            'converted_lead_id', 'converted_lead', 'created_at', 'updated_at', 'company', 'company_detail'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'assigned_to_name', 'created_by_name']
    
    def get_converted_lead(self, obj):
        """Include converted lead object if customer is converted"""
        # Only include converted_lead in detail view (retrieve action)
        request = self.context.get('request')
        if not request:
            return None
        
        # Check if this is a detail view (retrieve action)
        view = self.context.get('view')
        if view and view.action != 'retrieve':
            return None
        
        # If customer is converted and has a lead ID, fetch the lead
        if obj.is_converted and obj.converted_lead_id:
            try:
                from leads.models import Lead
                lead = Lead.objects.get(id=obj.converted_lead_id, company=obj.company)
                return ConvertedLeadSerializer(lead).data
            except Lead.DoesNotExist:
                return None
        return None
    
    def to_representation(self, instance):
        """Mask contact details based on user permissions"""
        data = super().to_representation(instance)
        
        # Get the requesting user from context
        request = self.context.get('request')
        if not request or not request.user:
            return data
        
        requesting_user = request.user
        
        # Determine the owner of this customer data
        # Priority: assigned_to > created_by
        owner_user = instance.assigned_to or instance.created_by
        
        if owner_user and should_hide_contact_details(requesting_user, owner_user):
            # Mask sensitive contact information
            data['phone'] = '***HIDDEN***'
            if data.get('notes'):
                data['notes'] = '***HIDDEN***'
        
        return data
    
    def create(self, validated_data):
        # Set created_by to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CallAllocationSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField()
    
    class Meta:
        model = CallAllocation
        fields = [
            'id', 'employee', 'employee_name', 'date', 'total_allocated',
            'completed', 'pending', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'employee_name']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)