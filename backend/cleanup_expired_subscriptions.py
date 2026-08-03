#!/usr/bin/env python
"""Clean up expired push subscriptions"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from notifications.models import PushSubscription

# Delete all inactive subscriptions
inactive = PushSubscription.objects.filter(is_active=False)
count = inactive.count()
inactive.delete()

print(f"✓ Deleted {count} expired push subscriptions")

# Show remaining active subscriptions
active = PushSubscription.objects.filter(is_active=True)
print(f"✓ Remaining active subscriptions: {active.count()}")
