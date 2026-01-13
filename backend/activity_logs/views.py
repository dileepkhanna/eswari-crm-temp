from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import ActivityLog
from .serializers import ActivityLogSerializer

class ActivityLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating activity logs.
    All authenticated users can create activity logs.
    Only admins can view all activity logs.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'module', 'action']
    search_fields = ['user_name', 'details']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    # Explicitly define allowed methods
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """Only admins can view all activity logs, others see their own"""
        user = self.request.user
        
        if user.role == 'admin':
            return ActivityLog.objects.all()
        elif user.role == 'manager':
            # Managers can see their own activities and their employees' activities
            return ActivityLog.objects.filter(
                models.Q(user=user) | 
                models.Q(user__role='employee', user__manager=user)
            )
        else:
            # Employees can only see their own activity logs
            return ActivityLog.objects.filter(user=user)
    
    def create(self, request, *args, **kwargs):
        """Override create to ensure proper user assignment and logging"""
        try:
            print(f"Creating activity log with data: {request.data}")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Ensure user is set from request
            activity_log = serializer.save(user=request.user)
            
            print(f"Activity log created successfully: {activity_log}")
            return Response(
                self.get_serializer(activity_log).data, 
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"Error creating activity log: {e}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def perform_create(self, serializer):
        """Set the user when creating an activity log"""
        print(f"perform_create called with user: {self.request.user}")
        serializer.save(user=self.request.user)
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context