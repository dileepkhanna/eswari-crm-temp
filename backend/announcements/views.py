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
        # Filter announcements based on user role
        user = self.request.user
        if user.role == 'admin':
            # Admin can see all announcements
            return Announcement.objects.all()
        else:
            # Other users can only see announcements targeted to their role or all roles
            return Announcement.objects.filter(
                target_roles__contains=[user.role],
                is_active=True
            )
    
    def perform_create(self, serializer):
        """Set the creator when creating an announcement"""
        serializer.save(created_by=self.request.user)
    
    def perform_destroy(self, instance):
        # Only admin or creator can delete
        if self.request.user.role != 'admin' and instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete announcements you created.')
        instance.delete()
    
    def perform_update(self, serializer):
        # Only admin or creator can update
        if self.request.user.role != 'admin' and serializer.instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only update announcements you created.')
        serializer.save()

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread announcements for the current user"""
        user = request.user
        
        # Get announcements that the user hasn't read yet
        read_announcement_ids = AnnouncementRead.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)
        
        # Filter announcements based on role and exclude read ones
        if user.role == 'admin':
            queryset = Announcement.objects.exclude(id__in=read_announcement_ids)
        else:
            queryset = Announcement.objects.filter(
                target_roles__contains=[user.role],
                is_active=True
            ).exclude(id__in=read_announcement_ids)
        
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