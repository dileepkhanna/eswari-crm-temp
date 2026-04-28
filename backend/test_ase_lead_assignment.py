#!/usr/bin/env python
"""
Test script to check ASE Lead assignments for employees
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_leads.models import ASELead
from accounts.models import User

print("="*70)
print("ASE LEAD ASSIGNMENT TEST")
print("="*70)

# Get dileep employee
try:
    dileep = User.objects.get(username='dileep_employee_14')
    print(f"\n✓ Found employee: {dileep.first_name} {dileep.last_name}")
    print(f"  ID: {dileep.id}")
    print(f"  Role: {dileep.role}")
    
    # Check leads
    print("\n--- ASE LEADS ---")
    leads_created = ASELead.objects.filter(created_by=dileep)
    leads_assigned = ASELead.objects.filter(assigned_to=dileep)
    
    print(f"Leads created by dileep: {leads_created.count()}")
    print(f"Leads assigned to dileep: {leads_assigned.count()}")
    
    # Check for mismatches
    wrong_assignments = leads_created.exclude(assigned_to=dileep)
    if wrong_assignments.exists():
        print(f"\n⚠️  WARNING: {wrong_assignments.count()} leads created by dileep but NOT assigned to them!")
        for lead in wrong_assignments[:10]:
            assignee = lead.assigned_to.username if lead.assigned_to else "None"
            print(f"   - Lead #{lead.id}: {lead.contact_person} -> assigned to {assignee}")
    else:
        print("✓ All leads created by dileep are correctly assigned to them")
    
    # Check all employees
    print("\n" + "="*70)
    print("CHECKING ALL EMPLOYEES")
    print("="*70)
    
    employees = User.objects.filter(role='employee')
    total_issues = 0
    
    for emp in employees[:20]:  # Check first 20 employees
        leads_wrong = ASELead.objects.filter(created_by=emp).exclude(assigned_to=emp)
        
        if leads_wrong.exists():
            total_issues += leads_wrong.count()
            print(f"\n⚠️  {emp.username}:")
            print(f"   - {leads_wrong.count()} leads with wrong assignment")
            for lead in leads_wrong[:3]:
                assignee = lead.assigned_to.username if lead.assigned_to else "None"
                print(f"     Lead #{lead.id}: {lead.contact_person} -> assigned to {assignee}")
    
    if total_issues == 0:
        print("\n✅ SUCCESS! All employee leads are correctly assigned!")
    else:
        print(f"\n❌ FOUND {total_issues} ISSUES!")
    
except User.DoesNotExist:
    print("❌ Employee 'dileep_employee_14' not found")

print("\n" + "="*70)
