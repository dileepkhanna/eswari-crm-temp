"""
Test script to verify bulk import assigns all calls to the importing user
Run this after performing a bulk import in the UI
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_customers.models import ASECustomer
from django.contrib.auth import get_user_model

User = get_user_model()

# Get the manager user (khanna_manager_03, user_id=9)
manager = User.objects.get(username='khanna_manager_03')
print(f"Manager: {manager.username} (ID: {manager.id})")

# Get the most recent 20 customers created by the manager
recent_customers = ASECustomer.objects.filter(
    created_by=manager,
    company_id=2
).order_by('-created_at')[:20]

print(f"\nFound {recent_customers.count()} recent customers created by manager")
print("\nRecent bulk imports assignment check:")
print("="*80)

# Group by creation time to identify bulk imports
from collections import defaultdict
bulk_imports = defaultdict(list)

for customer in recent_customers:
    # Group by minute (bulk imports happen in same minute)
    time_key = customer.created_at.replace(second=0, microsecond=0)
    bulk_imports[time_key].append(customer)

# Show bulk import groups (5+ records in same minute)
for time_key, customers in sorted(bulk_imports.items(), reverse=True):
    if len(customers) >= 5:  # Likely a bulk import
        print(f"\nBulk import at {time_key}:")
        print(f"  Total records: {len(customers)}")
        
        # Check assignment
        assigned_users = set([c.assigned_to_id for c in customers])
        created_by = customers[0].created_by_id
        
        print(f"  Created by: User ID {created_by} ({customers[0].created_by.username})")
        print(f"  Assigned to: {len(assigned_users)} different users")
        
        if len(assigned_users) == 1 and list(assigned_users)[0] == created_by:
            print(f"  ✅ CORRECT: All assigned to creator (User ID {created_by})")
        else:
            print(f"  ❌ WRONG: Round-robin assignment detected!")
            print(f"     Assigned to users: {sorted(assigned_users)}")
            
        # Show first 3 examples
        print(f"\n  Sample records:")
        for i, customer in enumerate(customers[:3]):
            print(f"    {i+1}. {customer.name} - Assigned to: User ID {customer.assigned_to_id} ({customer.assigned_to.username if customer.assigned_to else 'None'})")
