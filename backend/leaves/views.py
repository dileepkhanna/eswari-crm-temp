from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Leave
from .serializers import LeaveSerializer
from accounts.permissions import CompanyAccessPermission
from utils.mixins import CompanyFilterMixin
from notifications.utils import send_push_notification, send_bulk_push_notification
from django.contrib.auth import get_user_model

User = get_user_model()

class LeaveViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'leave_type', 'user']
    search_fields = ['user_name', 'reason']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    
    def _send_leave_request_notifications(self, leave):
        """Send notifications to admin, HR, and manager when a leave is requested"""
        try:
            recipients = []
            
            # Get all admins
            admins = User.objects.filter(role='admin', is_active=True)
            recipients.extend(list(admins))
            
            # Get all HR users (optionally filter by company)
            if leave.company:
                hr_users = User.objects.filter(role='hr', company=leave.company, is_active=True)
            else:
                hr_users = User.objects.filter(role='hr', is_active=True)
            recipients.extend(list(hr_users))
            
            # Get the employee's manager
            if leave.user.manager:
                recipients.append(leave.user.manager)
            
            # Remove duplicates
            recipients = list(set(recipients))
            
            if recipients:
                user_name = f"{leave.user.first_name} {leave.user.last_name}".strip() or leave.user.username
                title = f"New Leave Request from {user_name}"
                message = f"{leave.leave_type} leave from {leave.start_date} to {leave.end_date}"
                
                send_bulk_push_notification(
                    users=recipients,
                    title=title,
                    message=message,
                    notification_type='leave_request',
                    data={'leave_id': str(leave.id)},
                    company=leave.company
                )
        except Exception as e:
            # Log error but don't fail the leave creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending leave request notifications: {e}")
    
    def _send_leave_status_notification(self, leave, status_action):
        """Send notification to employee when their leave is approved/rejected"""
        try:
            approver_name = f"{leave.approved_by.first_name} {leave.approved_by.last_name}".strip() or leave.approved_by.username
            
            if status_action == 'approved':
                title = "Leave Request Approved"
                message = f"Your {leave.leave_type} leave request has been approved by {approver_name}"
            else:
                title = "Leave Request Rejected"
                message = f"Your {leave.leave_type} leave request has been rejected by {approver_name}"
                if leave.rejection_reason:
                    message += f". Reason: {leave.rejection_reason}"
            
            send_push_notification(
                user=leave.user,
                title=title,
                message=message,
                notification_type='leave_status',
                data={'leave_id': str(leave.id), 'status': status_action},
                company=leave.company
            )
        except Exception as e:
            # Log error but don't fail the status update
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending leave status notification: {e}")

    def get_queryset(self):
        """Filter leaves based on user role and manager-employee hierarchy"""
        user = self.request.user
        
        # Optimize queries with select_related for company and user
        base_queryset = Leave.objects.select_related('company', 'user', 'approved_by')
        
        if user.role in ['admin', 'hr']:
            # Admins and HR can see all leaves
            return base_queryset
        elif user.role == 'manager':
            # Managers can only see leaves from their assigned employees + their own leaves
            # Get all employees assigned to this manager
            assigned_employees = user.employees.all()  # Using the related_name from User model
            employee_ids = [emp.id for emp in assigned_employees]
            employee_ids.append(user.id)  # Include manager's own leaves
            
            return base_queryset.filter(user__id__in=employee_ids)
        else:
            # Employees can only see their own leaves
            return base_queryset.filter(user=user)

    def perform_create(self, serializer):
        """Set the user when creating a leave and send notifications"""
        leave = serializer.save(user=self.request.user)
        
        # Send notifications to admin, HR, and the employee's manager
        self._send_leave_request_notifications(leave)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve a leave request"""
        leave = self.get_object()
        
        # Only admins, HR, and managers can approve leaves
        if request.user.role not in ['admin', 'hr', 'manager']:
            return Response(
                {'error': 'You do not have permission to approve leaves'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Managers can only approve leaves from their assigned employees
        if request.user.role == 'manager':
            assigned_employees = request.user.employees.all()
            employee_ids = [emp.id for emp in assigned_employees]
            
            if leave.user.id not in employee_ids:
                return Response(
                    {'error': 'You can only approve leaves from your assigned employees'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        leave.status = 'approved'
        leave.approved_by = request.user
        leave.save()
        
        # Send notification to the employee
        self._send_leave_status_notification(leave, 'approved')
        
        serializer = self.get_serializer(leave)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject a leave request"""
        leave = self.get_object()
        
        # Only admins, HR, and managers can reject leaves
        if request.user.role not in ['admin', 'hr', 'manager']:
            return Response(
                {'error': 'You do not have permission to reject leaves'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Managers can only reject leaves from their assigned employees
        if request.user.role == 'manager':
            assigned_employees = request.user.employees.all()
            employee_ids = [emp.id for emp in assigned_employees]
            
            if leave.user.id not in employee_ids:
                return Response(
                    {'error': 'You can only reject leaves from your assigned employees'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        rejection_reason = request.data.get('rejection_reason', '')
        
        leave.status = 'rejected'
        leave.approved_by = request.user
        leave.rejection_reason = rejection_reason
        leave.save()
        
        # Send notification to the employee
        self._send_leave_status_notification(leave, 'rejected')
        
        serializer = self.get_serializer(leave)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete a leave request"""
        # Admin and HR can delete any leave
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only admins and HR can delete leaves'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

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
            # Admin and HR can delete any leave
            if request.user.role in ['admin', 'hr']:
                continue
            # Manager can delete leaves from their assigned employees
            elif request.user.role == 'manager':
                assigned_employees = request.user.employees.all()
                employee_ids = [emp.id for emp in assigned_employees]
                employee_ids.append(request.user.id)  # Include manager's own leaves
                
                if leave.user.id not in employee_ids:
                    return Response(
                        {'error': f'You can only delete leaves from your assigned employees'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
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