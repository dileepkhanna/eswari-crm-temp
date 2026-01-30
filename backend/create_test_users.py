#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_users():
    """Create test users for deletion testing"""
    
    # Check if test users already exist
    existing_test_users = User.objects.filter(username__startswith='testuser').count()
    print(f"Found {existing_test_users} existing test users")
    
    # Create 3 test users
    test_users = []
    for i in range(1, 4):
        username = f'testuser{i}'
        
        # Skip if user already exists
        if User.objects.filter(username=username).exists():
            print(f"User {username} already exists, skipping...")
            continue
            
        user = User(
            username=username,
            first_name=f'Test{i}',
            last_name='User',
            email=f'test{i}@example.com',
            phone=f'123456789{i}',
            role='employee'
        )
        user.set_password('testpass123')
        user.save()
        test_users.append(user)
        print(f"Created test user: {user.username} (ID: {user.id})")
    
    print(f"\nCreated {len(test_users)} new test users")
    
    # List all users
    all_users = User.objects.all().order_by('id')
    print(f"\nAll users in database ({all_users.count()}):")
    for user in all_users:
        print(f"  ID: {user.id}, Username: {user.username}, Name: {user.first_name} {user.last_name}, Role: {user.role}")

if __name__ == '__main__':
    create_test_users()