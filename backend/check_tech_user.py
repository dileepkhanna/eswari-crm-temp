#!/usr/bin/env python
"""
Check technical user's team assignment
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from teams.models import Team

User = get_user_model()

def check_user():
    """Check the 'tech' user's details"""
    print("=" * 60)
    print("Checking Technical User Details")
    print("=" * 60)
    
    try:
        # Find user with username 'tech' or similar
        users = User.objects.filter(username__icontains='tech')
        
        if not users.exists():
            print("\n✗ No users found with 'tech' in username")
            print("\nAll users:")
            for user in User.objects.all()[:10]:
                print(f"  - {user.username} (ID: {user.id}, Role: {user.role}, Company: {user.company}, Team: {user.team})")
            return
        
        for user in users:
            print(f"\n{'='*60}")
            print(f"User: {user.username}")
            print(f"{'='*60}")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"First Name: {user.first_name}")
            print(f"Last Name: {user.last_name}")
            print(f"Role: {user.role}")
            print(f"Company: {user.company} (ID: {user.company.id if user.company else None})")
            print(f"Team: {user.team}")
            
            if user.team:
                print(f"\nTeam Details:")
                print(f"  - Name: {user.team.name}")
                print(f"  - Type: {user.team.team_type}")
                print(f"  - Company: {user.team.company}")
                
                # Check if this should redirect to technical panel
                is_ase = user.company and user.company.id == 2
                is_technical = user.team.team_type == 'technical'
                
                print(f"\nRedirect Check:")
                print(f"  - Is ASE Technologies (ID=2)? {is_ase}")
                print(f"  - Is Technical Team? {is_technical}")
                print(f"  - Should redirect to /team/technical? {is_ase and is_technical}")
            else:
                print(f"\n✗ User has NO team assigned!")
                print(f"  This user will see the regular staff dashboard")
                print(f"\nTo fix:")
                print(f"  1. Assign this user to a technical team")
                print(f"  2. Make sure the team has team_type='technical'")
                print(f"  3. Make sure the team belongs to ASE Technologies (company_id=2)")
        
        # Show available technical teams
        print(f"\n{'='*60}")
        print("Available Technical Teams:")
        print(f"{'='*60}")
        tech_teams = Team.objects.filter(team_type='technical')
        if tech_teams.exists():
            for team in tech_teams:
                print(f"  - {team.name} (ID: {team.id}, Company: {team.company})")
        else:
            print("  ✗ No technical teams found!")
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    success = check_user()
    sys.exit(0 if success else 1)
