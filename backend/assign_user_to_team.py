#!/usr/bin/env python
"""
Script to assign dileep_employee_14 to a technical team
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from teams.models import Team

def assign_user_to_team():
    print("=" * 80)
    print("ASSIGNING USER TO TECHNICAL TEAM")
    print("=" * 80)
    print()
    
    # Get the user
    try:
        user = User.objects.get(username='dileep_employee_14')
        print(f"✓ Found user: {user.first_name} {user.last_name} ({user.username})")
        print(f"  Company: {user.company.name if user.company else 'None'}")
        print(f"  Current team: {user.team.name if user.team else 'None'}")
        print(f"  Role: {user.get_role_display()}")
        print()
    except User.DoesNotExist:
        print("✗ User 'dileep_employee_14' not found")
        return
    
    # Check if user is in ASE Technologies
    if not user.company or user.company.id != 2:
        print("✗ User is not in ASE Technologies (company ID: 2)")
        print(f"  User's company: {user.company.name if user.company else 'None'}")
        return
    
    # Show available technical teams
    print("Available Technical Teams:")
    technical_teams = Team.objects.filter(company_id=2, team_type='technical').order_by('name')
    
    for idx, team in enumerate(technical_teams, 1):
        member_count = team.members.count()
        print(f"  {idx}. {team.name} (ID: {team.id}) - {member_count} members")
    print()
    
    # Assign to Backend Development team (or first technical team)
    if technical_teams.exists():
        # Try to find Backend Development, otherwise use first technical team
        team = technical_teams.filter(name='Backend Development').first()
        if not team:
            team = technical_teams.first()
        
        print(f"Assigning user to: {team.name}")
        user.team = team
        user.save()
        print(f"✓ Successfully assigned {user.username} to {team.name}")
        print()
        
        # Verify the assignment
        user.refresh_from_db()
        if user.team and user.team.id == team.id:
            print("=" * 80)
            print("✓ VERIFICATION SUCCESSFUL")
            print("=" * 80)
            print(f"User: {user.first_name} {user.last_name} ({user.username})")
            print(f"Team: {user.team.name}")
            print(f"Team Type: {user.team.get_team_type_display()}")
            print(f"Team ID: {user.team.id}")
            print()
            
            # Show updated team members
            print(f"Current members of {team.name}:")
            members = team.members.all()
            for member in members:
                full_name = f"{member.first_name} {member.last_name}".strip() or member.username
                print(f"  • {full_name} ({member.username}) - {member.get_role_display()}")
        else:
            print("=" * 80)
            print("✗ VERIFICATION FAILED")
            print("=" * 80)
            print("Team assignment was not saved properly")
    else:
        print("✗ No technical teams found for ASE Technologies")

if __name__ == '__main__':
    assign_user_to_team()
