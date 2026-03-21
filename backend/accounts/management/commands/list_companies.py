"""
Management command to list all companies in the system.

Usage:
    python manage.py list_companies
    python manage.py list_companies --active-only
"""
from django.core.management.base import BaseCommand
from accounts.models import Company


class Command(BaseCommand):
    help = 'List all companies in the system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--active-only',
            action='store_true',
            help='Show only active companies'
        )
    
    def handle(self, *args, **options):
        # Get companies based on filter
        if options['active_only']:
            companies = Company.objects.filter(is_active=True)
            self.stdout.write(self.style.NOTICE('\nActive Companies:\n'))
        else:
            companies = Company.objects.all()
            self.stdout.write(self.style.NOTICE('\nAll Companies:\n'))
        
        if not companies.exists():
            self.stdout.write(self.style.WARNING('No companies found'))
            return
        
        # Display header
        self.stdout.write(
            f"{'ID':<5} {'Code':<15} {'Name':<30} {'Active':<10} {'Users':<10}"
        )
        self.stdout.write('-' * 70)
        
        # Display each company
        for company in companies:
            user_count = company.users.count()
            status = self.style.SUCCESS('Yes') if company.is_active else self.style.ERROR('No')
            
            self.stdout.write(
                f"{company.id:<5} {company.code:<15} {company.name:<30} {status:<10} {user_count:<10}"
            )
        
        # Display summary
        total = companies.count()
        active = companies.filter(is_active=True).count()
        inactive = total - active
        
        self.stdout.write('\n' + '-' * 70)
        self.stdout.write(
            f"Total: {total} companies ({active} active, {inactive} inactive)"
        )
