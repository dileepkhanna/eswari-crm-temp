"""
Cleanup expired push subscriptions from database
Run with: python manage.py shell < cleanup_expired_push_subscriptions.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from notifications.models import PushSubscription
from datetime import datetime, timedelta
from django.utils import timezone

print("="*60)
print("CLEANING UP EXPIRED PUSH SUBSCRIPTIONS")
print("="*60)

# Get all subscriptions
all_subs = PushSubscription.objects.all()
print(f"\nTotal push subscriptions in database: {all_subs.count()}")

# Find old subscriptions (older than 30 days without update)
thirty_days_ago = timezone.now() - timedelta(days=30)
old_subs = all_subs.filter(updated_at__lt=thirty_days_ago)
print(f"Old subscriptions (>30 days): {old_subs.count()}")

# Delete old subscriptions
if old_subs.count() > 0:
    deleted_count = old_subs.delete()[0]
    print(f"✅ Deleted {deleted_count} old subscriptions")
else:
    print("✅ No old subscriptions to delete")

print("\n" + "="*60)
print("Remaining subscriptions:", PushSubscription.objects.count())
print("="*60)
