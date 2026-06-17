#!/usr/bin/env python
"""
Check ASE Technologies company configuration in the database.
Verifies that ASE Technologies has company ID = 2 and displays related info.
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import Company, User
from ase_customers.models import ASECustomer
from ase_leads.models.lead import ASELead

def main():
    print("=" * 80)
    print("ASE Technologies Company Check")
    print("=" * 80)
    
    # Check if ASE Technologies company exists
    try:
        ase_company = Company.objects.get(code='ASE')
        print(f"\n✅ ASE Technologies Company Found:")
        print(f"   ID: {ase_company.id}")
        print(f"   Name: {ase_company.name}")
        print(f"   Code: {ase_company.code}")
        print(f"   Active: {ase_company.is_active}")
        print(f"   Created: {ase_company.created_at}")
        
        # Verify ID is 2
        if ase_company.id == 2:
            print(f"\n✅ VERIFIED: ASE Technologies company ID is 2")
        else:
            print(f"\n⚠️  WARNING: ASE Technologies company ID is {ase_company.id}, NOT 2!")
            print(f"   This may cause issues with hardcoded references to company_id=2")
        
        # Count related data
        print(f"\n📊 ASE Technologies Data:")
        
        # Users
        user_count = User.objects.filter(company=ase_company).count()
        print(f"   Users: {user_count}")
        
        # Show user breakdown by role
        if user_count > 0:
            for role, role_label in [('admin', 'Admin'), ('manager', 'Manager'), ('employee', 'Employee'), ('hr', 'HR')]:
                count = User.objects.filter(company=ase_company, role=role).count()
                if count > 0:
                    print(f"      - {role_label}: {count}")
        
        # ASE Customers (Calls)
        customer_count = ASECustomer.objects.filter(company=ase_company).count()
        print(f"   ASE Customers (Calls): {customer_count}")
        
        # ASE Leads
        lead_count = ASELead.objects.filter(company=ase_company).count()
        print(f"   ASE Leads: {lead_count}")
        
        # Sample users (first 5)
        print(f"\n👥 Sample ASE Users:")
        sample_users = User.objects.filter(company=ase_company).select_related('company')[:5]
        if sample_users.exists():
            for u in sample_users:
                print(f"   - {u.username} ({u.first_name} {u.last_name}) - {u.role} - {u.email or 'no email'}")
        else:
            print("   No users found")
        
        # Check for any customers/leads with wrong company
        print(f"\n🔍 Data Integrity Checks:")
        
        # Check for ASE customers assigned to non-ASE company
        wrong_company_customers = ASECustomer.objects.exclude(company=ase_company).count()
        if wrong_company_customers > 0:
            print(f"   ⚠️  WARNING: {wrong_company_customers} ASE customers assigned to non-ASE companies!")
            # Show breakdown
            from django.db.models import Count
            breakdown = ASECustomer.objects.exclude(company=ase_company).values('company__name').annotate(count=Count('id'))
            for item in breakdown:
                print(f"      - {item['company__name']}: {item['count']}")
        else:
            print(f"   ✅ All ASE customers correctly assigned to ASE Technologies")
        
        # Check for ASE leads assigned to non-ASE company
        wrong_company_leads = ASELead.objects.exclude(company=ase_company).count()
        if wrong_company_leads > 0:
            print(f"   ⚠️  WARNING: {wrong_company_leads} ASE leads assigned to non-ASE companies!")
            # Show breakdown
            from django.db.models import Count
            breakdown = ASELead.objects.exclude(company=ase_company).values('company__name').annotate(count=Count('id'))
            for item in breakdown:
                print(f"      - {item['company__name']}: {item['count']}")
        else:
            print(f"   ✅ All ASE leads correctly assigned to ASE Technologies")
        
    except Company.DoesNotExist:
        print("\n❌ ERROR: ASE Technologies company not found!")
        print("   Expected company with code='ASE'")
        print("\nAvailable companies:")
        for company in Company.objects.all():
            print(f"   - ID {company.id}: {company.name} (code: {company.code})")
        return 1
    
    print("\n" + "=" * 80)
    return 0

if __name__ == '__main__':
    sys.exit(main())
