"""
Quick check: Does employee srinu@gmail.com have any ASE leads?
Run with: python manage.py shell < check_ase_leads_for_employee.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from ase_leads.models import ASELead

print("\n" + "="*70)
print("ASE LEADS CHECK FOR EMPLOYEE")
print("="*70)

try:
    user = User.objects.get(email='srinu@gmail.com')
    print(f"\n✅ Found user: {user.email}")
    print(f"   Role: {user.role}")
    print(f"   Company: {user.company.name if user.company else 'None'}")
    print(f"   Company ID: {user.company.id if user.company else 'None'}")
except User.DoesNotExist:
    print("\n❌ User not found!")
    exit()

print(f"\n{'='*70}")
print("ASE LEADS IN DATABASE")
print("="*70)

# Total ASE leads for this company
all_company_leads = ASELead.objects.filter(company=user.company, is_disabled=False)
print(f"\n📊 Total ASE leads for {user.company.name}: {all_company_leads.count()}")

if all_company_leads.count() > 0:
    print("\nSample leads in company:")
    for lead in all_company_leads[:5]:
        assigned = lead.assigned_to.email if lead.assigned_to else 'Unassigned'
        created = lead.created_by.email if lead.created_by else 'Unknown'
        print(f"  • {lead.company_name}")
        print(f"    - Assigned to: {assigned}")
        print(f"    - Created by: {created}")
        print(f"    - Status: {lead.status}")
        print()

print(f"\n{'='*70}")
print("LEADS VISIBLE TO THIS EMPLOYEE")
print("="*70)

# Leads visible to employee (assigned to them OR created by them)
from django.db.models import Q
employee_leads = ASELead.objects.filter(
    company=user.company,
    is_disabled=False
).filter(
    Q(assigned_to=user) | Q(created_by=user)
).distinct()

count = employee_leads.count()
print(f"\n📋 ASE leads visible to {user.email}: {count}")

if count > 0:
    print("\nLeads this employee can see:")
    for lead in employee_leads:
        print(f"  • {lead.company_name}")
        print(f"    - Assigned to: {lead.assigned_to.email if lead.assigned_to else 'Unassigned'}")
        print(f"    - Created by: {lead.created_by.email if lead.created_by else 'Unknown'}")
        print(f"    - Status: {lead.status}")
        print()
else:
    print("\n⚠️  NO LEADS VISIBLE TO THIS EMPLOYEE")
    print("\n💡 To fix this, you need to:")
    print("   1. Log in as Admin")
    print("   2. Go to ASE Leads")
    print("   3. Either:")
    print(f"      - Create new ASE leads and assign them to {user.email}")
    print(f"      - Edit existing ASE leads and assign them to {user.email}")
    print("\n   OR let this employee create their own ASE leads from Calls")

print(f"\n{'='*70}")
print("SUMMARY")
print("="*70)
print(f"\n• Company leads: {all_company_leads.count()}")
print(f"• Visible to employee: {employee_leads.count()}")
print(f"• Employee can see: {(employee_leads.count() / all_company_leads.count() * 100) if all_company_leads.count() > 0 else 0:.1f}% of company leads")
print("\n" + "="*70 + "\n")
