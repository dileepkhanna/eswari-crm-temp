from rest_framework import serializers
from .models import Leave
from accounts.serializers import UserSerializer

class LeaveSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    approved_by_detail = UserSerializer(source='approved_by', read_only=True)
    duration_days = serializers.ReadOnlyField()
    document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Leave
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'user_name', 'user_role', 'user']
    
    def get_document_url(self, obj):
        """Return the full URL for the document file"""
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
            return obj.document.url
        return None
    
    def create(self, validated_data):
        # Auto-populate user_name and user_role from the user
        user = validated_data['user']
        validated_data['user_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
        validated_data['user_role'] = user.role
        return super().create(validated_data)