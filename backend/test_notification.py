#!/usr/bin/env python
"""Test notification logic"""
import os
import sys
import django
from datetime import timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.utils import timezone
import pytz
from ase_customers.models import ASECustomer
from notifications.models import Notification

# Get current time
now = timezone.now()
ist = pytz.timezone('Asia/Kolkata')
now_ist = now.astimezone(ist)

print("=" * 60)
print("NOTIFICATION LOGIC TEST")
print("=" * 60)
print(f"Current UTC: {now.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Current IST: {now_ist.strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Check with the new 12-18 minute window
start_time = now + timedelta(minutes=12)
end_time = now + timedelta(minutes=18)

print("=" * 60)
print("CHECKING WITH 12-18 MINUTE WINDOW")
print("=" * 60)
print(f"Window Start (UTC): {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window End (UTC):   {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window Start (IST): {start_time.astimezone(ist).strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window End (IST):   {end_time.astimezone(ist).strftime('%Y-%m-%d %H:%M:%S')}")
print()

customers = ASECustomer.objects.filter(
    scheduled_date__gte=start_time,
    scheduled_date__lte=end_time,
    is_disabled=False,
    call_status='pending'
).select_related('created_by', 'assigned_to', 'company')

print(f"Found {customers.count()} customers in 12-18 minute window")
for customer in customers:
    sched_ist = customer.scheduled_date.astimezone(ist)
    time_diff = customer.scheduled_date - now
    minutes_away = int(time_diff.total_seconds() / 60)
    print(f"\nCustomer ID: {customer.id}")
    print(f"Name: {customer.name or customer.phone}")
    print(f"Scheduled (UTC): {customer.scheduled_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Scheduled (IST): {sched_ist.strftime('%Y-%m-%d %I:%M %p')}")
    print(f"Minutes away: {minutes_away}")
    print(f"Call Status: {customer.call_status}")
    print(f"Is Disabled: {customer.is_disabled}")
    print(f"Created By: {customer.created_by}")
    print(f"Assigned To: {customer.assigned_to}")
    print(f"Company: {customer.company}")
print()

# Try even wider window
print("=" * 60)
print("CHECKING WITH 5-20 MINUTE WINDOW (DEBUG)")
print("=" * 60)
start_time_wide = now + timedelta(minutes=5)
end_time_wide = now + timedelta(minutes=20)

customers_wide = ASECustomer.objects.filter(
    scheduled_date__gte=start_time_wide,
    scheduled_date__lte=end_time_wide,
    is_disabled=False,
    call_status='pending'
)

print(f"Found {customers_wide.count()} customers in 5-20 minute window")
for customer in customers_wide:
    sched_ist = customer.scheduled_date.astimezone(ist)
    time_diff = customer.scheduled_date - now
    minutes_away = int(time_diff.total_seconds() / 60)
    print(f"  - ID {customer.id}: {customer.name or customer.phone} @ {sched_ist.strftime('%I:%M %p')} ({minutes_away} min)")
