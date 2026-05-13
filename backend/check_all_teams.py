#!/usr/bin/env python
"""
Script to check all team assignments (both technical and marketing)
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from teams.models import Team

def check_all_teams():
    print("=" * 80)
    print("ALL TEAMS - USER ASSIGNMENT REPORT")
    print("=" * 80)
    print()
    
    # Get all teams for ASE Technologies (company_id=2)
    all_teams = Team.objects.filter(company_id=2).order_by('team_type', 'name')
    
    if not all_teams.exists():
        print("No teams found for ASE Technologies")
        return
    
    print(f"Found {all_teams.count()} total teams:\n")
    
    # Group by team type
    for team_type in ['technical', 'marketing']:
        teams = all_teams.filter(team_type=team_type)
        
        if not teams.exists():
            continue
        
        print(f"\n{'='*80}")
        print(f"{team_type.upper()} TEAMS ({teams.count()} teams)")
        print(f"{'='*80}\n")
        
        type_total = 0
        
        for team in teams:
            members = User.objects.filter(team=team).select_related('company')
            member_count = members.count()
            type_total += member_count
            
            print(f"📋 {team.name} (ID: {team.id})")
            print(f"   Members: {member_count}")
            
            if member_count > 0:
                for user in members:
                    print(f"      ✓ {user.first_name} {user.last_name} ({user.username}) - {user.get_role_display()}")
            else:
                print(f"      ⚠️  No members")
            print()
        
        print(f"   Subtotal for {team_type}: {type_total} members\n")
    
    # Overall summary
    total_assigned = User.objects.filter(company_id=2, team__isnull=False).count()
    total_unassigned = User.objects.filter(company_id=2, team__isnull=True).exclude(role='admin').count()
    
    print("=" * 80)
    print("OVERALL SUMMARY")
    print("=" * 80)
    print(f"Total Teams: {all_teams.count()}")
    print(f"Users Assigned to Teams: {total_assigned}")
    print(f"Users Not Assigned: {total_unassigned}")
    print()

if __name__ == '__main__':
    check_all_teams()
