#!/usr/bin/env python
"""Create a test notification with the new admin format"""
import os
import sys
import django
from datetime import timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.utils import timezone
from ase_customers.models import ASECustomer
from notifications.models import Notification
from accounts.models import User
import pytz

# Get admin user
admin = User.objects.get(username='admin_admin_01')

# Delete old test notifications
old_notifications = Notification.objects.filter(
    user=admin,
    notification_type='customer_updated',
    data__type='follow_up_reminder'
)
deleted_count = old_notifications.count()
old_notifications.delete()
print(f"Deleted {deleted_count} old test notifications")

# Get a sample customer
customer = ASECustomer.objects.filter(id=1108).first()

if not customer:
    print("Customer not found!")
    sys.exit(1)

# Create notification with new admin format
now = timezone.now()
ist = pytz.timezone('Asia/Kolkata')

# Simulate a follow-up in 15 minutes from now
future_time = now + timedelta(minutes=15)
scheduled_time = future_time.astimezone(ist)
minutes_away = 15

# Create the detailed admin message
assigned_user_name = customer.assigned_to.get_full_name() if customer.assigned_to else (customer.created_by.get_full_name() if customer.created_by else "Unassigned")
admin_message = f"Follow-up: {customer.name or customer.phone} ({customer.phone}) - Assigned to: {assigned_user_name} - Time: {scheduled_time.strftime('%I:%M %p')} (in {minutes_away} min)"

notification_data = {
    'customer_id': customer.id,
    'customer_name': customer.name or customer.phone,
    'customer_phone': customer.phone,
    'scheduled_time': future_time.isoformat(),
    'assigned_to': assigned_user_name,
    'type': 'follow_up_reminder'
}

# Create notification for admin
Notification.objects.create(
    user=admin,
    title='Follow-up Reminder',
    message=admin_message,
    notification_type='customer_updated',
    data=notification_data,
    company=customer.company
)

print("=" * 70)
print("✓ TEST NOTIFICATION CREATED")
print("=" * 70)
print(f"User: {admin.username}")
print(f"Title: Follow-up Reminder")
print(f"Message: {admin_message}")
print()
print("Now refresh your admin panel to see the notification!")
