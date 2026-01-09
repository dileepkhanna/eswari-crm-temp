from rest_framework import serializers
from .models import Leave
from accounts.serializers import UserSerializer

class LeaveSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    approved_by_detail = UserSerializer(source='approved_by', read_only=True)
    duration_days = serializers.ReadOnlyField()
    
    class Meta:
        model = Leave
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'user_name', 'user_role', 'user']
    
    def create(self, validated_data):
        # Auto-populate user_name and user_role from the user
        user = validated_data['user']
        validated_data['user_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
        validated_data['user_role'] = user.role
        return super().create(validated_data)