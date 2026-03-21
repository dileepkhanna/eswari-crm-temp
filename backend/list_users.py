#!/usr/bin/env python
"""Script to list all users with their company assignments"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("\nAll Users:")
print("-" * 80)
print(f"{'ID':<5} {'Username':<20} {'Role':<15} {'Company':<25}")
print("-" * 80)

for user in User.objects.select_related('company').all():
    company_name = user.company.name if user.company else "No Company"
    print(f"{user.id:<5} {user.username:<20} {user.role:<15} {company_name:<25}")

print("-" * 80)
print(f"Total: {User.objects.count()} users")
print()
