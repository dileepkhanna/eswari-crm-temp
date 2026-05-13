#!/usr/bin/env python
"""
Assign tech user to technical team
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

def assign_to_team():
    """Assign tech_employee_20 to Technical Team"""
    print("=" * 60)
    print("Assigning Tech User to Technical Team")
    print("=" * 60)
    
    try:
        # Find the tech user
        user = User.objects.get(username='tech_employee_20')
        print(f"\n✓ Found user: {user.username} (ID: {user.id})")
        print(f"  Current team: {user.team}")
        
        # Find the Technical Team
        tech_team = Team.objects.get(name='Technical Team', team_type='technical', company_id=2)
        print(f"\n✓ Found team: {tech_team.name} (ID: {tech_team.id})")
        print(f"  Team type: {tech_team.team_type}")
        print(f"  Company: {tech_team.company}")
        
        # Assign user to team
        user.team = tech_team
        user.save()
        
        print(f"\n✓ Successfully assigned {user.username} to {tech_team.name}!")
        print(f"\nUser Details After Update:")
        print(f"  - Username: {user.username}")
        print(f"  - Role: {user.role}")
        print(f"  - Company: {user.company}")
        print(f"  - Team: {user.team}")
        print(f"  - Team Type: {user.team.team_type}")
        
        print(f"\n{'='*60}")
        print("✓ DONE! User will now be redirected to /team/technical on login")
        print(f"{'='*60}")
        print("\nNext steps:")
        print("1. Logout from the current session")
        print("2. Login again with the same credentials")
        print("3. You should be redirected to the Technical Team Panel")
        
    except User.DoesNotExist:
        print("\n✗ User 'tech_employee_20' not found!")
        return False
    except Team.DoesNotExist:
        print("\n✗ Technical Team not found!")
        return False
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    success = assign_to_team()
    sys.exit(0 if success else 1)
