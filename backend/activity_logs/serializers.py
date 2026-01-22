from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = '__all__'
        read_only_fields = ['created_at', 'user', 'user_name', 'user_role']  # Make these read-only since they're set by the view
    
    def create(self, validated_data):
        # Automatically set user_name and user_role from the request user
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            validated_data['user_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
            validated_data['user_role'] = user.role
        return super().create(validated_data)