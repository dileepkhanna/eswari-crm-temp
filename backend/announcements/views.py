from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Announcement, AnnouncementRead
from .serializers import AnnouncementSerializer
from accounts.permissions import CompanyAccessPermission
from utils.mixins import CompanyFilterMixin
from notifications.utils import send_bulk_push_notification
import json

User = get_user_model()

class AnnouncementViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    
    def _send_announcement_notifications(self, announcement):
        """Send push notifications to all users who should receive this announcement"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"📢 Starting notification send for announcement: {announcement.title}")
            recipients = []
            
            # Determine recipients based on target roles and companies
            target_roles = announcement.target_roles or []
            assigned_employees = announcement.assigned_employees.all()
            
            logger.info(f"   Target roles: {target_roles}")
            logger.info(f"   Assigned employees: {assigned_employees.count()}")
            
            # Get companies this announcement is for
            announcement_companies = list(announcement.companies.all())
            if announcement.company:
                announcement_companies.append(announcement.company)
            
            logger.info(f"   Companies: {[c.name for c in announcement_companies]}")
            
            # If specific employees are assigned, notify only them
            if assigned_employees.exists():
                recipients = list(assigned_employees)
                logger.info(f"   Using assigned employees: {len(recipients)} users")
            else:
                # Notify based on roles and companies
                if not target_roles:
                    # No specific roles = notify everyone in the companies
                    if announcement_companies:
                        for company in announcement_companies:
                            recipients.extend(list(company.users.all()))
                        logger.info(f"   Notifying all users in companies: {len(recipients)} users")
                    else:
                        # No companies specified = notify all users
                        recipients = list(User.objects.filter(is_active=True))
                        logger.info(f"   Notifying ALL active users: {len(recipients)} users")
                else:
                    # Notify specific roles in the companies
                    if announcement_companies:
                        for company in announcement_companies:
                            recipients.extend(list(company.users.filter(role__in=target_roles)))
                        logger.info(f"   Notifying roles {target_roles} in companies: {len(recipients)} users")
                    else:
                        # No companies specified = notify all users with these roles
                        recipients = list(User.objects.filter(role__in=target_roles, is_active=True))
                        logger.info(f"   Notifying roles {target_roles} globally: {len(recipients)} users")
            
            # Remove duplicates
            recipients = list(set(recipients))
            logger.info(f"   After deduplication: {len(recipients)} users")
            
            # Don't notify the creator
            recipients = [u for u in recipients if u.id != announcement.created_by.id]
            logger.info(f"   After removing creator: {len(recipients)} users")
            logger.info(f"   Recipients: {[u.username for u in recipients]}")
            
            if recipients:
                title = f"New Announcement: {announcement.title}"
                message = announcement.message[:100] + ('...' if len(announcement.message) > 100 else '')
                
                logger.info(f"   Sending notifications...")
                result = send_bulk_push_notification(
                    users=recipients,
                    title=title,
                    message=message,
                    notification_type='announcement',
                    data={'announcement_id': str(announcement.id)},
                    company=announcement.company
                )
                logger.info(f"   ✅ Notifications sent to {result} users")
            else:
                logger.warning(f"   ⚠️  No recipients found for announcement!")
                
        except Exception as e:
            # Log error but don't fail the announcement creation
            logger.error(f"❌ Error sending announcement notifications: {e}", exc_info=True)
    
    def get_queryset(self):
        """Filter announcements based on strict role-based access control"""
        user = self.request.user
        
        # Get company filter from query parameters (handle both DRF and Django requests)
        company_id = None
        if hasattr(self.request, 'query_params'):
            # DRF request
            company_id = self.request.query_params.get('company')
        else:
            # Regular Django request
            company_id = self.request.GET.get('company')
        
        # Optimize queries with select_related and prefetch_related for companies
        base_queryset = Announcement.objects.select_related('company', 'created_by').prefetch_related('companies')
        
        if user.role == 'admin':
            # Admin can see ALL announcements across all companies
            queryset = base_queryset.filter(is_active=True)
            
            # If company filter is specified, filter by that company (both legacy and new)
            if company_id:
                try:
                    company_id = int(company_id)
                    queryset = queryset.filter(
                        models.Q(company_id=company_id) | models.Q(companies__id=company_id)
                    ).distinct()
                except (ValueError, TypeError):
                    pass  # Ignore invalid company_id
            
            return queryset
        
        elif user.role == 'hr':
            # HR can see all announcements within their company
            # If HR user doesn't have a company, show all announcements (like admin)
            if not user.company:
                queryset = base_queryset.filter(is_active=True)
                
                # If company filter is specified, filter by that company
                if company_id:
                    try:
                        company_id = int(company_id)
                        queryset = queryset.filter(
                            models.Q(company_id=company_id) | models.Q(companies__id=company_id)
                        ).distinct()
                    except (ValueError, TypeError):
                        pass
                
                return queryset
            
            # If company filter is specified and it matches their company, use it
            if company_id:
                try:
                    if int(company_id) == user.company.id:
                        return base_queryset.filter(
                            models.Q(company_id=int(company_id)) | models.Q(companies__id=int(company_id)),
                            is_active=True
                        ).distinct()
                except (ValueError, TypeError):
                    pass
            
            # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
            return base_queryset.filter(
                models.Q(company=user.company) | 
                models.Q(companies=user.company) | 
                models.Q(company__isnull=True, companies__isnull=True),
                is_active=True
            ).distinct()
        
        elif user.role == 'manager':
            # Manager can see:
            # 1. Announcements they created
            # 2. Announcements targeted to managers
            # 3. Announcements specifically assigned to them
            
            # Base filter for manager's company
            manager_company = user.company
            
            # If company filter is specified and it matches their company, use it
            if company_id:
                try:
                    if int(company_id) == user.company.id:
                        manager_company = user.company
                    else:
                        # Manager can't see announcements from other companies
                        return Announcement.objects.none()
                except (ValueError, TypeError):
                    pass
            
            # SQLite-compatible approach: filter in Python for JSON field queries
            # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
            all_announcements = base_queryset.filter(
                models.Q(company=manager_company) | 
                models.Q(companies=manager_company) | 
                models.Q(company__isnull=True, companies__isnull=True),
                is_active=True
            ).distinct()
            valid_ids = []
            
            for announcement in all_announcements:
                # Check if user should see this announcement
                if (announcement.created_by == user or  # Created by user
                    announcement.assigned_employees.filter(id=user.id).exists() or  # Assigned to user
                    not announcement.target_roles or  # No role restrictions
                    'manager' in (announcement.target_roles or [])):  # Manager role included
                    valid_ids.append(announcement.id)
            
            return base_queryset.filter(id__in=valid_ids)
        
        elif user.role == 'employee':
            # Employee can see:
            # 1. Announcements targeted to employees in their company
            # 2. Announcements specifically assigned to them
            # 3. Only if they are assigned to a manager (manager-employee relationship)
            
            # Base filter for employee's company
            employee_company = user.company
            
            # If company filter is specified and it matches their company, use it
            if company_id:
                try:
                    if int(company_id) == user.company.id:
                        employee_company = user.company
                    else:
                        # Employee can't see announcements from other companies
                        return Announcement.objects.none()
                except (ValueError, TypeError):
                    pass
            
            # SQLite-compatible approach: filter in Python for JSON field queries
            # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
            all_announcements = base_queryset.filter(
                models.Q(company=employee_company) | 
                models.Q(companies=employee_company) | 
                models.Q(company__isnull=True, companies__isnull=True),
                is_active=True
            ).distinct()
            valid_ids = []
            
            for announcement in all_announcements:
                # Check if user should see this announcement
                should_include = False
                
                # Always include if specifically assigned to user
                if announcement.assigned_employees.filter(id=user.id).exists():
                    should_include = True
                # Include if from their manager (if they have one)
                elif user.manager and announcement.created_by == user.manager:
                    should_include = True
                # Include if no specific assignment and role matches
                elif (not announcement.assigned_employees.exists() and 
                      (not announcement.target_roles or 'employee' in (announcement.target_roles or []))):
                    should_include = True
                
                if should_include:
                    valid_ids.append(announcement.id)
            
            return base_queryset.filter(id__in=valid_ids)
            
            # If company filter is specified and it matches their company, use it
            if company_id:
                try:
                    if int(company_id) == user.company.id:
                        employee_company = user.company
                    else:
                        # Employee can't see announcements from other companies
                        return Announcement.objects.none()
                except (ValueError, TypeError):
                    pass
            
            # SQLite-compatible approach: filter in Python for JSON field queries
            # Include announcements for their company AND announcements without company (for backward compatibility)
            all_announcements = base_queryset.filter(
                models.Q(company=employee_company) | models.Q(company__isnull=True),
                is_active=True
            )
            valid_ids = []
            
            for announcement in all_announcements:
                # Check if user should see this announcement
                should_include = False
                
                # Always include if specifically assigned to user
                if announcement.assigned_employees.filter(id=user.id).exists():
                    should_include = True
                # Include if from their manager (if they have one)
                elif user.manager and announcement.created_by == user.manager:
                    should_include = True
                # Include if no specific assignment and role matches
                elif (not announcement.assigned_employees.exists() and 
                      (not announcement.target_roles or 'employee' in (announcement.target_roles or []))):
                    should_include = True
                
                if should_include:
                    valid_ids.append(announcement.id)
            
            return base_queryset.filter(id__in=valid_ids)
        
        # Default: no access
        return Announcement.objects.none()
    
    def perform_create(self, serializer):
        """Set the creator and enforce manager-employee assignment rules"""
        user = self.request.user
        
        # Only admin, HR, and manager can create announcements
        if user.role not in ['admin', 'hr', 'manager']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only admin, HR, and managers can create announcements.')
        
        # Get assigned employees from request data
        assigned_employee_ids = self.request.data.get('assigned_employee_ids', [])
        
        # Enforce manager-employee assignment rules
        if user.role == 'manager':
            if assigned_employee_ids:
                # Get manager's employees (only employees assigned to this manager)
                manager_employee_ids = list(user.employees.values_list('id', flat=True))
                
                # Validate that all assigned employees belong to this manager
                for emp_id in assigned_employee_ids:
                    if int(emp_id) not in manager_employee_ids:
                        from rest_framework.exceptions import ValidationError
                        raise ValidationError({
                            'assigned_employee_ids': f'You can only assign announcements to your own employees. Employee ID {emp_id} is not assigned to you.'
                        })
        
        # HR and admin can assign any employees within their company (no restrictions for admin)
        elif user.role == 'hr':
            if assigned_employee_ids:
                # HR can only assign employees from their company
                company_employee_ids = list(
                    User.objects.filter(company=user.company, role='employee').values_list('id', flat=True)
                )
                for emp_id in assigned_employee_ids:
                    if int(emp_id) not in company_employee_ids:
                        from rest_framework.exceptions import ValidationError
                        raise ValidationError({
                            'assigned_employee_ids': f'You can only assign employees from your company. Employee ID {emp_id} is not in your company.'
                        })
        
        # Admin has no restrictions (can assign any employee)
        
        announcement = serializer.save(created_by=user)
        
        # Send push notifications to all users who can see this announcement
        self._send_announcement_notifications(announcement)
    
    def perform_destroy(self, instance):
        # Admin and HR can delete any announcement, others can only delete their own
        if self.request.user.role in ['admin', 'hr']:
            instance.delete()
        elif instance.created_by == self.request.user:
            instance.delete()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete announcements you created.')
    
    def perform_update(self, serializer):
        # Admin and HR can update any announcement, others can only update their own
        user = self.request.user
        if user.role not in ['admin', 'hr'] and serializer.instance.created_by != user:
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
        
        # HR and admin can assign any employees (no restrictions)
        
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
        
        # Apply the same company filtering logic as get_queryset
        # Get company filter from query parameters (handle both DRF and Django requests)
        company_id = None
        if hasattr(request, 'query_params'):
            # DRF request
            company_id = request.query_params.get('company')
        else:
            # Regular Django request
            company_id = request.GET.get('company')
        
        # Get all active announcements not yet read with optimized queries
        base_queryset = Announcement.objects.select_related('company', 'created_by').prefetch_related('companies')
        
        # Apply company filtering based on user role
        if user.role == 'admin':
            # Admin can see ALL announcements across all companies
            queryset = base_queryset.exclude(id__in=read_announcement_ids)
            
            # If company filter is specified, filter by that company (both legacy and new)
            if company_id:
                try:
                    company_id = int(company_id)
                    queryset = queryset.filter(
                        models.Q(company_id=company_id) | models.Q(companies__id=company_id)
                    ).distinct()
                except (ValueError, TypeError):
                    pass  # Ignore invalid company_id
        
        elif user.role == 'hr':
            # HR can see all announcements within their company
            # If HR user doesn't have a company, show all announcements (like admin)
            if not user.company:
                queryset = base_queryset.exclude(id__in=read_announcement_ids)
                
                # If company filter is specified, filter by that company
                if company_id:
                    try:
                        company_id = int(company_id)
                        queryset = queryset.filter(
                            models.Q(company_id=company_id) | models.Q(companies__id=company_id)
                        ).distinct()
                    except (ValueError, TypeError):
                        pass
            # If company filter is specified and it matches their company, use it
            elif company_id:
                try:
                    if int(company_id) == user.company.id:
                        queryset = base_queryset.filter(
                            models.Q(company_id=int(company_id)) | models.Q(companies__id=int(company_id))
                        ).exclude(id__in=read_announcement_ids).distinct()
                    else:
                        # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
                        queryset = base_queryset.filter(
                            models.Q(company=user.company) | 
                            models.Q(companies=user.company) | 
                            models.Q(company__isnull=True, companies__isnull=True)
                        ).exclude(id__in=read_announcement_ids).distinct()
                except (ValueError, TypeError):
                    # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
                    queryset = base_queryset.filter(
                        models.Q(company=user.company) | 
                        models.Q(companies=user.company) | 
                        models.Q(company__isnull=True, companies__isnull=True)
                    ).exclude(id__in=read_announcement_ids).distinct()
            else:
                # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
                queryset = base_queryset.filter(
                    models.Q(company=user.company) | 
                    models.Q(companies=user.company) | 
                    models.Q(company__isnull=True, companies__isnull=True)
                ).exclude(id__in=read_announcement_ids).distinct()
        
        else:  # manager or employee
            # Filter by user's company only
            # Include announcements for their company (both legacy and new) AND announcements without company (for backward compatibility)
            queryset = base_queryset.filter(
                models.Q(company=user.company) | 
                models.Q(companies=user.company) | 
                models.Q(company__isnull=True, companies__isnull=True),
                is_active=True
            ).exclude(id__in=read_announcement_ids).distinct()
        
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
        final_queryset = Announcement.objects.filter(
            id__in=filtered_announcements
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        )
        
        serializer = self.get_serializer(final_queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an announcement as read by the current user"""
        # Custom permission check: user can mark as read any announcement they can see
        try:
            announcement = self.get_queryset().get(pk=pk)
        except Announcement.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Announcement not found or you do not have permission to access it.')
        
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
        
        # Admin and HR can toggle any announcement, others can only toggle their own
        if request.user.role not in ['admin', 'hr'] and announcement.created_by != request.user:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        announcement.is_active = not announcement.is_active
        announcement.save()
        
        serializer = self.get_serializer(announcement)
        return Response(serializer.data)