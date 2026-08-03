"""
Test script to check ASE Lead access for employee user
Run with: python manage.py shell < test_ase_lead_access.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from ase_leads.models import ASELead

print("="*60)
print("ASE LEAD ACCESS TEST")
print("="*60)

# Find the employee user (srinu@gmail.com, user ID 45)
try:
    user = User.objects.get(email='srinu@gmail.com')
    print(f"\n✅ Found user: {user.email}")
    print(f"   - ID: {user.id}")
    print(f"   - Name: {user.first_name} {user.last_name}")
    print(f"   - Role: {user.role}")
    print(f"   - Company: {user.company}")
    print(f"   - Company ID: {user.company.id if user.company else 'None'}")
    print(f"   - Is Superuser: {user.is_superuser}")
    print(f"   - Is Staff: {user.is_staff}")
except User.DoesNotExist:
    print("\n❌ User srinu@gmail.com not found!")
    print("Available users:")
    for u in User.objects.filter(email__icontains='srinu'):
        print(f"   - {u.email} (ID: {u.id}, Role: {u.role})")
    exit()

print(f"\n{'='*60}")
print("TESTING ASE LEAD QUERYSET")
print("="*60)

# Test basic query
try:
    all_leads = ASELead.objects.filter(company_id=2)
    print(f"\n✅ Total ASE leads for company 2: {all_leads.count()}")
except Exception as e:
    print(f"\n❌ Error querying ASE leads: {e}")
    import traceback
    traceback.print_exc()

# Test employee-specific query
try:
    from django.db.models import Q
    employee_leads = ASELead.objects.filter(
        company=user.company
    ).filter(
        Q(assigned_to=user) | Q(created_by=user)
    ).distinct()
    
    print(f"\n✅ ASE leads for this employee: {employee_leads.count()}")
    
    if employee_leads.count() > 0:
        print("\nSample leads:")
        for lead in employee_leads[:5]:
            print(f"   - {lead.company_name} (Status: {lead.status}, Priority: {lead.priority})")
    else:
        print("\n⚠️  No leads found for this employee")
        print("   This employee has no leads assigned to them or created by them")
        
        # Check if there are ANY leads in the company
        company_leads = ASELead.objects.filter(company=user.company)
        print(f"\n   Total leads in company {user.company.name}: {company_leads.count()}")
        
        if company_leads.count() > 0:
            print("\n   Assigned to other users:")
            for lead in company_leads[:5]:
                assigned = lead.assigned_to.email if lead.assigned_to else 'Unassigned'
                created = lead.created_by.email if lead.created_by else 'Unknown'
                print(f"   - {lead.company_name} (Assigned: {assigned}, Created: {created})")
        
except Exception as e:
    print(f"\n❌ Error with employee query: {e}")
    import traceback
    traceback.print_exc()

print(f"\n{'='*60}")
print("TEST COMPLETE")
print("="*60)
