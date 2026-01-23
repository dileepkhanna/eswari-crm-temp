from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'assigned_to']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Role-based task filtering:
        - Admin: Can see all tasks
        - Manager: Can see all tasks (their own + employee tasks, but with restricted contact access for employee tasks)
        - Employee: Can only see tasks assigned to them
        """
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all tasks
            return Task.objects.all()
        elif user.role == 'manager':
            # Manager can see all tasks (both their own and employee tasks)
            return Task.objects.all()
        elif user.role == 'employee':
            # Employee can only see tasks assigned to them
            return Task.objects.filter(assigned_to=user)
        else:
            # Default: no access
            return Task.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)