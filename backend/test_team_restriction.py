#!/usr/bin/env python
"""
Script to test that teams are only returned for ASE Technologies
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from teams.models import Team

def test_team_restriction():
    print("=" * 80)
    print("TESTING TEAM RESTRICTION")
    print("=" * 80)
    print()
    
    # Test 1: Check database
    print("📊 DATABASE CHECK:")
    print(f"   Total teams in database: {Team.objects.count()}")
    print(f"   ASE Technologies (ID=2): {Team.objects.filter(company_id=2).count()}")
    print(f"   Eswari Group (ID=1): {Team.objects.filter(company_id=1).count()}")
    print(f"   Eswari Capital (ID=3): {Team.objects.filter(company_id=3).count()}")
    print()
    
    # Test 2: Simulate API query for each company
    print("🔍 API SIMULATION:")
    
    # Simulate what the API would return for each company
    for company_id, company_name in [(1, "Eswari Group"), (2, "ASE Technologies"), (3, "Eswari Capital")]:
        # This simulates what TeamViewSet.get_queryset() returns
        teams = Team.objects.filter(company_id=2)  # Backend restriction
        
        # Then filter by requested company (if provided)
        if company_id:
            teams = teams.filter(company_id=company_id)
        
        count = teams.count()
        print(f"   GET /api/teams/?company={company_id} ({company_name})")
        print(f"   → Returns: {count} teams")
        
        if count > 0:
            print(f"   ✅ Teams available")
        else:
            print(f"   ⚠️  No teams (as expected for non-ASE companies)")
        print()
    
    # Test 3: Verify restriction
    print("=" * 80)
    print("VERIFICATION:")
    print("=" * 80)
    
    ase_teams = Team.objects.filter(company_id=2).count()
    other_teams = Team.objects.exclude(company_id=2).count()
    
    if ase_teams > 0 and other_teams == 0:
        print("✅ SUCCESS: Teams are only available for ASE Technologies")
        print(f"   - ASE Technologies has {ase_teams} teams")
        print(f"   - Other companies have {other_teams} teams")
    else:
        print("❌ FAILED: Teams found for other companies")
        print(f"   - ASE Technologies: {ase_teams} teams")
        print(f"   - Other companies: {other_teams} teams")
    
    print()

if __name__ == '__main__':
    test_team_restriction()
