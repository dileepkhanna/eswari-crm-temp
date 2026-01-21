from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer, CallAllocation


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