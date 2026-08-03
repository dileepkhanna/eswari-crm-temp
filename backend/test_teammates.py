#!/usr/bin/env python
"""Test teammates endpoint for Eswari Group admin (Admin User, ID 4)"""
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

# Test the teammates endpoint with company parameter (like frontend does)
response = client.get(f'/api/ase/customers/teammates/?company={eswari_admin.company.id}')
print(f"\n📊 API Response Status: {response.status_code}")

if response.status_code == 200:
    data = json.loads(response.content)
    print(f"📊 Total users returned: {len(data)}")
    print(f"\n👥 Users returned by API:")
    
    # Get company info for each user
    from accounts.models import User as UserModel
    user_ids = [u['id'] for u in data]
    users_with_company = UserModel.objects.filter(id__in=user_ids).select_related('company')
    
    for u in data:
        db_user = users_with_company.get(id=u['id'])
        company_name = db_user.company.name if db_user.company else 'No Company'
        print(f"   {u['id']:3d}: {u['first_name']} {u['last_name']:20s} - Company: {company_name}")
    
    # Check if any ASE Tech users are in the list
    ase_users = []
    for u in data:
        db_user = users_with_company.get(id=u['id'])
        if db_user.company and 'ASE' in db_user.company.name:
            ase_users.append(u)
    
    if ase_users:
        print(f"\n❌ ERROR: Found {len(ase_users)} ASE Technologies users in Eswari Group admin's list!")
        for u in ase_users:
            print(f"   - {u['first_name']} {u['last_name']}")
    else:
        print(f"\n✅ CORRECT: No ASE Technologies users found")
    
    # Check if Eswari Group users are in the list
    eswari_users = []
    for u in data:
        db_user = users_with_company.get(id=u['id'])
        if db_user.company and 'Eswari Group' in db_user.company.name:
            eswari_users.append(u)
    
    print(f"\n✅ Eswari Group users found: {len(eswari_users)}")
    for u in eswari_users:
        print(f"   - {u['first_name']} {u['last_name']}")
else:
    print(f"❌ Error: {response.content}")
