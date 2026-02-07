import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User

print("\n=== Admin Credentials ===\n")
admins = User.objects.filter(is_superuser=True)

if admins.exists():
    for admin in admins:
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        print(f"First Name: {admin.first_name}")
        print(f"Last Name: {admin.last_name}")
        print(f"Role: {admin.role}")
        print("-" * 40)
else:
    print("No admin users found in the database.")
    print("\nTo create an admin user, run:")
    print("python manage.py createsuperuser")

print("\nNote: Passwords are hashed and cannot be displayed.")
print("If you need to reset a password, use:")
print("python manage.py changepassword <username>")
