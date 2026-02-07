from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from .models import Announcement, AnnouncementRead
from .serializers import AnnouncementSerializer

class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter announcements based on user role and assigned employees
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all announcements
            return Announcement.objects.all()
        elif user.role == 'manager':
            # Managers can see:
            # 1. Announcements they created
            # 2. Announcements targeted to managers role
            # 3. Announcements where they are assigned
            return Announcement.objects.filter(
                models.Q(created_by=user) |
                models.Q(target_roles__icontains=f'"{user.role}"') |
                models.Q(target_roles='[]') |
                models.Q(assigned_employees=user),
                is_active=True
            ).distinct()
        else:
            # Employees can see:
            # 1. Announcements targeted to their role (and no specific employees assigned)
            # 2. Announcements where they are specifically assigned
            return Announcement.objects.filter(
                models.Q(
                    models.Q(target_roles__icontains=f'"{user.role}"') | models.Q(target_roles='[]'),
                    assigned_employees__isnull=True
                ) |
                models.Q(assigned_employees=user),
                is_active=True
            ).distinct()
    
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
        
        # Filter announcements based on role, assigned employees, and exclude read ones
        if user.role == 'admin':
            queryset = Announcement.objects.exclude(id__in=read_announcement_ids)
        elif user.role == 'manager':
            queryset = Announcement.objects.filter(
                models.Q(created_by=user) |
                models.Q(target_roles__icontains=f'"{user.role}"') |
                models.Q(target_roles='[]') |
                models.Q(assigned_employees=user),
                is_active=True
            ).exclude(id__in=read_announcement_ids).distinct()
        else:
            queryset = Announcement.objects.filter(
                models.Q(
                    models.Q(target_roles__icontains=f'"{user.role}"') | models.Q(target_roles='[]'),
                    assigned_employees__isnull=True
                ) |
                models.Q(assigned_employees=user),
                is_active=True
            ).exclude(id__in=read_announcement_ids).distinct()
        
        # Also filter by expiry date
        queryset = queryset.filter(
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