from rest_framework import serializers
from .models import Project
from accounts.serializers import UserSerializer
import json

class ProjectSerializer(serializers.ModelSerializer):
    manager_detail = UserSerializer(source='manager', read_only=True)
    team_members_detail = UserSerializer(source='team_members', many=True, read_only=True)
    cover_image = serializers.CharField(required=False, allow_blank=True)
    blueprint_image = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert model instance to API response"""
        data = super().to_representation(instance)
        return data
    
    def create(self, validated_data):
        """Create a new project instance"""
        project = super().create(validated_data)
        return project
    
    def update(self, instance, validated_data):
        """Update existing project instance"""
        instance = super().update(instance, validated_data)
        return instance