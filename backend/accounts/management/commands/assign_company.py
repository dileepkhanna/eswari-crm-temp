"""
Management command to assign users to a specific company.

Usage:
    python manage.py assign_company --company-code ESWARI --user-ids 1,2,3
    python manage.py assign_company --company-code ASE --all-unassigned
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from accounts.models import Company

User = get_user_model()


class Command(BaseCommand):
    help = 'Assign users to a specific company'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--company-code',
            type=str,
            required=True,
            help='Company code to assign users to (e.g., ESWARI, ASE)'
        )
        parser.add_argument(
            '--user-ids',
            type=str,
            help='Comma-separated list of user IDs to assign'
        )
        parser.add_argument(
            '--all-unassigned',
            action='store_true',
            help='Assign all users without a company assignment'
        )
    
    def handle(self, *args, **options):
        company_code = options['company_code'].upper()
        
        # Validate company exists
        try:
            company = Company.objects.get(code=company_code)
        except Company.DoesNotExist:
            raise CommandError(
                f'Company with code "{company_code}" does not exist. '
                f'Use list_companies command to see available companies.'
            )
        
        # Determine which users to assign
        if options['user_ids']:
            # Parse user IDs from comma-separated string
            try:
                user_ids = [int(id.strip()) for id in options['user_ids'].split(',')]
            except ValueError:
                raise CommandError('Invalid user IDs format. Use comma-separated integers (e.g., 1,2,3)')
            
            users = User.objects.filter(id__in=user_ids)
            
            # Check if all requested users exist
            found_ids = set(users.values_list('id', flat=True))
            missing_ids = set(user_ids) - found_ids
            if missing_ids:
                self.stdout.write(
                    self.style.WARNING(
                        f'Warning: Users with IDs {sorted(missing_ids)} not found'
                    )
                )
        
        elif options['all_unassigned']:
            users = User.objects.filter(company__isnull=True)
        
        else:
            raise CommandError(
                'Must specify either --user-ids or --all-unassigned'
            )
        
        # Check if any users found
        count = users.count()
        if count == 0:
            self.stdout.write(
                self.style.WARNING('No users found to assign')
            )
            return
        
        # Display users to be assigned
        self.stdout.write(
            self.style.NOTICE(f'\nUsers to be assigned to {company.name}:')
        )
        for user in users:
            current_company = user.company.name if user.company else 'None'
            self.stdout.write(
                f'  - {user.username} (ID: {user.id}, Current: {current_company})'
            )
        
        # Confirm assignment
        if not options.get('verbosity', 1) == 0:
            confirm = input(f'\nAssign {count} user(s) to {company.name}? [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write(self.style.WARNING('Assignment cancelled'))
                return
        
        # Perform assignment
        users.update(company=company)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully assigned {count} user(s) to {company.name}'
            )
        )
