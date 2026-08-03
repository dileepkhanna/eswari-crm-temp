#!/usr/bin/env python
"""Test assignable users endpoint for Eswari Group admin"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.test import Client
from accounts.models import User
import json

# Test with Eswari Group admin (Admin User, user ID 4)
eswari_admin = User.objects.get(id=4)
print(f"\n🔍 Testing as: {eswari_admin.first_name} (ID: {eswari_admin.id})")
print(f"   Role: {eswari_admin.role}")
print(f"   Company: {eswari_admin.company.name if eswari_admin.company else 'None'}")
print(f"   Company ID: {eswari_admin.company.id if eswari_admin.company else 'None'}")

client = Client()
client.force_login(eswari_admin)

response = client.get('/api/leads/assignable_users/')
print(f"\n📊 API Response Status: {response.status_code}")

if response.status_code == 200:
    data = json.loads(response.content)
    print(f"📊 Total users returned: {len(data)}")
    print(f"\n👥 Users returned by API:")
    for u in data:
        company_name = u.get('company', {}).get('name', 'N/A') if isinstance(u.get('company'), dict) else 'N/A'
        print(f"   {u['id']:3d}: {u['first_name']} {u['last_name']:20s} - Company: {company_name}")
    
    # Check if any ASE Tech users are in the list
    ase_users = [u for u in data if isinstance(u.get('company'), dict) and 'ASE' in u.get('company', {}).get('name', '')]
    if ase_users:
        print(f"\n❌ ERROR: Found {len(ase_users)} ASE Technologies users in Eswari Group admin's list!")
        for u in ase_users:
            print(f"   - {u['first_name']} {u['last_name']}")
    else:
        print(f"\n✅ CORRECT: No ASE Technologies users found")
    
    # Check if Eswari Group users are in the list
    eswari_users = [u for u in data if isinstance(u.get('company'), dict) and 'Eswari Group' in u.get('company', {}).get('name', '')]
    print(f"\n✅ Eswari Group users found: {len(eswari_users)}")
    for u in eswari_users:
        print(f"   - {u['first_name']} {u['last_name']}")
else:
    print(f"❌ Error: {response.content}")
