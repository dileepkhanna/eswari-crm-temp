import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Company
from leads.models import Lead

NAMES = [
    ('Rajesh', 'Gupta'), ('Anita', 'Singh'), ('Mohan', 'Das'), ('Kavitha', 'Rao'),
    ('Sanjay', 'Mehta'), ('Pooja', 'Sharma'), ('Vikram', 'Nair'), ('Deepa', 'Pillai'),
    ('Ravi', 'Kumar'), ('Sunita', 'Joshi'), ('Amit', 'Patel'), ('Neha', 'Verma'),
    ('Sunil', 'Reddy'), ('Preethi', 'Iyer'), ('Ganesh', 'Menon'), ('Rekha', 'Bose'),
    ('Harish', 'Tiwari'), ('Lalitha', 'Nambiar'), ('Dinesh', 'Choudhary'), ('Usha', 'Krishnan'),
    ('Kiran', 'Rao'), ('Meena', 'Pillai'), ('Arjun', 'Sharma'), ('Divya', 'Nair'),
    ('Prakash', 'Iyer'), ('Swathi', 'Menon'), ('Naveen', 'Reddy'), ('Anjali', 'Patel'),
    ('Manoj', 'Verma'), ('Sridevi', 'Kumar'), ('Rohit', 'Joshi'), ('Padma', 'Bose'),
    ('Vijay', 'Pillai'), ('Lakshmi', 'Rao'), ('Suresh', 'Nair'), ('Geetha', 'Menon'),
    ('Arun', 'Sharma'), ('Priya', 'Iyer'), ('Ramesh', 'Reddy'), ('Kavya', 'Patel'),
]

LOCATIONS = [
    'Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Jayanagar',
    'Bannerghatta Road', 'Electronic City', 'Marathahalli', 'Sarjapur Road',
    'Hebbal', 'Yelahanka', 'JP Nagar', 'BTM Layout', 'Bellandur', 'Varthur',
]

SOURCES = ['website', 'referral', 'social_media', 'advertisement', 'walk_in', 'phone']
STATUSES = ['new', 'hot', 'warm', 'cold', 'not_interested', 'reminder']
STATUS_WEIGHTS = [30, 20, 20, 15, 10, 5]
REQ_TYPES = ['apartment', 'villa', 'house', 'plot']
BHK = ['1', '2', '3', '4', '5+']


class Command(BaseCommand):
    help = 'Seed 500 leads for Eswari Group company'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=500)

    def handle(self, *args, **options):
        count = options['count']

        try:
            company = Company.objects.get(code='ESWARI')
        except Company.DoesNotExist:
            self.stderr.write('Eswari Group company not found (code=ESWARI)')
            return

        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            users = list(User.objects.filter(is_superuser=True))
        if not users:
            self.stderr.write('No users found')
            return

        now = timezone.now()
        to_create = []

        for i in range(count):
            first, last = random.choice(NAMES)
            name = f"{first} {last}"
            phone = f"9{random.randint(100000000, 999999999)}"
            email = f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@gmail.com"
            status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
            req_type = random.choice(REQ_TYPES)
            bhk = random.choice(BHK)
            location = random.choice(LOCATIONS)
            source = random.choice(SOURCES)
            assigned = random.choice(users)

            budget_min = random.choice([2000000, 3000000, 4000000, 5000000, 7500000, 10000000])
            budget_max = budget_min + random.choice([500000, 1000000, 2000000, 3000000])

            follow_up = None
            if status in ('reminder', 'warm'):
                follow_up = now + timedelta(days=random.randint(1, 30))

            to_create.append(Lead(
                name=name,
                phone=phone,
                email=email,
                address=f"{random.randint(1, 200)}, {location}, Bangalore",
                requirement_type=req_type,
                bhk_requirement=bhk,
                budget_min=budget_min,
                budget_max=budget_max,
                preferred_location=location,
                status=status,
                source=source,
                description=f"Looking for {bhk} BHK {req_type} in {location}.",
                company=company,
                assigned_to=assigned,
                created_by=assigned,
                follow_up_date=follow_up,
                created_at=now - timedelta(days=random.randint(0, 180)),
            ))

        Lead.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} Eswari Group leads'))
