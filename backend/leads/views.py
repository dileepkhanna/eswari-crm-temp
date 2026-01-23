from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Lead
from .serializers import LeadSerializer

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to', 'requirement_type']
    search_fields = ['name', 'email', 'address', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Role-based lead filtering:
        - Admin: Can see all leads
        - Manager: Can see all leads (their own + employee leads, but with restricted contact access for employee leads)
        - Employee: Can only see leads specifically assigned to them
        """
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all leads
            return Lead.objects.all()
        elif user.role == 'manager':
            # Manager can see all leads (both their own and employee leads)
            return Lead.objects.all()
        elif user.role == 'employee':
            # Employee can only see leads specifically assigned to them
            return Lead.objects.filter(assigned_to=user)
        else:
            # Default: no access
            return Lead.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)