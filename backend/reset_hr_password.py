import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User

username = 'test_hr_01'
new_password = 'hrtest123'

try:
    user = User.objects.get(username=username)
    user.set_password(new_password)
    user.save()
    
    print(f"\n{'='*50}")
    print(f"Password Reset Successful!")
    print(f"{'='*50}")
    print(f"\nUser ID: {user.username}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"New Password: {new_password}")
    print(f"\n{'='*50}")
    print(f"\nLogin Instructions:")
    print(f"1. Go to http://localhost:3000")
    print(f"2. Use 'Staff / Manager' login tab")
    print(f"3. Username: {user.username}")
    print(f"4. Password: {new_password}")
    print(f"{'='*50}\n")
    
except User.DoesNotExist:
    print(f"\n{'='*50}")
    print(f"Error: User '{username}' not found!")
    print(f"{'='*50}\n")
    print("Available HR users:")
    hr_users = User.objects.filter(role='hr')
    if hr_users.exists():
        for user in hr_users:
            print(f"  - {user.username} ({user.email})")
    else:
        print("  No HR users found in the database.")
    print()
