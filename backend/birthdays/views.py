from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from datetime import date, datetime
from .models import Birthday, BirthdayAnnouncement
from .serializers import (
    BirthdaySerializer, 
    EmployeeSelectSerializer, 
    BirthdayAnnouncementSerializer,
    TodayBirthdaySerializer
)
from .services import BirthdayAnnouncementService

User = get_user_model()

class BirthdayViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee birthdays"""
    
    serializer_class = BirthdaySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter birthdays based on user role and company"""
        user = self.request.user
        queryset = Birthday.objects.select_related('employee', 'employee__company', 'created_by')
        
        # Admin and HR can see all birthdays
        if user.role in ['admin', 'hr']:
            return queryset
        
        # Other users can only see birthdays from their company
        if user.company:
            return queryset.filter(employee__company=user.company)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set created_by when creating a birthday record"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create a new birthday record (HR/Admin only)"""
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only HR and Admin users can add birthday records'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update a birthday record (HR/Admin only)"""
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only HR and Admin users can update birthday records'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a birthday record (HR/Admin only)"""
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only HR and Admin users can delete birthday records'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def employees_without_birthday(self, request):
        """Get list of employees who don't have birthday records yet"""
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only HR and Admin users can access this endpoint'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get employees who don't have birthday records
        employees_with_birthdays = Birthday.objects.values_list('employee_id', flat=True)
        employees_without_birthdays = User.objects.exclude(
            id__in=employees_with_birthdays
        ).filter(is_active=True).select_related('company')
        
        serializer = EmployeeSelectSerializer(employees_without_birthdays, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today_birthdays(self, request):
        """Get today's birthdays"""
        today = date.today()
        today_birthdays = self.get_queryset().filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
            announce_birthday=True
        )
        
        serializer = TodayBirthdaySerializer(today_birthdays, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming_birthdays(self, request):
        """Get upcoming birthdays (next 30 days)"""
        today = date.today()
        upcoming_birthdays = []
        
        for birthday in self.get_queryset():
            if birthday.days_until_birthday is not None and birthday.days_until_birthday <= 30:
                upcoming_birthdays.append(birthday)
        
        # Sort by days until birthday
        upcoming_birthdays.sort(key=lambda x: x.days_until_birthday)
        
        serializer = BirthdaySerializer(upcoming_birthdays, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def create_birthday_announcements(self, request):
        """Manually trigger birthday announcement creation (Admin/HR only)"""
        if request.user.role not in ['admin', 'hr']:
            return Response(
                {'error': 'Only HR and Admin users can create birthday announcements'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            service = BirthdayAnnouncementService()
            created_announcements = service.create_daily_birthday_announcements()
            
            return Response({
                'message': f'Created {len(created_announcements)} birthday announcements',
                'announcements': created_announcements
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to create birthday announcements: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )