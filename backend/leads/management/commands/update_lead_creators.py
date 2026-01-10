from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from leads.models import Lead

User = get_user_model()

class Command(BaseCommand):
    help = 'Update existing leads to have created_by values'

    def handle(self, *args, **options):
        # Get the first admin user to assign as creator for existing leads
        admin_user = User.objects.filter(role='admin').first()
        
        if not admin_user:
            self.stdout.write(self.style.ERROR('No admin user found'))
            return
        
        # Update leads that don't have created_by set
        leads_without_creator = Lead.objects.filter(created_by__isnull=True)
        count = leads_without_creator.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('All leads already have creators assigned'))
            return
        
        # Assign the admin user as creator for existing leads
        leads_without_creator.update(created_by=admin_user)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {count} leads with creator: {admin_user.username}'
            )
        )