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
        - Manager: Can only see tasks from their assigned employees + their own tasks
        - Employee: Can only see tasks assigned to them
        """
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all tasks
            return Task.objects.all()
        elif user.role == 'manager':
            # Manager can only see tasks from their assigned employees + their own tasks
            # Get all employees assigned to this manager
            assigned_employees = user.employees.all()  # Using the related_name from User model
            employee_ids = [emp.id for emp in assigned_employees]
            employee_ids.append(user.id)  # Include manager's own tasks
            
            return Task.objects.filter(
                models.Q(assigned_to__id__in=employee_ids) | 
                models.Q(created_by__id__in=employee_ids)
            )
        elif user.role == 'employee':
            # Employee can only see tasks assigned to them
            return Task.objects.filter(assigned_to=user)
        else:
            # Default: no access
            return Task.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)