#!/usr/bin/env python
"""Check current time and debug follow-up notifications"""
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

# Get current time
now_utc = timezone.now()
ist = pytz.timezone('Asia/Kolkata')
now_ist = now_utc.astimezone(ist)

print("=" * 60)
print("CURRENT TIME CHECK")
print("=" * 60)
print(f"Current UTC: {now_utc.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Current IST: {now_ist.strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Check for follow-ups in the time window
start_time = now_utc + timedelta(minutes=13)
end_time = now_utc + timedelta(minutes=16)

print("=" * 60)
print("CHECKING FOLLOW-UPS IN 13-16 MINUTE WINDOW")
print("=" * 60)
print(f"Window Start (UTC): {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window End (UTC):   {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window Start (IST): {start_time.astimezone(ist).strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Window End (IST):   {end_time.astimezone(ist).strftime('%Y-%m-%d %H:%M:%S')}")
print()

customers_in_window = ASECustomer.objects.filter(
    scheduled_date__gte=start_time,
    scheduled_date__lte=end_time,
    is_disabled=False,
    call_status='pending'
)

print(f"Found {customers_in_window.count()} customers with follow-ups in this window")
for customer in customers_in_window:
    sched_ist = customer.scheduled_date.astimezone(ist)
    print(f"  - {customer.name or customer.phone}: {sched_ist.strftime('%Y-%m-%d %H:%M:%S')} IST")
print()

# Check for follow-ups scheduled today
print("=" * 60)
print("ALL PENDING FOLLOW-UPS SCHEDULED TODAY")
print("=" * 60)
today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
today_end = now_ist.replace(hour=23, minute=59, second=59, microsecond=999999)

all_today = ASECustomer.objects.filter(
    scheduled_date__gte=today_start,
    scheduled_date__lte=today_end,
    is_disabled=False,
    call_status='pending'
).order_by('scheduled_date')

print(f"Found {all_today.count()} pending follow-ups scheduled for today")
for customer in all_today:
    sched_ist = customer.scheduled_date.astimezone(ist)
    time_diff = customer.scheduled_date - now_utc
    minutes_away = int(time_diff.total_seconds() / 60)
    print(f"  - ID {customer.id}: {customer.name or customer.phone}")
    print(f"    Scheduled: {sched_ist.strftime('%Y-%m-%d %I:%M %p')} IST")
    print(f"    Time until follow-up: {minutes_away} minutes")
    print()
