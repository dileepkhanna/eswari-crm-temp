"""
Management command to send follow-up notifications
Run this command every minute via cron or task scheduler:
python manage.py send_followup_notifications
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from ase_customers.models import ASECustomer
from notifications.models import Notification
from notifications.utils import send_push_notification
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check for upcoming follow-ups and send notifications 15 minutes before'

    def handle(self, *args, **options):
        now = timezone.now()
        # Check for follow-ups that are approaching (8-20 minutes ahead)
        # This wider window ensures we don't miss notifications even if the task runs irregularly
        # Ideally, notifications should be sent at 15 minutes before, but this catches:
        # - Early notifications: 15-20 minutes (if task runs early)
        # - Target notifications: 13-17 minutes (ideal window)
        # - Late notifications: 8-13 minutes (if task missed previous runs)
        start_time = now + timedelta(minutes=8)
        end_time = now + timedelta(minutes=20)
        
        # Find customers with scheduled follow-ups in the next 8-20 minutes
        customers = ASECustomer.objects.filter(
            scheduled_date__gte=start_time,
            scheduled_date__lte=end_time,
            is_disabled=False,
            call_status='pending'
        ).select_related('created_by', 'assigned_to', 'company')
        
        notifications_sent = 0
        
        for customer in customers:
            # Check if notification already sent for this follow-up
            # Use data field to store customer_id for deduplication
            existing_notification = Notification.objects.filter(
                notification_type='customer_updated',
                data__customer_id=customer.id,
                data__type='follow_up_reminder',
                created_at__gte=now - timedelta(hours=1)  # Don't send duplicate within 1 hour
            ).exists()
            
            if existing_notification:
                continue
            
            # Create notification message
            scheduled_time = customer.scheduled_date.astimezone(timezone.get_current_timezone())
            minutes_away = int((customer.scheduled_date - now).total_seconds() / 60)
            
            # Basic message for user (creator/assigned)
            user_message = f"Follow-up reminder: {customer.name or customer.phone} in {minutes_away} minutes ({scheduled_time.strftime('%I:%M %p')})"
            
            # Detailed message for admins
            assigned_user_name = customer.assigned_to.get_full_name() if customer.assigned_to else (customer.created_by.get_full_name() if customer.created_by else "Unassigned")
            admin_message = f"Follow-up: {customer.name or customer.phone} ({customer.phone}) - Assigned to: {assigned_user_name} - Time: {scheduled_time.strftime('%I:%M %p')} (in {minutes_away} min)"
            
            notification_data = {
                'customer_id': customer.id,
                'customer_name': customer.name or customer.phone,
                'customer_phone': customer.phone,
                'scheduled_time': customer.scheduled_date.isoformat(),
                'assigned_to': assigned_user_name,
                'type': 'follow_up_reminder'
            }
            
            # Send notification to the creator
            if customer.created_by:
                send_push_notification(
                    user=customer.created_by,
                    title='Follow-up Reminder',
                    message=user_message,
                    notification_type='customer_updated',
                    data=notification_data,
                    company=customer.company
                )
                notifications_sent += 1
                logger.info(f"Sent follow-up notification to {customer.created_by.username} for customer {customer.id}")
            
            # Send notification to assigned user if different from creator
            if customer.assigned_to and customer.assigned_to != customer.created_by:
                send_push_notification(
                    user=customer.assigned_to,
                    title='Follow-up Reminder',
                    message=user_message,
                    notification_type='customer_updated',
                    data=notification_data,
                    company=customer.company
                )
                notifications_sent += 1
                logger.info(f"Sent follow-up notification to {customer.assigned_to.username} for customer {customer.id}")
            
            # Send notification to all admins in the same company
            from accounts.models import User
            admins = User.objects.filter(role='admin', company=customer.company, is_active=True)
            for admin in admins:
                if admin != customer.created_by and admin != customer.assigned_to:
                    send_push_notification(
                        user=admin,
                        title='Follow-up Reminder',
                        message=admin_message,  # Use detailed message for admins
                        notification_type='customer_updated',
                        data=notification_data,
                        company=customer.company
                    )
                    notifications_sent += 1
                    logger.info(f"Sent follow-up notification to admin {admin.username} for customer {customer.id}")
        
        if notifications_sent > 0:
            self.stdout.write(self.style.SUCCESS(f'Successfully sent {notifications_sent} follow-up notifications'))
        else:
            self.stdout.write(self.style.SUCCESS('No follow-up notifications to send'))
