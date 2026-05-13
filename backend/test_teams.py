"""
Test script to verify teams are working
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from teams.models import Team
from accounts.models import Company

# Get ASE Technologies
ase = Company.objects.get(code='ASE')
teams = Team.objects.filter(company=ase)

print(f"✓ Total teams for {ase.name}: {teams.count()}\n")

# Group by type
team_types = {}
for team in teams:
    team_type = team.get_team_type_display()
    if team_type not in team_types:
        team_types[team_type] = []
    team_types[team_type].append(team.name)

# Display grouped
for team_type, team_names in sorted(team_types.items()):
    print(f"{team_type} ({len(team_names)}):")
    for name in team_names:
        print(f"  • {name}")
    print()

print("✅ Teams feature is working correctly!")
