#!/usr/bin/env python
"""Test notification API response"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from notifications.models import Notification
from accounts.models import User
import pytz

# Get the admin user
admin = User.objects.get(username='admin_admin_01')

# Get all unread notifications for this user
notifications = Notification.objects.filter(
    user=admin,
    is_read=False
).order_by('-created_at')[:10]

print("=" * 60)
print(f"UNREAD NOTIFICATIONS FOR: {admin.username}")
print("=" * 60)
print(f"Total unread: {notifications.count()}\n")

ist = pytz.timezone('Asia/Kolkata')

for i, notif in enumerate(notifications, 1):
    created_ist = notif.created_at.astimezone(ist)
    print(f"{i}. [{notif.notification_type}] {notif.title}")
    print(f"   Message: {notif.message}")
    print(f"   Created: {created_ist.strftime('%Y-%m-%d %I:%M:%S %p')} IST")
    print(f"   Data: {notif.data}")
    print()
