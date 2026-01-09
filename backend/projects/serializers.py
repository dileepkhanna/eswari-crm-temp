from rest_framework import serializers
from .models import Project
from accounts.serializers import UserSerializer
import json

class ProjectSerializer(serializers.ModelSerializer):
    manager_detail = UserSerializer(source='manager', read_only=True)
    team_members_detail = UserSerializer(source='team_members', many=True, read_only=True)
    photos = serializers.SerializerMethodField()
    cover_image = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_photos(self, obj):
        """Return photos as a list"""
        return obj.get_photos()
    
    def create(self, validated_data):
        # Handle photos if provided
        photos_data = self.initial_data.get('photos', [])
        if isinstance(photos_data, list):
            validated_data['photos'] = json.dumps(photos_data)
        elif isinstance(photos_data, str):
            # If it's already a JSON string, use it as is
            validated_data['photos'] = photos_data
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Handle photos if provided
        photos_data = self.initial_data.get('photos')
        if photos_data is not None:
            if isinstance(photos_data, list):
                validated_data['photos'] = json.dumps(photos_data)
            elif isinstance(photos_data, str):
                validated_data['photos'] = photos_data
        
        return super().update(instance, validated_data)