from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from django.db.models import Q
from .models import Announcement, AnnouncementRead
from .serializers import AnnouncementSerializer
import json

class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter announcements based on user role and assigned employees
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all announcements
            return Announcement.objects.all()
        
        # Get all active announcements
        queryset = Announcement.objects.filter(is_active=True)
        
        # Filter based on role and assigned employees
        filtered_announcements = []
        for announcement in queryset:
            should_include = False
            
            # Check if user created it (for managers)
            if user.role == 'manager' and announcement.created_by == user:
                should_include = True
            
            # Check target roles
            elif not announcement.target_roles or len(announcement.target_roles) == 0:
                # Empty target_roles means for everyone
                should_include = True
            elif user.role in announcement.target_roles:
                # User's role is in target roles
                # Check if there are assigned employees
                assigned_count = announcement.assigned_employees.count()
                if assigned_count == 0:
                    # No specific employees assigned, show to all in role
                    should_include = True
                elif announcement.assigned_employees.filter(id=user.id).exists():
                    # User is specifically assigned
                    should_include = True
            
            # Check if user is specifically assigned (even if role doesn't match)
            elif announcement.assigned_employees.filter(id=user.id).exists():
                should_include = True
            
            if should_include:
                filtered_announcements.append(announcement.id)
        
        return Announcement.objects.filter(id__in=filtered_announcements)
    
    def perform_create(self, serializer):
        """Set the creator when creating an announcement"""
        user = self.request.user
        
        # Managers can only assign their own employees
        if user.role == 'manager':
            assigned_employees = self.request.data.get('assigned_employee_ids', [])
            if assigned_employees:
                # Get manager's employees
                manager_employee_ids = list(user.employees.values_list('id', flat=True))
                # Validate that all assigned employees belong to this manager
                for emp_id in assigned_employees:
                    if emp_id not in manager_employee_ids:
                        from rest_framework.exceptions import ValidationError
                        raise ValidationError('You can only assign announcements to your own employees.')
        
        serializer.save(created_by=user)
    
    def perform_destroy(self, instance):
        # Only admin or creator can delete
        if self.request.user.role != 'admin' and instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete announcements you created.')
        instance.delete()
    
    def perform_update(self, serializer):
        # Only admin or creator can update
        user = self.request.user
        if user.role != 'admin' and serializer.instance.created_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only update announcements you created.')
        
        # Managers can only assign their own employees
        if user.role == 'manager':
            assigned_employees = self.request.data.get('assigned_employee_ids', [])
            if assigned_employees:
                # Get manager's employees
                manager_employee_ids = list(user.employees.values_list('id', flat=True))
                # Validate that all assigned employees belong to this manager
                for emp_id in assigned_employees:
                    if emp_id not in manager_employee_ids:
                        from rest_framework.exceptions import ValidationError
                        raise ValidationError('You can only assign announcements to your own employees.')
        
        serializer.save()

    @action(detail=False, methods=['get'])
    def my_employees(self, request):
        """Get employees assigned to the current manager"""
        user = request.user
        
        if user.role != 'manager':
            return Response(
                {'error': 'Only managers can access this endpoint'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get employees assigned to this manager
        employees = user.employees.all()
        
        employee_data = [
            {
                'id': emp.id,
                'username': emp.username,
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'email': emp.email,
                'phone': emp.phone
            }
            for emp in employees
        ]
        
        return Response(employee_data)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread announcements for the current user"""
        user = request.user
        
        # Get announcements that the user hasn't read yet
        read_announcement_ids = AnnouncementRead.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)
        
        # Get all active announcements not yet read
        if user.role == 'admin':
            queryset = Announcement.objects.exclude(id__in=read_announcement_ids)
        else:
            queryset = Announcement.objects.filter(is_active=True).exclude(id__in=read_announcement_ids)
        
        # Filter based on role and assigned employees (same logic as get_queryset)
        filtered_announcements = []
        for announcement in queryset:
            should_include = False
            
            # Check if user created it (for managers)
            if user.role == 'manager' and announcement.created_by == user:
                should_include = True
            
            # Check target roles
            elif not announcement.target_roles or len(announcement.target_roles) == 0:
                # Empty target_roles means for everyone
                should_include = True
            elif user.role in announcement.target_roles:
                # User's role is in target roles
                # Check if there are assigned employees
                assigned_count = announcement.assigned_employees.count()
                if assigned_count == 0:
                    # No specific employees assigned, show to all in role
                    should_include = True
                elif announcement.assigned_employees.filter(id=user.id).exists():
                    # User is specifically assigned
                    should_include = True
            
            # Check if user is specifically assigned (even if role doesn't match)
            elif announcement.assigned_employees.filter(id=user.id).exists():
                should_include = True
            
            if should_include:
                filtered_announcements.append(announcement.id)
        
        # Filter by announcement IDs and expiry date
        queryset = Announcement.objects.filter(
            id__in=filtered_announcements
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an announcement as read by the current user"""
        announcement = self.get_object()
        user = request.user
        
        # Create or get the read record
        read_record, created = AnnouncementRead.objects.get_or_create(
            announcement=announcement,
            user=user
        )
        
        return Response({
            'message': 'Announcement marked as read',
            'already_read': not created
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all visible announcements as read for the current user"""
        user = request.user
        announcements = self.get_queryset()
        
        # Create read records for all announcements the user can see
        read_records = []
        for announcement in announcements:
            read_record, created = AnnouncementRead.objects.get_or_create(
                announcement=announcement,
                user=user
            )
            if created:
                read_records.append(read_record)
        
        return Response({
            'message': f'Marked {len(read_records)} announcements as read'
        })

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of an announcement"""
        announcement = self.get_object()
        
        # Only admin or creator can toggle
        if request.user.role != 'admin' and announcement.created_by != request.user:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        announcement.is_active = not announcement.is_active
        announcement.save()
        
        serializer = self.get_serializer(announcement)
        return Response(serializer.data)