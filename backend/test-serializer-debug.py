#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from announcements.serializers import AnnouncementSerializer
from accounts.models import Company
from django.test import RequestFactory

User = get_user_model()

# Get HR user
hr_user = User.objects.filter(role='hr').first()
print(f"HR User: {hr_user.username} (Role: {hr_user.role})")
print(f"HR User Company: {hr_user.company.name if hr_user.company else 'None'}")

# Get companies
companies = Company.objects.filter(is_active=True)
print(f"\nActive Companies:")
for company in companies:
    print(f"  - {company.name} (ID: {company.id})")

# Create a mock request
factory = RequestFactory()
request = factory.post('/')
request.user = hr_user

# Test serializer
data = {
    'title': 'Test Announcement',
    'message': 'Testing serializer directly',
    'priority': 'medium',
    'target_roles': ['employee'],
    'company_ids': [2, 3],  # Both companies
    'is_active': True
}

print(f"\nTesting serializer with data: {data}")

serializer = AnnouncementSerializer(data=data, context={'request': request})

print(f"Is serializer valid: {serializer.is_valid()}")

if not serializer.is_valid():
    print(f"Serializer errors: {serializer.errors}")
else:
    print("Serializer is valid - attempting to save...")
    try:
        announcement = serializer.save()
        print(f"SUCCESS: Announcement created with ID {announcement.id}")
        print(f"Companies: {[c.name for c in announcement.companies.all()]}")
    except Exception as e:
        print(f"ERROR during save: {e}")