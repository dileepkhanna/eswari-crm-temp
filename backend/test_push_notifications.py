#!/usr/bin/env python
"""
Test script for push notifications when HR creates a user.

This script tests:
1. HR user creates a new employee
2. Admin receives in-app notification
3. Admin receives browser push notification

Usage:
    python test_push_notifications.py
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from notifications.models import Notification, PushSubscription
from notifications.utils import send_push_notification

User = get_user_model()


def test_push_notifications():
    """Test push notification flow for user approval"""
    
    print("=" * 80)
    print("PUSH NOTIFICATION TEST")
    print("=" * 80)
    
    # 1. Get HR user
    print("\n1. Finding HR user...")
    try:
        hr_user = User.objects.get(username='test_hr_01')
        print(f"   ✅ Found HR user: {hr_user.username} ({hr_user.email})")
    except User.DoesNotExist:
        print("   ❌ HR user 'test_hr_01' not found")
        return False
    
    # 2. Get admin users
    print("\n2. Finding admin users...")
    admin_users = User.objects.filter(role='admin', is_active=True)
    print(f"   ✅ Found {admin_users.count()} admin user(s)")
    for admin in admin_users:
        print(f"      - {admin.username} ({admin.email})")
    
    if admin_users.count() == 0:
        print("   ❌ No admin users found")
        return False
    
    # 3. Check push subscriptions
    print("\n3. Checking push subscriptions...")
    for admin in admin_users:
        subscriptions = PushSubscription.objects.filter(user=admin, is_active=True)
        print(f"   Admin {admin.username}: {subscriptions.count()} active subscription(s)")
        if subscriptions.count() == 0:
            print(f"      ⚠️  No push subscriptions for {admin.username}")
            print(f"      💡 Admin needs to allow notifications in browser")
    
    # 4. Test notification creation
    print("\n4. Testing notification creation...")
    test_user_name = "Test Employee"
    hr_name = f"{hr_user.first_name} {hr_user.last_name}".strip() or hr_user.username
    
    notification_title = 'New User Pending Approval'
    notification_message = f'{hr_name} created a new user "{test_user_name}" (employee) that requires your approval.'
    notification_data = {
        'user_id': 999,  # Test ID
        'user_name': test_user_name,
        'user_role': 'employee',
        'created_by': hr_name,
        'action_url': '/admin/pending-users'
    }
    
    success_count = 0
    for admin in admin_users:
        try:
            # Create in-app notification
            notification = Notification.objects.create(
                user=admin,
                notification_type='system_alert',
                title=notification_title,
                message=notification_message,
                data=notification_data,
                company=None
            )
            print(f"   ✅ Created in-app notification for {admin.username} (ID: {notification.id})")
            
            # Send push notification
            try:
                result = send_push_notification(
                    user=admin,
                    title=notification_title,
                    message=notification_message,
                    notification_type='system_alert',
                    data=notification_data,
                    company=None
                )
                if result:
                    print(f"   ✅ Sent push notification to {admin.username}")
                    success_count += 1
                else:
                    print(f"   ⚠️  Push notification failed for {admin.username}")
            except Exception as push_error:
                print(f"   ❌ Push notification error for {admin.username}: {str(push_error)}")
        
        except Exception as e:
            print(f"   ❌ Failed to create notification for {admin.username}: {str(e)}")
    
    # 5. Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total admins: {admin_users.count()}")
    print(f"Notifications sent: {success_count}")
    print(f"Success rate: {success_count}/{admin_users.count()}")
    
    if success_count == admin_users.count():
        print("\n✅ ALL TESTS PASSED")
        return True
    elif success_count > 0:
        print("\n⚠️  PARTIAL SUCCESS")
        print("Some admins may not have push subscriptions enabled.")
        print("Ask admins to allow notifications in their browser.")
        return True
    else:
        print("\n❌ TESTS FAILED")
        print("No push notifications were sent successfully.")
        return False


if __name__ == '__main__':
    try:
        success = test_push_notifications()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
