from rest_framework import serializers
from .models import Project
from accounts.serializers import UserSerializer
import json

class ProjectSerializer(serializers.ModelSerializer):
    manager_detail = UserSerializer(source='manager', read_only=True)
    team_members_detail = UserSerializer(source='team_members', many=True, read_only=True)
    
    # Handle both new and legacy field names
    coverImage = serializers.CharField(required=False, allow_blank=True)
    blueprintImage = serializers.CharField(required=False, allow_blank=True)
    cover_image = serializers.CharField(required=False, allow_blank=True)
    blueprint_image = serializers.CharField(required=False, allow_blank=True)
    
    # Ensure JSON fields are properly handled
    amenities = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)
    nearbyLandmarks = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert model instance to API response"""
        data = super().to_representation(instance)
        
        # Ensure we return the frontend-expected field names
        if instance.coverImage:
            data['coverImage'] = instance.coverImage
        elif instance.cover_image:
            data['coverImage'] = instance.cover_image
            
        if instance.blueprintImage:
            data['blueprintImage'] = instance.blueprintImage
        elif instance.blueprint_image:
            data['blueprintImage'] = instance.blueprint_image
            
        # Ensure amenities and nearbyLandmarks are always lists
        if not isinstance(data.get('amenities'), list):
            data['amenities'] = []
        if not isinstance(data.get('nearbyLandmarks'), list):
            data['nearbyLandmarks'] = []
            
        return data
    
    def create(self, validated_data):
        """Create a new project instance"""
        # Handle image field mapping
        if 'coverImage' in validated_data and not validated_data.get('cover_image'):
            validated_data['cover_image'] = validated_data['coverImage']
        if 'blueprintImage' in validated_data and not validated_data.get('blueprint_image'):
            validated_data['blueprint_image'] = validated_data['blueprintImage']
            
        project = super().create(validated_data)
        return project
    
    def update(self, instance, validated_data):
        """Update existing project instance"""
        # Handle image field mapping
        if 'coverImage' in validated_data:
            validated_data['cover_image'] = validated_data['coverImage']
        if 'blueprintImage' in validated_data:
            validated_data['blueprint_image'] = validated_data['blueprintImage']
            
        instance = super().update(instance, validated_data)
        return instance