#!/usr/bin/env python
"""List all users with their companies"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User

users = User.objects.all().select_related('company').order_by('company__name', 'id')

print('\n=== ALL USERS IN DATABASE ===\n')
print(f'{"ID":<5} {"Name":<30} {"Role":<12} {"Company":<20} {"Active"}')
print('-' * 80)

for u in users:
    name = f'{u.first_name} {u.last_name}'.strip() or u.username
    company = u.company.name if u.company else 'No Company'
    active = '✓' if u.is_active else '✗'
    print(f'{u.id:<5} {name:<30} {u.role:<12} {company:<20} {active}')

print('-' * 80)
print(f'\nTotal: {users.count()} users')

# Count by company
print('\n=== USERS BY COMPANY ===')
from django.db.models import Count
from accounts.models import Company

for company in Company.objects.all():
    count = User.objects.filter(company=company, is_active=True).count()
    print(f'{company.name}: {count} active users')
