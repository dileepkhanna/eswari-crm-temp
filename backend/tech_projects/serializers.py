from rest_framework import serializers
from .models import TechProject, TechTask
from django.contrib.auth import get_user_model

User = get_user_model()

class TaskAssigneeSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for task assignees"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class TechTaskSerializer(serializers.ModelSerializer):
    assignee_detail = TaskAssigneeSerializer(source='assignee', read_only=True)
    created_by_detail = TaskAssigneeSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = TechTask
        fields = [
            'id', 'title', 'description', 'task_type', 'priority', 'status',
            'project', 'assignee', 'assignee_detail', 'created_by', 'created_by_detail',
            'story_points', 'due_date', 'tags', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class TechProjectSerializer(serializers.ModelSerializer):
    tasks = TechTaskSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='team.name', read_only=True)
    created_by_detail = TaskAssigneeSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = TechProject
        fields = [
            'id', 'name', 'description', 'status', 'team', 'team_name',
            'start_date', 'end_date', 'progress', 'created_by', 'created_by_detail',
            'tasks', 'task_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_task_count(self, obj):
        return obj.tasks.count()

class TechProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project lists"""
    task_count = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = TechProject
        fields = [
            'id', 'name', 'description', 'status', 'team', 'team_name',
            'start_date', 'end_date', 'progress', 'task_count', 'created_at'
        ]
    
    def get_task_count(self, obj):
        return obj.tasks.count()
