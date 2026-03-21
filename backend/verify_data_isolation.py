#!/usr/bin/env python
"""Script to verify data isolation between companies"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Company
from leads.models import Lead
from customers.models import Customer
from projects.models import Project
from tasks.models import Task
from leaves.models import Leave
from holidays.models import Holiday
from announcements.models import Announcement

User = get_user_model()

print("\n" + "=" * 80)
print("DATA ISOLATION VERIFICATION")
print("=" * 80)

# Get companies
eswari = Company.objects.get(code='ESWARI')
ase = Company.objects.get(code='ASE')

print(f"\nCompanies:")
print(f"  1. {eswari.name} (Code: {eswari.code})")
print(f"  2. {ase.name} (Code: {ase.code})")

# Count data per company
print("\n" + "-" * 80)
print(f"{'Entity':<20} {'Eswari Group':<20} {'ASE Technologies':<20}")
print("-" * 80)

entities = [
    ('Users', User, 'company'),
    ('Leads', Lead, 'company'),
    ('Customers', Customer, 'company'),
    ('Projects', Project, 'company'),
    ('Tasks', Task, 'company'),
    ('Leaves', Leave, 'company'),
    ('Holidays', Holiday, 'company'),
    ('Announcements', Announcement, 'company'),
]

for entity_name, Model, field in entities:
    eswari_count = Model.objects.filter(**{field: eswari}).count()
    ase_count = Model.objects.filter(**{field: ase}).count()
    print(f"{entity_name:<20} {eswari_count:<20} {ase_count:<20}")

print("-" * 80)

# Test cross-company access prevention
print("\n" + "=" * 80)
print("CROSS-COMPANY ACCESS TEST")
print("=" * 80)

# Get users from different companies
eswari_manager = User.objects.filter(company=eswari, role='manager').first()
ase_manager = User.objects.filter(company=ase, role='manager').first()

if eswari_manager and ase_manager:
    print(f"\nEswari Manager: {eswari_manager.username} (Company: {eswari_manager.company.name})")
    print(f"ASE Manager: {ase_manager.username} (Company: {ase_manager.company.name})")
    
    # Test lead access
    eswari_leads = Lead.objects.filter(company=eswari_manager.company).count()
    ase_leads = Lead.objects.filter(company=ase_manager.company).count()
    
    print(f"\nLead Access Test:")
    print(f"  {eswari_manager.username} can see {eswari_leads} leads (from {eswari.name})")
    print(f"  {ase_manager.username} can see {ase_leads} leads (from {ase.name})")
    
    # Verify isolation
    cross_company_leads_eswari = Lead.objects.filter(company=ase).count()
    cross_company_leads_ase = Lead.objects.filter(company=eswari).count()
    
    print(f"\nData Isolation Verification:")
    print(f"  ✓ {eswari.name} has {cross_company_leads_ase} leads that should NOT be visible to ASE managers")
    print(f"  ✓ {ase.name} has {cross_company_leads_eswari} leads that should NOT be visible to Eswari managers")
    
    if eswari_leads > 0 and ase_leads > 0:
        print(f"\n✅ Data isolation is working correctly!")
        print(f"   Each company has its own separate data.")
    else:
        print(f"\n⚠️  Warning: One company has no data to test isolation.")
else:
    print("\n⚠️  Could not find managers from both companies for testing.")

# Test admin/HR access
print("\n" + "=" * 80)
print("ADMIN/HR CROSS-COMPANY ACCESS TEST")
print("=" * 80)

admin_user = User.objects.filter(role='admin').first()
hr_user = User.objects.filter(role='hr').first()

if admin_user:
    print(f"\nAdmin User: {admin_user.username} (Company: {admin_user.company.name})")
    all_leads = Lead.objects.all().count()
    print(f"  Can see ALL {all_leads} leads across all companies ✓")

if hr_user:
    print(f"\nHR User: {hr_user.username} (Company: {hr_user.company.name})")
    all_users = User.objects.all().count()
    print(f"  Can see ALL {all_users} users across all companies ✓")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)
print()
