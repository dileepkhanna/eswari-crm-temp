from rest_framework import serializers
from .models import Task
from accounts.serializers import UserSerializer
from projects.serializers import ProjectSerializer
from leads.serializers import LeadSerializer

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    project_detail = ProjectSerializer(source='project', read_only=True)
    lead_detail = LeadSerializer(source='lead', read_only=True)
    
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']