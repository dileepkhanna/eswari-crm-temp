#!/usr/bin/env python
"""
Verification script to check if employee data isolation is working correctly.
Run this AFTER fix_employee_assignments to verify the fix.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_customers.models import ASECustomer
from ase_leads.models import ASELead
from accounts.models import User
from django.db.models import Q

print("="*70)
print("EMPLOYEE DATA ISOLATION VERIFICATION")
print("="*70)

# Test specific employee: dileep
print("\n🔍 Testing employee: dileep")
try:
    dileep = User.objects.get(username='dileep', role='employee')
    print(f"✓ Found employee: {dileep.first_name} {dileep.last_name} (ID: {dileep.id})")
    
    # Check ASE Calls
    print("\n--- ASE CALLS ---")
    calls_created = ASECustomer.objects.filter(created_by=dileep)
    calls_assigned = ASECustomer.objects.filter(assigned_to=dileep)
    calls_visible = ASECustomer.objects.filter(
        Q(created_by=dileep) | Q(assigned_to=dileep)
    ).distinct()
    
    print(f"Calls created by dileep: {calls_created.count()}")
    print(f"Calls assigned to dileep: {calls_assigned.count()}")
    print(f"Calls visible to dileep: {calls_visible.count()}")
    
    # Check for mismatches
    wrong_assignments = calls_created.exclude(assigned_to=dileep)
    if wrong_assignments.exists():
        print(f"\n⚠️  WARNING: {wrong_assignments.count()} calls created by dileep but NOT assigned to them!")
        for call in wrong_assignments[:5]:
            assignee = call.assigned_to.username if call.assigned_to else "None"
            print(f"   - Call #{call.id}: {call.name or call.phone} -> assigned to {assignee}")
    else:
        print("✓ All calls created by dileep are correctly assigned to them")
    
    # Check ASE Leads
    print("\n--- ASE LEADS ---")
    leads_created = ASELead.objects.filter(created_by=dileep)
    leads_assigned = ASELead.objects.filter(assigned_to=dileep)
    leads_visible = ASELead.objects.filter(
        Q(created_by=dileep) | Q(assigned_to=dileep)
    ).distinct()
    
    print(f"Leads created by dileep: {leads_created.count()}")
    print(f"Leads assigned to dileep: {leads_assigned.count()}")
    print(f"Leads visible to dileep: {leads_visible.count()}")
    
    # Check for mismatches
    wrong_lead_assignments = leads_created.exclude(assigned_to=dileep)
    if wrong_lead_assignments.exists():
        print(f"\n⚠️  WARNING: {wrong_lead_assignments.count()} leads created by dileep but NOT assigned to them!")
        for lead in wrong_lead_assignments[:5]:
            assignee = lead.assigned_to.username if lead.assigned_to else "None"
            print(f"   - Lead #{lead.id}: {lead.contact_person} -> assigned to {assignee}")
    else:
        print("✓ All leads created by dileep are correctly assigned to them")
    
except User.DoesNotExist:
    print("❌ Employee 'dileep' not found in database")

# Check all employees
print("\n" + "="*70)
print("CHECKING ALL EMPLOYEES")
print("="*70)

employees = User.objects.filter(role='employee')
total_issues = 0

for emp in employees:
    # Check calls
    calls_wrong = ASECustomer.objects.filter(created_by=emp).exclude(assigned_to=emp)
    leads_wrong = ASELead.objects.filter(created_by=emp).exclude(assigned_to=emp)
    
    if calls_wrong.exists() or leads_wrong.exists():
        total_issues += calls_wrong.count() + leads_wrong.count()
        print(f"\n⚠️  {emp.username}:")
        if calls_wrong.exists():
            print(f"   - {calls_wrong.count()} calls with wrong assignment")
        if leads_wrong.exists():
            print(f"   - {leads_wrong.count()} leads with wrong assignment")

if total_issues == 0:
    print("\n✅ SUCCESS! All employee data is correctly assigned!")
else:
    print(f"\n❌ FOUND {total_issues} ISSUES! Run fix_employee_assignments command to fix.")

print("\n" + "="*70)
