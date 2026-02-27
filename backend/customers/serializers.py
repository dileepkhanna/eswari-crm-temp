from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer, CallAllocation
from accounts.permissions import should_hide_contact_details


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'call_status', 'custom_call_status',
            'assigned_to', 'assigned_to_name', 'created_by', 'created_by_name',
            'scheduled_date', 'call_date', 'notes', 'is_converted',
            'converted_lead_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'assigned_to_name', 'created_by_name']
    
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