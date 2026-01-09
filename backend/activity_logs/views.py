from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import ActivityLog
from .serializers import ActivityLogSerializer

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing activity logs.
    Only admins can view activity logs.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'module', 'action']
    search_fields = ['user_name', 'details']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Only admins can view activity logs"""
        user = self.request.user
        
        if user.role == 'admin':
            return ActivityLog.objects.all()
        else:
            # Non-admins can only see their own activity logs
            return ActivityLog.objects.filter(user=user)