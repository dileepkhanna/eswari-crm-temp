#!/usr/bin/env python
"""Test the new admin notification format"""
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

# Get current time
now = timezone.now()
ist = pytz.timezone('Asia/Kolkata')
now_ist = now.astimezone(ist)

print("=" * 70)
print("TESTING ADMIN NOTIFICATION FORMAT")
print("=" * 70)
print(f"Current IST: {now_ist.strftime('%Y-%m-%d %I:%M:%S %p')}")
print()

# Get a sample customer with follow-up
customer = ASECustomer.objects.filter(
    scheduled_date__isnull=False,
    is_disabled=False,
    call_status='pending'
).select_related('created_by', 'assigned_to', 'company').first()

if not customer:
    print("No customers with scheduled follow-ups found!")
    sys.exit(0)

print(f"Sample Customer: {customer.name or customer.phone}")
print(f"Phone: {customer.phone}")
print(f"Created by: {customer.created_by.get_full_name() if customer.created_by else 'Unknown'}")
print(f"Assigned to: {customer.assigned_to.get_full_name() if customer.assigned_to else 'Not assigned'}")
print(f"Scheduled: {customer.scheduled_date.astimezone(ist).strftime('%I:%M %p')}")
print()

# Simulate the notification messages
scheduled_time = customer.scheduled_date.astimezone(timezone.get_current_timezone())
minutes_away = int((customer.scheduled_date - now).total_seconds() / 60)

# User message (for creator/assigned user)
user_message = f"Follow-up reminder: {customer.name or customer.phone} in {minutes_away} minutes ({scheduled_time.strftime('%I:%M %p')})"

# Admin message (detailed)
assigned_user_name = customer.assigned_to.get_full_name() if customer.assigned_to else (customer.created_by.get_full_name() if customer.created_by else "Unassigned")
admin_message = f"Follow-up: {customer.name or customer.phone} ({customer.phone}) - Assigned to: {assigned_user_name} - Time: {scheduled_time.strftime('%I:%M %p')} (in {minutes_away} min)"

print("=" * 70)
print("NOTIFICATION MESSAGES")
print("=" * 70)
print("\n📱 USER MESSAGE (for creator/assigned user):")
print(f"   {user_message}")
print("\n👔 ADMIN MESSAGE (more detailed):")
print(f"   {admin_message}")
print()

print("=" * 70)
print("COMPARISON")
print("=" * 70)
print("User sees: Customer name + time remaining + scheduled time")
print("Admin sees: Customer name + phone + assigned user + time remaining + scheduled time")
