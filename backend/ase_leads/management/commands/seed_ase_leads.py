import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Company
from ase_leads.models import ASELead

COMPANIES = [
    ('TechNova Solutions', 'technology', ['seo', 'ppc', 'analytics']),
    ('GreenLeaf Organics', 'food_beverage', ['social_media', 'content_marketing']),
    ('BuildRight Constructions', 'real_estate', ['seo', 'web_design']),
    ('MediCare Clinics', 'healthcare', ['social_media', 'email_marketing']),
    ('EduSpark Academy', 'education', ['content_marketing', 'seo']),
    ('StyleHub Fashion', 'fashion', ['social_media', 'influencer']),
    ('AutoDrive Motors', 'automotive', ['ppc', 'video_marketing']),
    ('FinEdge Advisors', 'finance', ['seo', 'email_marketing', 'analytics']),
    ('HotelLux Resorts', 'hospitality', ['social_media', 'branding']),
    ('FitZone Gym', 'sports_fitness', ['social_media', 'video_marketing']),
    ('RetailMart Stores', 'retail', ['ppc', 'email_marketing']),
    ('CloudSoft Technologies', 'technology', ['seo', 'content_marketing', 'analytics']),
    ('PrimeRealty Group', 'real_estate', ['seo', 'ppc', 'web_design']),
    ('NutriLife Foods', 'food_beverage', ['social_media', 'influencer']),
    ('BrightMinds School', 'education', ['seo', 'social_media']),
    ('LuxeWear Boutique', 'fashion', ['branding', 'social_media']),
    ('SpeedCar Dealers', 'automotive', ['ppc', 'web_design']),
    ('WealthPro Finance', 'finance', ['email_marketing', 'content_marketing']),
    ('SunStay Hotels', 'hospitality', ['seo', 'social_media']),
    ('PowerFit Studio', 'sports_fitness', ['social_media', 'video_marketing']),
]

CONTACTS = [
    ('Rajesh', 'Gupta'), ('Anita', 'Singh'), ('Mohan', 'Das'), ('Kavitha', 'Rao'),
    ('Sanjay', 'Mehta'), ('Pooja', 'Sharma'), ('Vikram', 'Nair'), ('Deepa', 'Pillai'),
    ('Ravi', 'Kumar'), ('Sunita', 'Joshi'), ('Amit', 'Patel'), ('Neha', 'Verma'),
    ('Sunil', 'Reddy'), ('Preethi', 'Iyer'), ('Ganesh', 'Menon'), ('Rekha', 'Bose'),
    ('Harish', 'Tiwari'), ('Lalitha', 'Nambiar'), ('Dinesh', 'Choudhary'), ('Usha', 'Krishnan'),
]

STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'nurturing']
PRIORITIES = ['low', 'medium', 'medium', 'high', 'urgent']
BUDGETS = ['₹10,000-25,000', '₹25,000-50,000', '₹50,000-1,00,000', '₹1,00,000+', '₹5,000-10,000']
SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Google Ads', 'Trade Show']
GOALS = [
    'Increase brand awareness and online visibility',
    'Generate more qualified leads through digital channels',
    'Improve search engine rankings for target keywords',
    'Grow social media following and engagement',
    'Launch new product with digital marketing campaign',
    'Reduce cost per acquisition and improve ROI',
]


class Command(BaseCommand):
    help = 'Seed dummy ASE leads for ASE Technologies users'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=50, help='Number of leads to create (default: 50)')
        parser.add_argument('--clear', action='store_true', help='Clear existing seeded leads first')

    def handle(self, *args, **kwargs):
        count = kwargs['count']
        clear = kwargs['clear']

        try:
            company = Company.objects.get(code='ASE')
        except Company.DoesNotExist:
            self.stderr.write('ASE company not found.')
            return

        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            self.stderr.write('No active users found for ASE company. Run seed_ase_users first.')
            return

        if clear:
            deleted, _ = ASELead.objects.filter(company=company, notes__startswith='[seeded]').delete()
            self.stdout.write(f'Cleared {deleted} existing seeded leads.')

        created = 0
        existing_phones = set(ASELead.objects.filter(company=company).values_list('phone', flat=True))

        for i in range(count):
            comp_name, industry, services = random.choice(COMPANIES)
            # Make company name unique by appending index
            unique_company_name = f"{comp_name} {i+1}"
            first, last = random.choice(CONTACTS)
            phone = f"9{random.randint(100000000, 999999999)}"

            # Skip duplicate phones
            if phone in existing_phones:
                continue
            existing_phones.add(phone)

            assigned = random.choice(users)
            creator = random.choice(users)
            status = random.choice(STATUSES)
            now = timezone.now()
            created_at_offset = now - timedelta(days=random.randint(1, 180))

            lead = ASELead(
                company_name=unique_company_name,
                contact_person=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}@{unique_company_name.lower().replace(' ', '')}.com",
                phone=phone,
                website=f"https://www.{unique_company_name.lower().replace(' ', '')}.com",
                industry=industry,
                company_size=random.choice(['1-10', '11-50', '51-200', '201-500']),
                service_interests=services,
                budget_amount=random.choice(BUDGETS),
                has_website=random.choice([True, True, False]),
                has_social_media=random.choice([True, False]),
                marketing_goals=random.choice(GOALS),
                lead_source=random.choice(SOURCES),
                status=status,
                priority=random.choice(PRIORITIES),
                company=company,
                assigned_to=assigned,
                created_by=creator,
                estimated_project_value=random.choice([15000, 30000, 50000, 75000, 100000, 150000, None]),
                monthly_retainer=random.choice([5000, 10000, 15000, 25000, None]),
                notes=f'[seeded] Auto-generated dummy lead #{i+1}',
            )
            lead.save()
            # Manually set created_at after save
            ASELead.objects.filter(pk=lead.pk).update(created_at=created_at_offset)
            created += 1

        self.stdout.write(self.style.SUCCESS(f'Done. Created {created} dummy leads for ASE Technologies.'))
