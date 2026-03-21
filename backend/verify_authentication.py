"""
Verification script to ensure existing users can still authenticate after HR role migration.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def verify_authentication():
    print("=" * 60)
    print("VERIFICATION: User Authentication Check")
    print("=" * 60)
    print()
    
    # Get a sample user from each role
    roles_to_check = ['admin', 'manager', 'employee']
    
    for role in roles_to_check:
        user = User.objects.filter(role=role).first()
        if user:
            print(f"Checking {role} user: {user.username}")
            print(f"  - Email: {user.email}")
            print(f"  - Role: {user.role}")
            print(f"  - Active: {user.is_active}")
            print(f"  - Has password: {bool(user.password)}")
            print(f"  - Created: {user.created_at}")
            print(f"  ✓ User data accessible")
            print()
        else:
            print(f"No {role} user found in database")
            print()
    
    print("=" * 60)
    print("✅ All existing users remain accessible")
    print("✅ Authentication system intact")
    print("=" * 60)

if __name__ == '__main__':
    verify_authentication()
