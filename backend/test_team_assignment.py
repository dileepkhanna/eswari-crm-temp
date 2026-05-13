#!/usr/bin/env python
"""
Script to test team assignment by directly updating the database
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User
from teams.models import Team

def test_team_assignment():
    print("=" * 80)
    print("TESTING TEAM ASSIGNMENT")
    print("=" * 80)
    print()
    
    # Get the user
    try:
        user = User.objects.get(username='dileep_employee_10')
        print(f"✓ Found user: {user.first_name} {user.last_name} ({user.username})")
        print(f"  Current team: {user.team.name if user.team else 'None'}")
        print()
    except User.DoesNotExist:
        print("✗ User 'dileep_employee_10' not found")
        return
    
    # Get the Frontend Development team
    try:
        team = Team.objects.get(name='Frontend Development', company_id=2)
        print(f"✓ Found team: {team.name} (ID: {team.id})")
        print()
    except Team.DoesNotExist:
        print("✗ Team 'Frontend Development' not found")
        return
    
    # Assign the user to the team
    user.team = team
    user.save()
    print(f"✓ Assigned {user.username} to {team.name}")
    print()
    
    # Verify the assignment
    user.refresh_from_db()
    if user.team and user.team.id == team.id:
        print("=" * 80)
        print("✓ SUCCESS: Team assignment verified!")
        print("=" * 80)
        print(f"User: {user.first_name} {user.last_name}")
        print(f"Team: {user.team.name}")
        print(f"Team ID: {user.team.id}")
    else:
        print("=" * 80)
        print("✗ FAILED: Team assignment not saved")
        print("=" * 80)

if __name__ == '__main__':
    test_team_assignment()
