#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.db.models import Q
from accounts.models import Company, User
from ase_leads.models.lead import ASELead

# Get ASE company and manager
ase_company = Company.objects.get(code='ASE')
ase_manager = User.objects.filter(company=ase_company, role='manager').first()

print(f"ASE Company ID: {ase_company.id}")
print(f"Manager: {ase_manager.username} (company_id: {ase_manager.company.id})\n")

# Simulate the manager query logic from get_queryset
qs = ASELead.objects.select_related('company', 'assigned_to', 'created_by').all()
qs = qs.filter(company=ase_manager.company)

employee_ids = list(
    User.objects.filter(manager=ase_manager, company=ase_manager.company).values_list('id', flat=True)
)
employee_ids.append(ase_manager.id)

print(f"Manager + employees IDs: {employee_ids}")

qs = qs.filter(
    Q(assigned_to__id__in=employee_ids) | Q(created_by__id__in=employee_ids)
).distinct()

print(f"\nTotal leads in queryset: {qs.count()}")

# Check companies
companies_in_result = set(qs.values_list('company', flat=True))
print(f"Companies in result: {companies_in_result}")

if len(companies_in_result) > 1 or (companies_in_result and ase_company.id not in companies_in_result):
    print(f"\n❌ ERROR: Manager sees leads from wrong companies!")
    # Show breakdown
    for cid in companies_in_result:
        count = qs.filter(company=cid).count()
        company = Company.objects.get(id=cid)
        print(f"   Company {cid} ({company.name}): {count} leads")
else:
    print(f"\n✅ OK: All leads belong to ASE Technologies (company {ase_company.id})")

# Show first 5 leads
print(f"\nFirst 5 leads:")
for lead in qs[:5]:
    print(f"  - Lead {lead.id}: company={lead.company_id} ({lead.company.name}), assigned_to={lead.assigned_to_id}, created_by={lead.created_by_id}")
