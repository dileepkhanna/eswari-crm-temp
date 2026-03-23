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
        """Filter activity logs based on user role and company"""
        user = self.request.user
        
        base_queryset = ActivityLog.objects.select_related('company', 'user')
        
        if user.role == 'admin':
            # Admin sees all logs, optionally filtered by company
            company_id = self.request.query_params.get('company')
            if company_id:
                return base_queryset.filter(company_id=company_id)
            return base_queryset
        elif user.role == 'manager':
            # Manager sees logs from their assigned employees + themselves, scoped to their company
            assigned_employees = user.employees.all()
            employee_ids = [emp.id for emp in assigned_employees]
            employee_ids.append(user.id)
            return base_queryset.filter(user__id__in=employee_ids, company=user.company)
        else:
            # Employees see only their own logs
            return base_queryset.filter(user=user, company=user.company)
    
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