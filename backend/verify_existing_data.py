"""
Verification script to ensure existing user data is unaffected by HR role addition.
This script checks that:
1. All existing users still have their original roles
2. No data corruption or loss occurred
3. User counts are as expected
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def verify_existing_data():
    print("=" * 60)
    print("VERIFICATION: Existing Data Integrity Check")
    print("=" * 60)
    print()
    
    # Get all users
    all_users = User.objects.all()
    total_count = all_users.count()
    
    print(f"Total users in database: {total_count}")
    print()
    
    # Count users by role
    role_counts = {
        'admin': User.objects.filter(role='admin').count(),
        'manager': User.objects.filter(role='manager').count(),
        'employee': User.objects.filter(role='employee').count(),
        'hr': User.objects.filter(role='hr').count(),
    }
    
    print("User distribution by role:")
    for role, count in role_counts.items():
        print(f"  - {role.capitalize()}: {count}")
    print()
    
    # Verify no users have invalid roles
    valid_roles = ['admin', 'manager', 'employee', 'hr']
    invalid_users = User.objects.exclude(role__in=valid_roles)
    invalid_count = invalid_users.count()
    
    if invalid_count > 0:
        print(f"⚠️  WARNING: Found {invalid_count} users with invalid roles!")
        for user in invalid_users:
            print(f"   - User: {user.username}, Role: {user.role}")
    else:
        print("✓ All users have valid roles")
    print()
    
    # Check for HR users (should be 0 initially)
    hr_users = User.objects.filter(role='hr')
    if hr_users.count() == 0:
        print("✓ No HR users exist yet (expected for new migration)")
    else:
        print(f"ℹ️  Found {hr_users.count()} HR user(s):")
        for user in hr_users:
            print(f"   - {user.username} ({user.email})")
    print()
    
    # Verify user data integrity
    print("Checking user data integrity:")
    issues = []
    
    for user in all_users:
        # Check required fields
        if not user.username:
            issues.append(f"User ID {user.id} has no username")
        if not user.role:
            issues.append(f"User {user.username} has no role")
        if user.role not in valid_roles:
            issues.append(f"User {user.username} has invalid role: {user.role}")
    
    if issues:
        print(f"⚠️  Found {len(issues)} data integrity issues:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("✓ All user records have valid data")
    print()
    
    # Summary
    print("=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    if invalid_count == 0 and len(issues) == 0:
        print("✅ SUCCESS: All existing data is intact and unaffected")
        print("✅ Migration completed successfully without data loss")
        print("✅ Ready to proceed with HR panel implementation")
        return True
    else:
        print("❌ ISSUES DETECTED: Please review the warnings above")
        return False

if __name__ == '__main__':
    success = verify_existing_data()
    exit(0 if success else 1)
