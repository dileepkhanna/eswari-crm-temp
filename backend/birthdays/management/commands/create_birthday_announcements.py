from django.core.management.base import BaseCommand
from birthdays.services import BirthdayAnnouncementService

class Command(BaseCommand):
    help = 'Create birthday announcements for today\'s birthdays'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating announcements',
        )
    
    def handle(self, *args, **options):
        service = BirthdayAnnouncementService()
        
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No announcements will be created')
            )
            # TODO: Add dry run logic to show what would be created
            return
        
        try:
            created_announcements = service.create_daily_birthday_announcements()
            
            if created_announcements:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created {len(created_announcements)} birthday announcements:'
                    )
                )
                for announcement in created_announcements:
                    self.stdout.write(f"  - {announcement['employee']}")
            else:
                self.stdout.write(
                    self.style.WARNING('No birthday announcements needed today')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating birthday announcements: {e}')
            )