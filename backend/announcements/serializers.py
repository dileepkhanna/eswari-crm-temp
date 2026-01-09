from rest_framework import serializers
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'message', 'priority', 'target_roles', 
            'is_active', 'expires_at', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'created_by_name']
    
    def get_created_by_name(self, obj):
        """Get the full name of the user who created the announcement"""
        if obj.created_by.first_name or obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return obj.created_by.username
    
    def create(self, validated_data):
        # Set created_by from the request user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)