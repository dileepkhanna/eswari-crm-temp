#!/usr/bin/env python
"""
Quick script to fix customer emails that are causing conversion errors.
Run this if you can't restart the backend server immediately.

Usage:
    python fix_customer_email.py <customer_id>
    python fix_customer_email.py 161
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_customers.models import ASECustomer


def fix_customer_email(customer_id):
    """Fix a customer's email if it's invalid or empty."""
    try:
        customer = ASECustomer.objects.get(id=customer_id)
        
        print(f"\n📋 Customer: {customer.name or customer.phone}")
        print(f"   ID: {customer.id}")
        print(f"   Current email: '{customer.email}' (type: {type(customer.email).__name__})")
        
        # Check if email is problematic
        if customer.email is None:
            print("   ✅ Email is already None (OK)")
            return
        
        if not customer.email.strip():
            print("   ⚠️  Email is empty or whitespace")
            customer.email = None
            customer.save()
            print("   ✅ Fixed: Set email to None")
            return
        
        # Check if email looks valid (basic check)
        if '@' not in customer.email or '.' not in customer.email:
            print(f"   ⚠️  Email looks invalid: '{customer.email}'")
            response = input("   Set to None? (y/n): ")
            if response.lower() == 'y':
                customer.email = None
                customer.save()
                print("   ✅ Fixed: Set email to None")
            else:
                print("   ⏭️  Skipped")
            return
        
        print("   ✅ Email looks valid")
        
    except ASECustomer.DoesNotExist:
        print(f"❌ Customer with ID {customer_id} not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def fix_all_invalid_emails():
    """Fix all customers with invalid emails."""
    print("\n🔍 Scanning all customers for invalid emails...\n")
    
    customers = ASECustomer.objects.all()
    fixed_count = 0
    
    for customer in customers:
        if customer.email and not customer.email.strip():
            print(f"Fixing customer {customer.id}: '{customer.email}' -> None")
            customer.email = None
            customer.save()
            fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} customers with empty/whitespace emails")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Fix specific customer:  python fix_customer_email.py <customer_id>")
        print("  Fix all customers:      python fix_customer_email.py --all")
        sys.exit(1)
    
    if sys.argv[1] == '--all':
        fix_all_invalid_emails()
    else:
        try:
            customer_id = int(sys.argv[1])
            fix_customer_email(customer_id)
        except ValueError:
            print("❌ Invalid customer ID. Must be a number.")
            sys.exit(1)
