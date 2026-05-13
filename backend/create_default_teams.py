"""
Script to create default teams for ASE Technologies
Run with: python create_default_teams.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from teams.models import Team
from accounts.models import Company

def create_default_teams():
    try:
        # Get ASE Technologies company
        ase = Company.objects.get(code='ASE')
        print(f"✓ Found company: {ase.name}")
        
        # Define default teams
        default_teams = [
            {
                'name': 'Frontend Development',
                'team_type': 'technical',
                'description': 'React, Vue, Angular, and modern frontend technologies'
            },
            {
                'name': 'Backend Development',
                'team_type': 'technical',
                'description': 'Python, Node.js, API development, and server-side logic'
            },
            {
                'name': 'Mobile Development',
                'team_type': 'technical',
                'description': 'iOS, Android, React Native, Flutter development'
            },
            {
                'name': 'UI/UX Design',
                'team_type': 'technical',
                'description': 'User interface and user experience design'
            },
            {
                'name': 'DevOps',
                'team_type': 'technical',
                'description': 'Infrastructure, deployment, CI/CD, and cloud management'
            },
            {
                'name': 'QA/Testing',
                'team_type': 'technical',
                'description': 'Quality assurance, testing, and bug tracking'
            },
            {
                'name': 'SEO Team',
                'team_type': 'marketing',
                'description': 'Search engine optimization and organic traffic growth'
            },
            {
                'name': 'Social Media Team',
                'team_type': 'marketing',
                'description': 'Social media marketing, content, and community management'
            },
            {
                'name': 'Content Writing',
                'team_type': 'marketing',
                'description': 'Blog posts, articles, copywriting, and content creation'
            },
            {
                'name': 'PPC/Ads Team',
                'team_type': 'marketing',
                'description': 'Google Ads, Facebook Ads, and paid advertising campaigns'
            },
            {
                'name': 'Email Marketing',
                'team_type': 'marketing',
                'description': 'Email campaigns, newsletters, and automation'
            },
            {
                'name': 'Graphic Design',
                'team_type': 'marketing',
                'description': 'Visual design, branding, and marketing materials'
            },
            {
                'name': 'Sales Team',
                'team_type': 'sales',
                'description': 'Business development, client acquisition, and sales'
            },
            {
                'name': 'Account Management',
                'team_type': 'sales',
                'description': 'Client relationship management and account growth'
            },
            {
                'name': 'Customer Support',
                'team_type': 'support',
                'description': 'Customer service and support tickets'
            },
            {
                'name': 'Technical Support',
                'team_type': 'support',
                'description': 'Technical assistance and troubleshooting'
            },
        ]
        
        created_count = 0
        skipped_count = 0
        
        for team_data in default_teams:
            team, created = Team.objects.get_or_create(
                name=team_data['name'],
                company=ase,
                defaults={
                    'team_type': team_data['team_type'],
                    'description': team_data['description'],
                    'is_active': True
                }
            )
            
            if created:
                print(f"✓ Created team: {team.name} ({team.get_team_type_display()})")
                created_count += 1
            else:
                print(f"- Team already exists: {team.name}")
                skipped_count += 1
        
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  Created: {created_count} teams")
        print(f"  Skipped: {skipped_count} teams (already exist)")
        print(f"  Total: {Team.objects.filter(company=ase).count()} teams for {ase.name}")
        print(f"{'='*60}")
        
    except Company.DoesNotExist:
        print("✗ Error: ASE Technologies company not found!")
        print("  Please create the company first with code 'ASE'")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == '__main__':
    print("Creating default teams for ASE Technologies...\n")
    create_default_teams()
