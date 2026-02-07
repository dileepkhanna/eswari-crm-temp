from rest_framework import serializers
from .models import Announcement
from django.contrib.auth import get_user_model

User = get_user_model()

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
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'message', 'priority', 'target_roles', 
            'assigned_employee_ids', 'assigned_employee_details',
            'is_active', 'expires_at', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'created_by_name', 'assigned_employee_details']
    
    def get_created_by_name(self, obj):
        """Get the full name of the user who created the announcement"""
        if obj.created_by.first_name or obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return obj.created_by.username
    
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
    
    def create(self, validated_data):
        # Extract assigned_employees before creating
        assigned_employees = validated_data.pop('assigned_employees', [])
        
        # Set created_by from the request user
        validated_data['created_by'] = self.context['request'].user
        
        # Create the announcement
        announcement = super().create(validated_data)
        
        # Set assigned employees
        if assigned_employees:
            announcement.assigned_employees.set(assigned_employees)
        
        return announcement
    
    def update(self, instance, validated_data):
        # Extract assigned_employees if present
        assigned_employees = validated_data.pop('assigned_employees', None)
        
        # Update the announcement
        announcement = super().update(instance, validated_data)
        
        # Update assigned employees if provided
        if assigned_employees is not None:
            announcement.assigned_employees.set(assigned_employees)
        
        return announcement