from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Holiday
from .serializers import HolidaySerializer

class HolidayPermission(permissions.BasePermission):
    """
    Custom permission for holidays:
    - Admin and Manager: Can create, read, update, delete
    - Employee: Can only read
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # All authenticated users can view holidays
        if view.action in ['list', 'retrieve']:
            return True
        
        # Only admin and manager can create, update, delete
        return request.user.role in ['admin', 'manager']
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # All authenticated users can view holidays
        if view.action in ['retrieve']:
            return True
        
        # Only admin and manager can update/delete
        if view.action in ['update', 'partial_update', 'destroy']:
            return request.user.role in ['admin', 'manager']
        
        return False

class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [HolidayPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['holiday_type', 'is_recurring']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['start_date']

    def get_queryset(self):
        """Filter holidays based on query parameters"""
        queryset = Holiday.objects.all()
        
        # Filter by year if provided
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(start_date__year=year)
        
        # Filter by month if provided
        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(start_date__month=month)
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new holiday"""
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'Only administrators and managers can create holidays'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update a holiday"""
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'Only administrators and managers can update holidays'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a holiday"""
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'Only administrators and managers can delete holidays'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)