from rest_framework import serializers
from .models import Project
from accounts.serializers import UserSerializer
import json

class ProjectSerializer(serializers.ModelSerializer):
    manager_detail = UserSerializer(source='manager', read_only=True)
    team_members_detail = UserSerializer(source='team_members', many=True, read_only=True)
    photos = serializers.ListField(child=serializers.URLField(), required=False, allow_empty=True)
    cover_image = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert photos from JSON string to list for API response"""
        data = super().to_representation(instance)
        data['photos'] = instance.get_photos()
        return data
    
    def create(self, validated_data):
        # Handle photos if provided
        photos_data = validated_data.pop('photos', [])
        print(f"Creating project with photos: {photos_data}")  # Debug log
        
        # Create the project instance
        project = super().create(validated_data)
        
        # Set photos as JSON string
        if photos_data:
            project.photos = json.dumps(photos_data)
            project.save()
        
        print(f"Project created with photos: {project.photos}")  # Debug log
        return project
    
    def update(self, instance, validated_data):
        # Handle photos if provided
        photos_data = validated_data.pop('photos', None)
        print(f"Updating project with photos: {photos_data}")  # Debug log
        
        # Update other fields
        instance = super().update(instance, validated_data)
        
        # Update photos if provided
        if photos_data is not None:
            instance.photos = json.dumps(photos_data) if photos_data else ""
            instance.save()
        
        print(f"Project updated with photos: {instance.photos}")  # Debug log
        return instance