import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
from accounts.models import User, Company
from capital.models import CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService

NAMES = [
    ('Rajesh', 'Kumar'), ('Anita', 'Sharma'), ('Mohan', 'Reddy'), ('Kavitha', 'Nair'),
    ('Sanjay', 'Patel'), ('Pooja', 'Iyer'), ('Vikram', 'Menon'), ('Deepa', 'Pillai'),
    ('Ravi', 'Gupta'), ('Sunita', 'Joshi'), ('Amit', 'Singh'), ('Neha', 'Verma'),
    ('Sunil', 'Rao'), ('Preethi', 'Bose'), ('Ganesh', 'Tiwari'), ('Rekha', 'Das'),
    ('Harish', 'Nambiar'), ('Lalitha', 'Krishnan'), ('Dinesh', 'Choudhary'), ('Usha', 'Mehta'),
    ('Kiran', 'Pillai'), ('Meena', 'Sharma'), ('Arjun', 'Nair'), ('Divya', 'Reddy'),
    ('Prakash', 'Patel'), ('Swathi', 'Iyer'), ('Naveen', 'Kumar'), ('Anjali', 'Gupta'),
    ('Manoj', 'Verma'), ('Sridevi', 'Rao'), ('Rohit', 'Joshi'), ('Padma', 'Singh'),
    ('Vijay', 'Menon'), ('Lakshmi', 'Nair'), ('Suresh', 'Reddy'), ('Geetha', 'Patel'),
    ('Arun', 'Sharma'), ('Priya', 'Iyer'), ('Ramesh', 'Kumar'), ('Kavya', 'Bose'),
    ('Balaji', 'Subramanian'), ('Chitra', 'Venkatesh'), ('Durai', 'Murugan'), ('Ezhil', 'Selvan'),
    ('Fathima', 'Begum'), ('Gopal', 'Krishnamurthy'), ('Hema', 'Sundaram'), ('Ilango', 'Rajan'),
]

CITIES = [
    'Chennai, Tamil Nadu', 'Coimbatore, Tamil Nadu', 'Madurai, Tamil Nadu',
    'Salem, Tamil Nadu', 'Trichy, Tamil Nadu', 'Tirunelveli, Tamil Nadu',
    'Erode, Tamil Nadu', 'Vellore, Tamil Nadu', 'Thanjavur, Tamil Nadu',
    'Bangalore, Karnataka', 'Hyderabad, Telangana', 'Kochi, Kerala',
    'Pondicherry, Puducherry', 'Tiruppur, Tamil Nadu', 'Hosur, Tamil Nadu',
]

BANKS = [
    'SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Canara Bank',
    'Bank of Baroda', 'Punjab National Bank', 'Union Bank', 'Indian Bank',
    'Kotak Mahindra Bank', 'Yes Bank', 'Federal Bank', 'South Indian Bank',
]

BUSINESS_NAMES = [
    'Sri Murugan Traders', 'Lakshmi Enterprises', 'Ganesh Textiles', 'Vel Agencies',
    'Saravana Stores', 'Karthik Industries', 'Priya Fashions', 'Rajan & Sons',
    'Annamalai Constructions', 'Balaji Auto Parts', 'Chandra Medicals', 'Devi Catering',
    'Eswari Jewellers', 'Fathima Boutique', 'Gopal Hardware', 'Hema Sweets',
    'Ilango Transport', 'Jaya Supermarket', 'Kala Textiles', 'Latha Agencies',
]


def phone():
    return f"9{random.randint(100000000, 999999999)}"


def email(first, last):
    return f"{first.lower()}.{last.lower()}{random.randint(1, 99)}@gmail.com"


def days_ago(n):
    return timezone.now() - timedelta(days=n)


