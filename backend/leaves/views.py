from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Leave
from .serializers import LeaveSerializer

class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'leave_type', 'user']
    search_fields = ['user_name', 'reason']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter leaves based on user role"""
        user = self.request.user
        
        if user.role == 'admin':
            # Admins can see all leaves
            return Leave.objects.all()
        elif user.role == 'manager':
            # Managers can see leaves from employees AND their own leaves
            return Leave.objects.filter(
                models.Q(user__role='employee') | models.Q(user=user)
            )
        else:
            # Employees can only see their own leaves
            return Leave.objects.filter(user=user)

    def perform_create(self, serializer):
        """Set the user when creating a leave"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve a leave request"""
        leave = self.get_object()
        
        # Only admins and managers can approve leaves
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'You do not have permission to approve leaves'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        leave.status = 'approved'
        leave.approved_by = request.user
        leave.save()
        
        serializer = self.get_serializer(leave)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject a leave request"""
        leave = self.get_object()
        
        # Only admins and managers can reject leaves
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'You do not have permission to reject leaves'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        rejection_reason = request.data.get('rejection_reason', '')
        
        leave.status = 'rejected'
        leave.approved_by = request.user
        leave.rejection_reason = rejection_reason
        leave.save()
        
        serializer = self.get_serializer(leave)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete leave requests"""
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {'error': 'No IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get leaves that the user can delete
        queryset = self.get_queryset()
        leaves_to_delete = queryset.filter(id__in=ids)
        
        # Check permissions for each leave
        for leave in leaves_to_delete:
            # Admin can delete any leave
            if request.user.role == 'admin':
                continue
            # Manager can delete staff leaves
            elif request.user.role == 'manager' and leave.user.role == 'employee':
                continue
            # Staff can only delete their own pending leaves
            elif (request.user.role == 'employee' and 
                  leave.user == request.user and 
                  leave.status == 'pending'):
                continue
            else:
                return Response(
                    {'error': f'You do not have permission to delete leave {leave.id}'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        deleted_count = leaves_to_delete.count()
        leaves_to_delete.delete()
        
        return Response({
            'message': f'{deleted_count} leave(s) deleted successfully',
            'deleted_count': deleted_count
        })