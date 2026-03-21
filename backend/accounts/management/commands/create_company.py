"""
Management command to create a new company.

Usage:
    python manage.py create_company --name "ASE Technologies" --code ASE
    python manage.py create_company --name "New Company" --code NEWCO --inactive
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from accounts.models import Company


class Command(BaseCommand):
    help = 'Create a new company in the system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='Company name (must be unique)'
        )
        parser.add_argument(
            '--code',
            type=str,
            required=True,
            help='Company code (must be unique, will be converted to uppercase)'
        )
        parser.add_argument(
            '--inactive',
            action='store_true',
            help='Create company as inactive (default is active)'
        )
    
    def handle(self, *args, **options):
        name = options['name'].strip()
        code = options['code'].strip().upper()
        is_active = not options['inactive']
        
        # Validate inputs
        if not name:
            raise CommandError('Company name cannot be empty')
        
        if not code:
            raise CommandError('Company code cannot be empty')
        
        if len(code) > 50:
            raise CommandError('Company code must be 50 characters or less')
        
        if len(name) > 200:
            raise CommandError('Company name must be 200 characters or less')
        
        # Check for existing company with same code or name
        if Company.objects.filter(code=code).exists():
            raise CommandError(
                f'Company with code "{code}" already exists. '
                f'Use list_companies command to see existing companies.'
            )
        
        if Company.objects.filter(name=name).exists():
            raise CommandError(
                f'Company with name "{name}" already exists. '
                f'Use list_companies command to see existing companies.'
            )
        
        # Display company details
        self.stdout.write(self.style.NOTICE('\nCompany Details:'))
        self.stdout.write(f'  Name: {name}')
        self.stdout.write(f'  Code: {code}')
        self.stdout.write(f'  Status: {"Active" if is_active else "Inactive"}')
        
        # Confirm creation
        if not options.get('verbosity', 1) == 0:
            confirm = input('\nCreate this company? [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write(self.style.WARNING('Company creation cancelled'))
                return
        
        # Create company
        try:
            company = Company.objects.create(
                name=name,
                code=code,
                is_active=is_active
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully created company: {company.name} (ID: {company.id})'
                )
            )
            
            # Display next steps
            self.stdout.write(self.style.NOTICE('\nNext steps:'))
            self.stdout.write(
                f'  - Assign users: python manage.py assign_company --company-code {code} --user-ids 1,2,3'
            )
            self.stdout.write(
                f'  - View companies: python manage.py list_companies'
            )
            
        except IntegrityError as e:
            raise CommandError(f'Failed to create company: {str(e)}')