class Command(BaseCommand):
    help = 'Seed dummy data for Eswari Capital (customers, leads, tasks, loans, services)'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing capital data first')

    def handle(self, *args, **options):
        try:
            company = Company.objects.get(code='ESWARI_CAP')
        except Company.DoesNotExist:
            self.stderr.write(self.style.ERROR(
                'Eswari Capital company not found. Create a company with code=ESWARI_CAP first.'
            ))
            return

        if options['clear']:
            CapitalService.objects.filter(company=company).delete()
            CapitalLoan.objects.filter(company=company).delete()
            CapitalTask.objects.filter(company=company).delete()
            CapitalLead.objects.filter(company=company).delete()
            CapitalCustomer.objects.filter(company=company).delete()
            self.stdout.write('Cleared existing capital data.')

        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            users = list(User.objects.filter(is_superuser=True))
        if not users:
            self.stderr.write(self.style.ERROR('No users found to assign records to.'))
            return

        admin_user = users[0]

        self._seed_customers(company, users, admin_user)
        leads = self._seed_leads(company, users, admin_user)
        self._seed_tasks(company, users, admin_user, leads)
        self._seed_loans(company, users, admin_user)
        self._seed_services(company, users, admin_user)

        self.stdout.write(self.style.SUCCESS('Eswari Capital dummy data seeded successfully.'))

    # ── Customers ──────────────────────────────────────────────────────────
    def _seed_customers(self, company, users, admin_user):
        statuses = ['pending', 'answered', 'not_answered', 'busy', 'not_interested']
        weights = [30, 25, 20, 15, 10]
        to_create = []
        for i in range(60):
            first, last = random.choice(NAMES)
            to_create.append(CapitalCustomer(
                name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.3 else None,
                company_name=random.choice(BUSINESS_NAMES) if random.random() > 0.5 else '',
                call_status=random.choices(statuses, weights=weights)[0],
                notes=random.choice([
                    'Interested in home loan', 'Asked for GST registration details',
                    'Wants MSME certificate', 'Follow up next week', 'Needs ITR filing',
                    'Enquired about business loan', '', '',
                ]),
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                is_converted=False,
                created_at=days_ago(random.randint(0, 120)),
            ))
        CapitalCustomer.objects.bulk_create(to_create, batch_size=100, ignore_conflicts=True)
        self.stdout.write(f'  Created {len(to_create)} customers')

    # ── Leads ──────────────────────────────────────────────────────────────
    def _seed_leads(self, company, users, admin_user):
        statuses = ['new', 'hot', 'warm', 'cold', 'not_interested', 'reminder']
        weights = [25, 20, 20, 15, 10, 10]
        sources = ['referral', 'walk_in', 'call', 'website', 'social_media']
        to_create = []
        for i in range(80):
            first, last = random.choice(NAMES)
            status = random.choices(statuses, weights=weights)[0]
            follow_up = None
            if status in ('reminder', 'warm', 'hot'):
                follow_up = timezone.now() + timedelta(days=random.randint(1, 14))
            to_create.append(CapitalLead(
                name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.25 else '',
                address=f"{random.randint(1, 200)}, {random.choice(CITIES)}",
                status=status,
                source=random.choice(sources),
                description=random.choice([
                    'Interested in home loan for new flat purchase',
                    'Needs GST registration for new business',
                    'Looking for MSME certificate for government tender',
                    'Wants to file ITR for last 2 years',
                    'Enquired about business loan expansion',
                    'Needs gold loan urgently',
                    'Wants GST return filing monthly',
                    'Referred by existing customer',
                    '',
                ]),
                follow_up_date=follow_up,
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                created_at=days_ago(random.randint(0, 90)),
            ))
        CapitalLead.objects.bulk_create(to_create, batch_size=100, ignore_conflicts=True)
        leads = list(CapitalLead.objects.filter(company=company))
        self.stdout.write(f'  Created {len(to_create)} leads')
        return leads

    # ── Tasks ──────────────────────────────────────────────────────────────
    def _seed_tasks(self, company, users, admin_user, leads):
        statuses = ['in_progress', 'completed', 'rejected']
        priorities = ['low', 'medium', 'high', 'urgent']
        titles = [
            'Collect KYC documents', 'Follow up on loan application',
            'Submit GST registration form', 'Verify Aadhaar and PAN',
            'Send loan sanction letter', 'Schedule client meeting',
            'Upload ITR documents', 'Check MSME portal status',
            'Call client for pending docs', 'Prepare loan summary report',
            'Verify bank statement', 'Complete GST filing',
        ]
        to_create = []
        for i in range(50):
            lead = random.choice(leads) if leads and random.random() > 0.3 else None
            due = timezone.now() + timedelta(days=random.randint(-5, 20))
            to_create.append(CapitalTask(
                title=random.choice(titles),
                description='',
                status=random.choices(statuses, weights=[50, 35, 15])[0],
                priority=random.choices(priorities, weights=[15, 40, 30, 15])[0],
                lead=lead,
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                due_date=due,
                created_at=days_ago(random.randint(0, 60)),
            ))
        CapitalTask.objects.bulk_create(to_create, batch_size=100)
        self.stdout.write(f'  Created {len(to_create)} tasks')

    # ── Loans ──────────────────────────────────────────────────────────────
    def _seed_loans(self, company, users, admin_user):
        loan_types = ['personal', 'business', 'home', 'vehicle', 'gold', 'education', 'mortgage']
        type_weights = [25, 20, 20, 15, 10, 5, 5]
        statuses = ['inquiry', 'documents_pending', 'under_review', 'approved', 'disbursed', 'rejected', 'closed']
        status_weights = [20, 20, 15, 15, 15, 10, 5]
        amounts = {
            'personal': (50000, 500000),
            'business': (200000, 5000000),
            'home': (1000000, 10000000),
            'vehicle': (100000, 1500000),
            'gold': (20000, 300000),
            'education': (100000, 2000000),
            'mortgage': (500000, 8000000),
        }
        to_create = []
        for i in range(60):
            first, last = random.choice(NAMES)
            loan_type = random.choices(loan_types, weights=type_weights)[0]
            lo, hi = amounts[loan_type]
            amount = round(random.randint(lo // 1000, hi // 1000) * 1000, -3)
            tenure = random.choice([12, 24, 36, 48, 60, 84, 120, 180, 240])
            rate = round(random.uniform(7.5, 18.0), 2)
            to_create.append(CapitalLoan(
                applicant_name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.3 else None,
                address=f"{random.randint(1, 200)}, {random.choice(CITIES)}",
                loan_type=loan_type,
                loan_amount=amount,
                tenure_months=tenure,
                interest_rate=rate,
                bank_name=random.choice(BANKS),
                status=random.choices(statuses, weights=status_weights)[0],
                notes=random.choice([
                    'Documents submitted', 'Waiting for bank approval',
                    'CIBIL score check pending', 'Property valuation done',
                    'Guarantor required', '', '',
                ]),
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                created_at=days_ago(random.randint(0, 150)),
            ))
        CapitalLoan.objects.bulk_create(to_create, batch_size=100)
        self.stdout.write(f'  Created {len(to_create)} loans')

    # ── Services ──────────────────────────────────────────────────────────
    def _seed_services(self, company, users, admin_user):
        statuses = ['inquiry', 'documents_pending', 'in_progress', 'completed', 'rejected']
        status_weights = [20, 20, 25, 30, 5]
        biz_types = ['proprietor', 'partnership', 'company']
        turnovers = ['below_20l', '20l_1cr', 'above_1cr']
        income_slabs = ['0_5l', '5l_10l', '10l_18l', 'above_18l']
        income_natures = [
            ['salaried'], ['salaried', 'rental'], ['shares'], ['salaried', 'shares'],
            ['rental'], ['salaried', 'shares', 'rental'], ['other'], ['salaried', 'other'],
        ]

        gst_services = [
            'gst_registration', 'gst_filing_monthly', 'gst_filing_quarterly',
            'gst_amendment', 'gst_cancellation', 'lut_filing', 'eway_bill', 'gst_consultation',
        ]
        msme_services = ['msme_registration', 'msme_certificate', 'msme_amendment']
        itr_services = ['itr_filing', 'itr_notice']

        to_create = []

        # GST records (35)
        for i in range(35):
            first, last = random.choice(NAMES)
            svc = random.choice(gst_services)
            has_gst = random.random() > 0.5
            to_create.append(CapitalService(
                client_name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.3 else None,
                business_name=random.choice(BUSINESS_NAMES),
                city_state=random.choice(CITIES),
                service_type=svc,
                status=random.choices(statuses, weights=status_weights)[0],
                business_type=random.choice(biz_types),
                turnover_range=random.choice(turnovers),
                existing_gst_number=has_gst,
                gstin=f"33{random.randint(10000000000000, 99999999999999)}" if has_gst else '',
                pan_number=f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}{random.randint(1000, 9999)}{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
                financial_year=random.choice(['2023-24', '2024-25']),
                notes=random.choice(['Documents received', 'Pending Aadhaar copy', 'Filed successfully', '', '']),
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                created_at=days_ago(random.randint(0, 120)),
            ))

        # MSME records (20)
        for i in range(20):
            first, last = random.choice(NAMES)
            svc = random.choice(msme_services)
            has_msme = random.random() > 0.6
            to_create.append(CapitalService(
                client_name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.3 else None,
                business_name=random.choice(BUSINESS_NAMES),
                city_state=random.choice(CITIES),
                service_type=svc,
                status=random.choices(statuses, weights=status_weights)[0],
                business_type=random.choice(biz_types),
                existing_msme_number=has_msme,
                udyam_number=f"UDYAM-TN-{random.randint(10, 99)}-{random.randint(1000000, 9999999)}" if has_msme else '',
                pan_number=f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}{random.randint(1000, 9999)}{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
                notes=random.choice(['Udyam portal registered', 'Certificate downloaded', 'Amendment pending', '', '']),
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                created_at=days_ago(random.randint(0, 120)),
            ))

        # ITR records (25)
        for i in range(25):
            first, last = random.choice(NAMES)
            svc = random.choice(itr_services)
            dob = date(
                random.randint(1965, 1998),
                random.randint(1, 12),
                random.randint(1, 28),
            )
            to_create.append(CapitalService(
                client_name=f"{first} {last}",
                phone=phone(),
                email=email(first, last) if random.random() > 0.25 else None,
                city_state=random.choice(CITIES),
                service_type=svc,
                status=random.choices(statuses, weights=status_weights)[0],
                date_of_birth=dob,
                income_nature=random.choice(income_natures),
                income_slab=random.choice(income_slabs),
                pan_number=f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}{random.randint(1000, 9999)}{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
                financial_year=random.choice(['2022-23', '2023-24', '2024-25']),
                notes=random.choice(['Form 16 received', 'Waiting for Form 26AS', 'Filed and acknowledged', 'Notice reply submitted', '', '']),
                company=company,
                assigned_to=random.choice(users),
                created_by=admin_user,
                created_at=days_ago(random.randint(0, 120)),
            ))

        CapitalService.objects.bulk_create(to_create, batch_size=100)
        self.stdout.write(f'  Created {len(to_create)} services (GST/MSME/ITR)')
