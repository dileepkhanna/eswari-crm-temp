from django.core.management.base import BaseCommand
from accounts.models import User, Company

class Command(BaseCommand):
    help = 'Check employee company assignments'

    def handle(self, *args, **options):
        self.stdout.write('\n=== Companies ===')
        for c in Company.objects.all():
            self.stdout.write(f'  {c.id}: {c.name} ({c.code})')

        self.stdout.write('\n=== Users by company ===')
        for u in User.objects.all().order_by('company_id', 'email'):
            company_name = u.company.name if u.company else "None"
            self.stdout.write(f'  Company {u.company_id} ({company_name}): {u.email}')

        self.stdout.write('\n=== Employee count by company ===')
        for c in Company.objects.all():
            count = User.objects.filter(company=c).count()
            self.stdout.write(f'  {c.name}: {count} employees')
        
        no_company_count = User.objects.filter(company__isnull=True).count()
        self.stdout.write(f'  No Company: {no_company_count} employees')
