#!/usr/bin/env python
"""
Script to check how many users are assigned to technical teams
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from teams.models import Team

def check_technical_teams():
    print("=" * 80)
    print("TECHNICAL TEAMS - USER ASSIGNMENT REPORT")
    print("=" * 80)
    print()
    
    # Get all technical teams for ASE Technologies (company_id=2)
    technical_teams = Team.objects.filter(
        company_id=2,
        team_type='technical'
    ).order_by('name')
    
    if not technical_teams.exists():
        print("No technical teams found for ASE Technologies")
        return
    
    print(f"Found {technical_teams.count()} technical teams:\n")
    
    total_members = 0
    
    for team in technical_teams:
        # Get all users in this team
        members = User.objects.filter(team=team).select_related('company')
        member_count = members.count()
        total_members += member_count
        
        print(f"📋 {team.name}")
        print(f"   Team ID: {team.id}")
        print(f"   Members: {member_count}")
        
        if member_count > 0:
            print(f"   Users:")
            for user in members:
                role_display = user.get_role_display()
                print(f"      - {user.first_name} {user.last_name} ({user.username})")
                print(f"        Email: {user.email}")
                print(f"        Role: {role_display}")
                if user.designation:
                    print(f"        Designation: {user.designation}")
                print()
        else:
            print(f"   ⚠️  No members assigned yet")
        
        print("-" * 80)
        print()
    
    print("=" * 80)
    print(f"SUMMARY")
    print("=" * 80)
    print(f"Total Technical Teams: {technical_teams.count()}")
    print(f"Total Members Assigned: {total_members}")
    print(f"Average Members per Team: {total_members / technical_teams.count():.1f}")
    print()
    
    # Check users without teams
    ase_users_without_team = User.objects.filter(
        company_id=2,
        team__isnull=True
    ).exclude(role='admin')
    
    if ase_users_without_team.exists():
        print(f"\n⚠️  {ase_users_without_team.count()} ASE Technologies users not assigned to any team:")
        for user in ase_users_without_team:
            print(f"   - {user.first_name} {user.last_name} ({user.username}) - {user.get_role_display()}")
    else:
        print("\n✅ All ASE Technologies users are assigned to teams")
    
    print()

if __name__ == '__main__':
    check_technical_teams()
