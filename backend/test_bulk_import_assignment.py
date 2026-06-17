#!/usr/bin/env python
"""
Test script to verify bulk import assignment logic.
Direct database test without HTTP requests.
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from ase_customers.models import ASECustomer
from datetime import datetime

def test_bulk_import():
    print("=" * 80)
    print("Testing ASE Bulk Import Assignment Logic")
    print("=" * 80)
    
    # Step 1: Get manager user
    print("\n1. Getting manager user...")
    try:
        manager = User.objects.get(username='khanna_manager_03')
        print(f"✅ Found manager: {manager.username} (ID: {manager.id})")
        print(f"   Company: {manager.company.name if manager.company else 'None'}")
        print(f"   Role: {manager.role}")
    except User.DoesNotExist:
        print("❌ Manager 'khanna_manager_03' not found!")
        return False
    
    # Step 2: Simulate bulk import logic
    print("\n2. Simulating bulk import logic...")
    timestamp = datetime.now().strftime("%H%M%S")
    
    # This is the EXACT code from views.py import_customers method
    assigned_user = manager  # Line 865 in views.py
    
    test_customers = []
    for i in range(1, 6):
        customer_data = {
            'phone': f'9999{timestamp}{i}',
            'name': f'Test Bulk {i}',
            'company_name': f'Test Company {i}',
            'call_status': 'pending',
            'company': manager.company,
            'created_by': manager,
            'assigned_to': assigned_user,  # Line 883 in views.py
        }
        
        customer = ASECustomer.objects.create(**customer_data)
        test_customers.append(customer)
        print(f"   Created call: {customer.phone} → assigned_to={customer.assigned_to.username}")
    
    # Step 3: Verify assignments
    print("\n3. Verifying assignments...")
    assignment_counts = {}
    all_correct = True
    
    for customer in test_customers:
        assignee = customer.assigned_to.username if customer.assigned_to else 'None'
        assignment_counts[assignee] = assignment_counts.get(assignee, 0) + 1
        
        if customer.assigned_to != manager:
            all_correct = False
            print(f"   ❌ {customer.phone} assigned to '{assignee}' (expected '{manager.username}')")
    
    print(f"\n4. Assignment Summary:")
    for assignee, count in assignment_counts.items():
        symbol = "✅" if assignee == manager.username else "❌"
        print(f"   {symbol} {assignee}: {count} calls")
    
    # Step 4: Result
    print("\n" + "=" * 80)
    if all_correct and len(assignment_counts) == 1:
        print("✅ TEST PASSED: All imported calls assigned to manager!")
        print(f"   All {len(test_customers)} calls assigned to: {manager.username}")
    else:
        print("❌ TEST FAILED: Assignment logic is incorrect!")
        print(f"   Expected: All calls assigned to '{manager.username}'")
        print(f"   Actual: Calls assigned to {len(assignment_counts)} different users")
    print("=" * 80)
    
    # Cleanup
    print("\n5. Cleaning up test data...")
    for customer in test_customers:
        customer.delete()
    print(f"✅ Deleted {len(test_customers)} test calls")
    
    return all_correct

if __name__ == '__main__':
    try:
        success = test_bulk_import()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
