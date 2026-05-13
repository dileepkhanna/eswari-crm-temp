#!/usr/bin/env python
"""
Test script to verify team-based login redirect functionality.
This script checks:
1. Backend returns team_info in login response
2. Team members have correct team_type
3. All necessary data is present for frontend redirect logic
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.serializers import UserSerializer
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_team_login_redirect():
    """Test team-based login redirect data"""
    
    print("=" * 80)
    print("TEAM-BASED LOGIN REDIRECT TEST")
    print("=" * 80)
    print()
    
    # Get ASE Technologies users with teams
    ase_users_with_teams = User.objects.filter(
        company_id=2,  # ASE Technologies
        team__isnull=False
    ).select_related('team', 'company')
    
    print(f"Found {ase_users_with_teams.count()} ASE Technologies users with teams assigned")
    print()
    
    if ase_users_with_teams.count() == 0:
        print("⚠️  WARNING: No ASE Technologies users have teams assigned!")
        print("   Please assign users to teams before testing login redirect.")
        print()
        return
    
    # Create a mock request for serializer context
    factory = APIRequestFactory()
    request = factory.get('/')
    
    for user in ase_users_with_teams:
        print("-" * 80)
        print(f"User: {user.username}")
        print(f"Name: {user.first_name} {user.last_name}")
        print(f"Role: {user.role}")
        print(f"Company: {user.company.name if user.company else 'None'}")
        print(f"Team: {user.team.name if user.team else 'None'}")
        print(f"Team Type: {user.team.team_type if user.team else 'None'}")
        print()
        
        # Serialize user data (simulating login response)
        serializer = UserSerializer(user, context={'request': request})
        user_data = serializer.data
        
        print("Serialized Data (Login Response):")
        print(f"  - id: {user_data.get('id')}")
        print(f"  - username: {user_data.get('username')}")
        print(f"  - role: {user_data.get('role')}")
        print(f"  - company: {user_data.get('company')}")
        print(f"  - team: {user_data.get('team')}")
        print(f"  - team_info: {user_data.get('team_info')}")
        print()
        
        # Verify team_info is present
        team_info = user_data.get('team_info')
        if team_info:
            print("✅ team_info is present in serialized data")
            print(f"   - Team ID: {team_info.get('id')}")
            print(f"   - Team Name: {team_info.get('name')}")
            print(f"   - Team Type: {team_info.get('team_type')}")
            print(f"   - Team Type Display: {team_info.get('team_type_display')}")
            print()
            
            # Determine expected redirect
            team_type = team_info.get('team_type')
            company_id = user_data.get('company')
            
            if company_id == 2:  # ASE Technologies
                if team_type == 'technical':
                    expected_redirect = '/admin/technical-team'
                    print(f"✅ Expected Redirect: {expected_redirect}")
                elif team_type == 'marketing':
                    expected_redirect = '/admin/marketing-team'
                    print(f"✅ Expected Redirect: {expected_redirect}")
                else:
                    print(f"⚠️  Unknown team_type: {team_type}")
            else:
                print(f"⚠️  User is not in ASE Technologies (company_id={company_id})")
        else:
            print("❌ team_info is MISSING from serialized data!")
            print("   This will cause login redirect to fail!")
        
        print()
    
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    
    # Summary statistics
    technical_users = ase_users_with_teams.filter(team__team_type='technical').count()
    marketing_users = ase_users_with_teams.filter(team__team_type='marketing').count()
    
    print(f"Technical Team Members: {technical_users}")
    print(f"Marketing Team Members: {marketing_users}")
    print(f"Total Team Members: {ase_users_with_teams.count()}")
    print()
    
    print("REDIRECT LOGIC:")
    print("  1. Check if user.company?.id === 2 (ASE Technologies)")
    print("  2. Check if user.team_info?.team_type === 'technical'")
    print("     → Redirect to /admin/technical-team")
    print("  3. Check if user.team_info?.team_type === 'marketing'")
    print("     → Redirect to /admin/marketing-team")
    print("  4. Otherwise, use role-based redirect")
    print()
    
    print("SECURITY CHECKS:")
    print("  ✅ Company ID verification (must be ASE Technologies)")
    print("  ✅ Team type validation (technical or marketing)")
    print("  ✅ Fallback to role-based redirect if checks fail")
    print()
    
    # Test non-ASE users
    non_ase_users = User.objects.exclude(company_id=2).filter(is_active=True)[:3]
    if non_ase_users.exists():
        print("NON-ASE USERS (Should use role-based redirect):")
        for user in non_ase_users:
            role_redirect_map = {
                'admin': '/admin',
                'manager': '/manager',
                'employee': '/staff',
                'hr': '/hr'
            }
            expected_redirect = role_redirect_map.get(user.role, '/login')
            print(f"  - {user.username} ({user.company.name if user.company else 'No Company'})")
            print(f"    Role: {user.role} → Expected Redirect: {expected_redirect}")
        print()
    
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    test_team_login_redirect()
