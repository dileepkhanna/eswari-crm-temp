#!/usr/bin/env python
"""
Test creating ASE Lead as an employee to verify auto-assignment
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from ase_leads.models import ASELead
from accounts.models import User
from django.test import RequestFactory
from ase_leads.views import ASELeadViewSet
from rest_framework.test import force_authenticate

print("="*70)
print("TEST: CREATE ASE LEAD AS EMPLOYEE")
print("="*70)

# Get dileep employee
try:
    dileep = User.objects.get(username='dileep_employee_14')
    print(f"\n✓ Testing with employee: {dileep.first_name} {dileep.last_name}")
    print(f"  ID: {dileep.id}")
    print(f"  Company: {dileep.company.name if dileep.company else 'None'}")
    
    # Create a test lead data
    lead_data = {
        'contact_person': 'Test Lead Auto-Assign',
        'phone': '9999999999',
        'email': 'test@example.com',
        'company_name': 'Test Company',
        'industry': 'technology',
        'service_interests': ['seo', 'social_media'],
        'status': 'new',
        'priority': 'medium',
    }
    
    print(f"\n📝 Creating test lead...")
    print(f"   Contact: {lead_data['contact_person']}")
    print(f"   Phone: {lead_data['phone']}")
    
    # Simulate API request
    factory = RequestFactory()
    request = factory.post('/api/ase/leads/', lead_data, content_type='application/json')
    request.user = dileep
    force_authenticate(request, user=dileep)
    
    # Create lead using viewset
    viewset = ASELeadViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    # Use the serializer
    from ase_leads.serializers import ASELeadSerializer
    serializer = ASELeadSerializer(data=lead_data, context={'request': request})
    
    if serializer.is_valid():
        # Call perform_create (this is what the view does)
        viewset.perform_create(serializer)
        lead = serializer.instance
        
        print(f"\n✓ Lead created successfully!")
        print(f"   Lead ID: {lead.id}")
        print(f"   Created by: {lead.created_by.username}")
        print(f"   Assigned to: {lead.assigned_to.username if lead.assigned_to else 'None'}")
        
        # Verify assignment
        if lead.created_by == lead.assigned_to:
            print(f"\n✅ SUCCESS! Lead is correctly auto-assigned to creator!")
        else:
            print(f"\n❌ FAIL! Lead assignment mismatch!")
            print(f"   Expected: {lead.created_by.username}")
            print(f"   Got: {lead.assigned_to.username if lead.assigned_to else 'None'}")
        
        # Clean up
        lead.delete()
        print(f"\n🧹 Test lead deleted")
    else:
        print(f"\n❌ Validation errors: {serializer.errors}")
    
except User.DoesNotExist:
    print("❌ Employee 'dileep_employee_14' not found")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
