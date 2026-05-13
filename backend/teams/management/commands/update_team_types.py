"""
Management command to update team types:
- Change 'sales' teams to 'marketing'
- Change 'support' teams to 'marketing'
"""
from django.core.management.base import BaseCommand
from teams.models import Team


class Command(BaseCommand):
    help = 'Update team types: combine sales and support into marketing'

    def handle(self, *args, **options):
        # Update sales teams to marketing
        sales_teams = Team.objects.filter(team_type='sales')
        sales_count = sales_teams.count()
        sales_teams.update(team_type='marketing')
        
        self.stdout.write(
            self.style.SUCCESS(f'Updated {sales_count} sales teams to marketing')
        )
        
        # Update support teams to marketing
        support_teams = Team.objects.filter(team_type='support')
        support_count = support_teams.count()
        support_teams.update(team_type='marketing')
        
        self.stdout.write(
            self.style.SUCCESS(f'Updated {support_count} support teams to marketing')
        )
        
        # Show summary
        self.stdout.write(
            self.style.SUCCESS(f'\nTotal teams updated: {sales_count + support_count}')
        )
        
        # Show current team distribution
        self.stdout.write('\nCurrent team distribution:')
        for team_type, display_name in Team.TEAM_TYPE_CHOICES:
            count = Team.objects.filter(team_type=team_type).count()
            if count > 0:
                self.stdout.write(f'  {display_name}: {count} teams')
