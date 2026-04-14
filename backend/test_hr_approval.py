"""
Test script to verify HR user approval workflow
Run with: python test_hr_approval.py
"""
import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def test_hr_approval_workflow():
    print("\n" + "="*60)
    print("Testing HR User Approval Workflow")
    print("="*60 + "\n")
    
    # Check for pending users
    pending_users = User.objects.filter(pending_approval=True)
    print(f"📊 Total pending users: {pending_users.count()}")
    
    if pending_users.exists():
        print("\n🔍 Pending Users Details:")
        print("-" * 60)
        for user in pending_users:
            print(f"  Username: {user.username}")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Company: {user.company.name if user.company else 'None'}")
            print(f"  Is Active: {user.is_active}")
            print(f"  Pending Approval: {user.pending_approval}")
            print(f"  Created: {user.created_at}")
            print("-" * 60)
    else:
        print("\n✅ No pending users found")
    
    # Check for HR users
    hr_users = User.objects.filter(role='hr', is_active=True)
    print(f"\n👥 Active HR users: {hr_users.count()}")
    for hr in hr_users:
        print(f"  - {hr.username} ({hr.first_name} {hr.last_name})")
    
    # Check for admin users
    admin_users = User.objects.filter(role='admin', is_active=True)
    print(f"\n👑 Active Admin users: {admin_users.count()}")
    for admin in admin_users:
        print(f"  - {admin.username} ({admin.first_name} {admin.last_name})")
    
    print("\n" + "="*60)
    print("Test Complete")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_hr_approval_workflow()
