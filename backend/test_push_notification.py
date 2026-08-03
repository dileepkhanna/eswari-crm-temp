#!/usr/bin/env python
"""Test push notification with new admin format"""
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
from notifications.models import Notification, PushSubscription
from notifications.utils import send_push_notification
from accounts.models import User
import pytz

# Get admin user
admin = User.objects.get(username='admin_admin_01')

# Check if admin has push subscription
push_subscriptions = PushSubscription.objects.filter(user=admin, is_active=True)
print("=" * 70)
print("PUSH SUBSCRIPTION STATUS")
print("=" * 70)
print(f"User: {admin.username}")
print(f"Active push subscriptions: {push_subscriptions.count()}")

if push_subscriptions.exists():
    for i, sub in enumerate(push_subscriptions, 1):
        print(f"\n{i}. Endpoint: {sub.endpoint[:50]}...")
        print(f"   Created: {sub.created_at}")
        print(f"   Active: {sub.is_active}")
else:
    print("\n⚠️  No push subscriptions found!")
    print("   User needs to allow notifications in the browser first.")
print()

# Get a sample customer
customer = ASECustomer.objects.filter(id=1108).first()

if not customer:
    print("Customer not found!")
    sys.exit(1)

# Create push notification with detailed admin format
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

print("=" * 70)
print("SENDING TEST PUSH NOTIFICATION")
print("=" * 70)
print(f"Title: Follow-up Reminder")
print(f"Message: {admin_message}")
print()

# Delete old test notifications first
old_notifications = Notification.objects.filter(
    user=admin,
    notification_type='customer_updated',
    data__type='follow_up_reminder'
)
deleted_count = old_notifications.count()
old_notifications.delete()
print(f"✓ Deleted {deleted_count} old test notifications")

# Send push notification (creates DB notification + sends browser push)
result = send_push_notification(
    user=admin,
    title='Follow-up Reminder',
    message=admin_message,
    notification_type='customer_updated',
    data=notification_data,
    company=customer.company
)

if result:
    print("✓ Push notification sent successfully!")
    print()
    print("What should happen:")
    print("1. In-app notification created in database ✓")
    print("2. Browser push notification sent (if subscribed)")
    print("3. Desktop notification should appear on your screen")
    print()
    print("Check:")
    print("- Bell icon in app (should show the notification)")
    print("- Desktop notification popup (if browser allows)")
else:
    print("✗ Failed to send push notification")
    print("Check the Django logs for error details")
