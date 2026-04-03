import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Company
from ase_customers.models import ASECustomer

COMPANY_NAMES = [
    'TechNova Solutions', 'GreenLeaf Organics', 'BuildRight Constructions', 'MediCare Clinics',
    'EduSpark Academy', 'StyleHub Fashion', 'AutoDrive Motors', 'FinEdge Advisors',
    'HotelLux Resorts', 'FitZone Gym', 'RetailMart Stores', 'CloudSoft Technologies',
    'PrimeRealty Group', 'NutriLife Foods', 'BrightMinds School', 'LuxeWear Boutique',
    'SpeedCar Dealers', 'WealthPro Finance', 'SunStay Hotels', 'PowerFit Studio',
    'DataBridge Systems', 'AquaPure Industries', 'SkyHigh Aviation', 'GoldMine Jewellers',
    'FreshFarm Produce', 'UrbanNest Interiors', 'SwiftLogistics Co', 'BioHealth Labs',
    'ClearVision Optics', 'StarMedia Productions', 'IronForge Manufacturing', 'PeakPerform Sports',
    'CoastalBreeze Resorts', 'DigiMark Agency', 'SafeGuard Security', 'EcoGreen Energy',
    'MegaMall Retail', 'ProLegal Services', 'SmartHome Tech', 'VitalCare Pharmacy',
]

NAMES = [
    ('Rajesh', 'Gupta'), ('Anita', 'Singh'), ('Mohan', 'Das'), ('Kavitha', 'Rao'),
    ('Sanjay', 'Mehta'), ('Pooja', 'Sharma'), ('Vikram', 'Nair'), ('Deepa', 'Pillai'),
    ('Ravi', 'Kumar'), ('Sunita', 'Joshi'), ('Amit', 'Patel'), ('Neha', 'Verma'),
    ('Sunil', 'Reddy'), ('Preethi', 'Iyer'), ('Ganesh', 'Menon'), ('Rekha', 'Bose'),
    ('Harish', 'Tiwari'), ('Lalitha', 'Nambiar'), ('Dinesh', 'Choudhary'), ('Usha', 'Krishnan'),
    ('Kiran', 'Rao'), ('Meena', 'Pillai'), ('Arjun', 'Sharma'), ('Divya', 'Nair'),
    ('Prakash', 'Iyer'), ('Swathi', 'Menon'), ('Naveen', 'Reddy'), ('Anjali', 'Patel'),
    ('Manoj', 'Verma'), ('Sridevi', 'Kumar'), ('Rohit', 'Joshi'), ('Padma', 'Bose'),
]

SERVICES = ['seo', 'ppc', 'social_media', 'content_marketing', 'email_marketing',
            'web_design', 'analytics', 'branding', 'video_marketing', 'influencer']

CALL_STATUSES = ['pending', 'answered', 'not_answered', 'busy', 'not_interested']
CALL_STATUS_WEIGHTS = [30, 35, 15, 10, 10]


class Command(BaseCommand):
    help = 'Seed 500 ASE customers for ASE Technologies company'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=500)

    def handle(self, *args, **options):
        count = options['count']

        try:
            company = Company.objects.get(code='ASE')
        except Company.DoesNotExist:
            self.stderr.write('ASE Technologies company not found (code=ASE)')
            return

        # Get users assigned to ASE company for assigned_to / created_by
        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            # Fall back to any admin
            users = list(User.objects.filter(is_superuser=True))
        if not users:
            self.stderr.write('No users found to assign customers to')
            return

        now = timezone.now()
        to_create = []

        for i in range(count):
            first, last = random.choice(NAMES)
            name = f"{first} {last}"
            company_name = random.choice(COMPANY_NAMES)
            phone = f"9{random.randint(100000000, 999999999)}"
            email = f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@{company_name.lower().replace(' ', '')}.com"
            call_status = random.choices(CALL_STATUSES, weights=CALL_STATUS_WEIGHTS)[0]
            services = random.sample(SERVICES, k=random.randint(1, 3))
            assigned = random.choice(users)

            # Scheduled date: some past, some future
            days_offset = random.randint(-60, 30)
            scheduled = now + timedelta(days=days_offset)

            # Call date: only if answered/not_answered/busy
            call_date = None
            if call_status in ('answered', 'not_answered', 'busy'):
                call_date = now - timedelta(days=random.randint(1, 60))

            notes_options = [
                'Interested in monthly retainer package.',
                'Requested proposal for SEO services.',
                'Follow up next week.',
                'Decision maker not available, call back.',
                'Very interested, needs pricing details.',
                'Currently working with another agency.',
                'Budget approved, waiting for contract.',
                '',
            ]

            to_create.append(ASECustomer(
                name=name,
                phone=phone,
                email=email,
                company_name=company_name,
                call_status=call_status,
                company=company,
                assigned_to=assigned,
                created_by=assigned,
                scheduled_date=scheduled,
                call_date=call_date,
                service_interests=services,
                notes=random.choice(notes_options),
                is_converted=False,
                created_at=now - timedelta(days=random.randint(0, 180)),
            ))

        ASECustomer.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} ASE customers'))
