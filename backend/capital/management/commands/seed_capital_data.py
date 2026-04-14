"""
Management command to seed dummy data for Eswari Capital loans and services
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User, Company
from capital.models import CapitalLoan, CapitalService
from faker import Faker
import random
from decimal import Decimal

fake = Faker('en_IN')  # Indian locale for realistic data


class Command(BaseCommand):
    help = 'Seed dummy data for Eswari Capital loans and services'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loans',
            type=int,
            default=50,
            help='Number of loans to create (default: 50)'
        )
        parser.add_argument(
            '--services',
            type=int,
            default=50,
            help='Number of services to create (default: 50)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing loans and services before seeding'
        )

    def handle(self, *args, **options):
        num_loans = options['loans']
        num_services = options['services']
        clear_existing = options['clear']

        # Get Eswari Capital company
        try:
            company = Company.objects.get(code='ESWARI_CAP')
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR('Eswari Capital company not found. Please create it first.'))
            return

        # Get users from the company
        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            self.stdout.write(self.style.ERROR('No active users found in Eswari Capital company.'))
            return

        # Clear existing data if requested
        if clear_existing:
            deleted_loans = CapitalLoan.objects.filter(company=company).delete()[0]
            deleted_services = CapitalService.objects.filter(company=company).delete()[0]
            self.stdout.write(self.style.WARNING(f'Cleared {deleted_loans} loans and {deleted_services} services'))

        # Seed Loans
        self.stdout.write(self.style.SUCCESS(f'\nCreating {num_loans} loans...'))
        loans_created = 0
        
        loan_types = ['personal', 'home', 'business', 'vehicle', 'education', 'gold', 'property']
        loan_statuses = ['inquiry', 'documentation', 'processing', 'approved', 'disbursed', 'rejected', 'closed']
        banks = [
            'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
            'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IDFC First Bank'
        ]

        for i in range(num_loans):
            try:
                loan_type = random.choice(loan_types)
                assigned_user = random.choice(users)
                created_by = random.choice(users)
                
                # Generate unique phone number
                phone = fake.phone_number()[:15]
                
                # Check if this combination already exists
                while CapitalLoan.objects.filter(phone=phone, loan_type=loan_type, company=company).exists():
                    phone = fake.phone_number()[:15]
                
                loan_amount = Decimal(random.randint(100000, 10000000))
                tenure_months = random.choice([12, 24, 36, 48, 60, 84, 120, 180, 240])
                
                loan = CapitalLoan.objects.create(
                    applicant_name=fake.name(),
                    phone=phone,
                    email=fake.email() if random.random() > 0.3 else None,
                    loan_type=loan_type,
                    loan_amount=loan_amount,
                    tenure_months=tenure_months,
                    bank_name=random.choice(banks),
                    status=random.choice(loan_statuses),
                    notes=fake.sentence() if random.random() > 0.5 else '',
                    assigned_to=assigned_user,
                    created_by=created_by,
                    company=company
                )
                loans_created += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f'  Created {i + 1}/{num_loans} loans...')
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Failed to create loan {i + 1}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'✓ Successfully created {loans_created} loans'))

        # Seed Services
        self.stdout.write(self.style.SUCCESS(f'\nCreating {num_services} services...'))
        services_created = 0
        
        service_types = [
            'gst_registration', 'gst_filing', 'income_tax_filing', 'tds_filing',
            'company_registration', 'trademark', 'msme_registration', 'accounting'
        ]
        service_statuses = ['inquiry', 'documentation', 'processing', 'completed', 'on_hold', 'cancelled']
        business_types = ['proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'other']
        income_slabs = ['below_5l', '5l_10l', '10l_25l', '25l_50l', 'above_50l']
        turnover_ranges = ['below_20l', '20l_40l', '40l_1cr', '1cr_5cr', '5cr_10cr', 'above_10cr']
        financial_years = ['2023-24', '2024-25', '2025-26']

        for i in range(num_services):
            try:
                service_type = random.choice(service_types)
                financial_year = random.choice(financial_years)
                assigned_user = random.choice(users)
                created_by = random.choice(users)
                
                # Generate unique phone number
                phone = fake.phone_number()[:15]
                
                # Check if this combination already exists
                while CapitalService.objects.filter(
                    phone=phone, 
                    service_type=service_type, 
                    financial_year=financial_year,
                    company=company
                ).exists():
                    phone = fake.phone_number()[:15]
                
                service = CapitalService.objects.create(
                    client_name=fake.name(),
                    phone=phone,
                    email=fake.email() if random.random() > 0.3 else None,
                    pan_number=fake.bothify(text='?????####?').upper() if random.random() > 0.4 else '',
                    business_name=fake.company() if random.random() > 0.5 else '',
                    gstin=fake.bothify(text='##???#####?#?#').upper() if random.random() > 0.6 else '',
                    service_type=service_type,
                    financial_year=financial_year,
                    business_type=random.choice(business_types) if random.random() > 0.3 else '',
                    income_slab=random.choice(income_slabs) if random.random() > 0.4 else '',
                    turnover_range=random.choice(turnover_ranges) if random.random() > 0.4 else '',
                    status=random.choice(service_statuses),
                    notes=fake.sentence() if random.random() > 0.5 else '',
                    assigned_to=assigned_user,
                    created_by=created_by,
                    company=company
                )
                services_created += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f'  Created {i + 1}/{num_services} services...')
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Failed to create service {i + 1}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'✓ Successfully created {services_created} services'))

        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('SEEDING COMPLETE'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Company: {company.name}')
        self.stdout.write(f'Loans created: {loans_created}/{num_loans}')
        self.stdout.write(f'Services created: {services_created}/{num_services}')
        self.stdout.write(self.style.SUCCESS('='*60))
