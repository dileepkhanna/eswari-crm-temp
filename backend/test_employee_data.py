#!/usr/bin/env python
"""
Test script to check employee call assignments
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_customers.models import ASECustomer
from ase_leads.models import ASELead
from accounts.models import User

print("="*60)
print("EMPLOYEE CALL ASSIGNMENT TEST")
print("="*60)

# Get all employees
employees = User.objects.filter(role='employee')
print(f"\nTotal employees: {employees.count()}")

print("\n--- ASE CALLS (Customers) ---")
for emp in employees[:10]:  # Check first 10 employees
    calls_created = ASECustomer.objects.filter(created_by=emp)
    calls_assigned_to_self = calls_created.filter(assigned_to=emp)
    calls_assigned_to_others = calls_created.exclude(assigned_to=emp)
    
    if calls_created.count() > 0:
        print(f"\n{emp.username} ({emp.first_name} {emp.last_name}):")
        print(f"  Created: {calls_created.count()} calls")
        print(f"  Assigned to self: {calls_assigned_to_self.count()}")
        print(f"  Assigned to others: {calls_assigned_to_others.count()}")
        
        if calls_assigned_to_others.count() > 0:
            print(f"  ⚠️  ISSUE: {calls_assigned_to_others.count()} calls NOT assigned to creator!")
            for call in calls_assigned_to_others[:3]:
                assignee = call.assigned_to.username if call.assigned_to else "None"
                print(f"     - Call #{call.id}: {call.name or call.phone} -> assigned to {assignee}")

print("\n--- ASE LEADS ---")
for emp in employees[:10]:  # Check first 10 employees
    leads_created = ASELead.objects.filter(created_by=emp)
    leads_assigned_to_self = leads_created.filter(assigned_to=emp)
    leads_assigned_to_others = leads_created.exclude(assigned_to=emp)
    
    if leads_created.count() > 0:
        print(f"\n{emp.username} ({emp.first_name} {emp.last_name}):")
        print(f"  Created: {leads_created.count()} leads")
        print(f"  Assigned to self: {leads_assigned_to_self.count()}")
        print(f"  Assigned to others: {leads_assigned_to_others.count()}")
        
        if leads_assigned_to_others.count() > 0:
            print(f"  ⚠️  ISSUE: {leads_assigned_to_others.count()} leads NOT assigned to creator!")
            for lead in leads_assigned_to_others[:3]:
                assignee = lead.assigned_to.username if lead.assigned_to else "None"
                print(f"     - Lead #{lead.id}: {lead.contact_person} -> assigned to {assignee}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
