"""
Script to fix old converted leads that were hidden with is_disabled=True
This will make them visible again in the leads list
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from leads.models import Lead

def fix_old_converted_leads():
    """
    Find all leads that were converted (have converted_task_id)
    but are disabled (is_disabled=True), and make them visible again
    """
    
    # Find old converted leads that are disabled
    old_converted_leads = Lead.objects.filter(
        converted_task_id__isnull=False,
        is_disabled=True
    )
    
    count = old_converted_leads.count()
    print(f"Found {count} old converted leads that are hidden")
    
    if count > 0:
        # Show details
        for lead in old_converted_leads[:10]:  # Show first 10
            print(f"  - Lead #{lead.id}: {lead.name} (Task #{lead.converted_task_id})")
        
        if count > 10:
            print(f"  ... and {count - 10} more")
        
        # Ask for confirmation
        response = input(f"\nMake all {count} leads visible again? (yes/no): ")
        
        if response.lower() in ['yes', 'y']:
            # Update all to be visible
            updated = old_converted_leads.update(is_disabled=False)
            print(f"\n✅ Successfully updated {updated} leads")
            print("These leads are now visible in the leads list with 'Task' badge")
        else:
            print("\nOperation cancelled")
    else:
        print("✅ No old converted leads found - all good!")

if __name__ == '__main__':
    fix_old_converted_leads()
