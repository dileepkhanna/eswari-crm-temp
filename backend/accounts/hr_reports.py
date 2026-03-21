"""
HR Reports API Endpoints

This module provides API endpoints for HR-specific reports and dashboard metrics.
Only accessible by admin and HR roles.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db import DatabaseError
from leaves.models import Leave
from holidays.models import Holiday
from announcements.models import Announcement
from datetime import datetime
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    """
    Get dashboard metrics for HR panel.
    
    Returns:
        - total_employees: Count of all users
        - pending_leaves: Count of leaves with status='pending'
        - upcoming_holidays: Count of holidays with date >= today
        - active_announcements: Count of announcements with is_active=True
    
    Permissions:
        - Only admin and HR roles can access this endpoint
    """
    try:
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Permission denied. Only admin and HR roles can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        metrics = {
            'total_employees': User.objects.count(),
            'pending_leaves': Leave.objects.filter(status='pending').count(),
            'upcoming_holidays': Holiday.objects.filter(
                start_date__gte=datetime.now().date()
            ).count(),
            'active_announcements': Announcement.objects.filter(
                is_active=True
            ).count(),
        }
        return Response(metrics, status=status.HTTP_200_OK)
    
    except DatabaseError as e:
        logger.error(f"Database error in dashboard_metrics: {str(e)}")
        return Response(
            {'error': 'Database error occurred while fetching dashboard metrics. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error in dashboard_metrics: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_statistics(request):
    """
    Get employee statistics for HR reports.
    
    Returns:
        - total_employees: Count of all users
        - by_role: User count grouped by role (admin, manager, employee, hr)
        - with_manager: Count of users with a manager assigned
        - without_manager: Count of users without a manager
    
    Permissions:
        - Only admin and HR roles can access this endpoint
    """
    try:
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Permission denied. Only admin and HR roles can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        stats = {
            'total_employees': User.objects.count(),
            'by_role': list(User.objects.values('role').annotate(count=Count('id'))),
            'with_manager': User.objects.filter(manager__isnull=False).count(),
            'without_manager': User.objects.filter(manager__isnull=True).count(),
        }
        return Response(stats, status=status.HTTP_200_OK)
    
    except DatabaseError as e:
        logger.error(f"Database error in employee_statistics: {str(e)}")
        return Response(
            {'error': 'Database error occurred while fetching employee statistics. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error in employee_statistics: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_statistics(request):
    """
    Get leave statistics for HR reports.
    
    Returns:
        - total_leaves: Count of all leave requests
        - by_status: Leave count grouped by status (pending, approved, rejected)
        - by_type: Leave count grouped by leave type (sick, casual, annual, other)
        - pending_count: Count of leaves with status='pending'
    
    Permissions:
        - Only admin and HR roles can access this endpoint
    """
    try:
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Permission denied. Only admin and HR roles can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        stats = {
            'total_leaves': Leave.objects.count(),
            'by_status': list(Leave.objects.values('status').annotate(count=Count('id'))),
            'by_type': list(Leave.objects.values('leave_type').annotate(count=Count('id'))),
            'pending_count': Leave.objects.filter(status='pending').count(),
        }
        return Response(stats, status=status.HTTP_200_OK)
    
    except DatabaseError as e:
        logger.error(f"Database error in leave_statistics: {str(e)}")
        return Response(
            {'error': 'Database error occurred while fetching leave statistics. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error in leave_statistics: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
