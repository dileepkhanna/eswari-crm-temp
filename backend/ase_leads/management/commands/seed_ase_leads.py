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
    ('DataBridge Systems', 'technology', ['analytics', 'seo', 'content_marketing']),
    ('AquaPure Industries', 'manufacturing', ['web_design', 'seo']),
    ('SkyHigh Aviation', 'other', ['branding', 'social_media']),
    ('GoldMine Jewellers', 'retail', ['social_media', 'influencer', 'branding']),
    ('FreshFarm Produce', 'food_beverage', ['seo', 'social_media']),
    ('UrbanNest Interiors', 'real_estate', ['social_media', 'video_marketing']),
    ('SwiftLogistics Co', 'other', ['seo', 'email_marketing']),
    ('BioHealth Labs', 'healthcare', ['content_marketing', 'seo', 'email_marketing']),
    ('ClearVision Optics', 'healthcare', ['social_media', 'ppc']),
    ('StarMedia Productions', 'entertainment', ['social_media', 'video_marketing', 'branding']),
    ('IronForge Manufacturing', 'manufacturing', ['web_design', 'content_marketing']),
    ('PeakPerform Sports', 'sports_fitness', ['social_media', 'influencer']),
    ('CoastalBreeze Resorts', 'hospitality', ['seo', 'social_media', 'branding']),
    ('DigiMark Agency', 'professional_services', ['seo', 'ppc', 'analytics']),
    ('SafeGuard Security', 'other', ['web_design', 'seo']),
    ('EcoGreen Energy', 'other', ['content_marketing', 'social_media']),
    ('MegaMall Retail', 'retail', ['ppc', 'email_marketing', 'analytics']),
    ('ProLegal Services', 'professional_services', ['seo', 'content_marketing']),
    ('SmartHome Tech', 'technology', ['social_media', 'video_marketing', 'ppc']),
    ('VitalCare Pharmacy', 'healthcare', ['seo', 'email_marketing']),
    ('BlueOcean Logistics', 'other', ['web_design', 'email_marketing']),
    ('SilverLine Finance', 'finance', ['seo', 'content_marketing', 'analytics']),
    ('NeonBrand Studio', 'professional_services', ['branding', 'social_media']),
    ('ZenithIT Services', 'technology', ['seo', 'ppc', 'analytics']),
    ('HarvestMoon Farms', 'food_beverage', ['social_media', 'content_marketing']),
    ('ApexAuto Parts', 'automotive', ['seo', 'ppc']),
    ('CrystalClear Windows', 'manufacturing', ['web_design', 'seo']),
    ('MindfulLearn Ed', 'education', ['content_marketing', 'social_media', 'email_marketing']),
    ('UrbanPulse Clothing', 'fashion', ['social_media', 'influencer', 'branding']),
    ('NextGen Software', 'technology', ['seo', 'content_marketing', 'ppc']),
]

CONTACTS = [
    ('Rajesh', 'Gupta'), ('Anita', 'Singh'), ('Mohan', 'Das'), ('Kavitha', 'Rao'),
    ('Sanjay', 'Mehta'), ('Pooja', 'Sharma'), ('Vikram', 'Nair'), ('Deepa', 'Pillai'),
    ('Ravi', 'Kumar'), ('Sunita', 'Joshi'), ('Amit', 'Patel'), ('Neha', 'Verma'),
    ('Sunil', 'Reddy'), ('Preethi', 'Iyer'), ('Ganesh', 'Menon'), ('Rekha', 'Bose'),
    ('Harish', 'Tiwari'), ('Lalitha', 'Nambiar'), ('Dinesh', 'Choudhary'), ('Usha', 'Krishnan'),
]

STATUSES = ['new', 'new', 'new', 'demo_done', 'demo_done', 'presentation', 'custom']
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

        existing_phones = set(ASELead.objects.filter(company=company).values_list('phone', flat=True))
        now = timezone.now()
        to_create = []

        i = 0
        attempts = 0
        while len(to_create) < count and attempts < count * 3:
            attempts += 1
            comp_name, industry, services = random.choice(COMPANIES)
            unique_company_name = f"{comp_name} {i + 1}"
            first, last = random.choice(CONTACTS)
            phone = f"9{random.randint(100000000, 999999999)}"

            if phone in existing_phones:
                continue
            existing_phones.add(phone)
            i += 1

            assigned = random.choice(users)
            creator = random.choice(users)
            status = random.choice(STATUSES)
            created_at_offset = now - timedelta(days=random.randint(1, 180))
            next_follow_up = now + timedelta(days=random.randint(1, 30)) if random.random() > 0.4 else None

            slug = unique_company_name.lower().replace(' ', '')
            to_create.append(ASELead(
                company_name=unique_company_name,
                contact_person=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}{random.randint(1,999)}@{slug}.com",
                phone=phone,
                website=f"https://www.{slug}.com",
                industry=industry,
                company_size=random.choice(['1-10', '11-50', '51-200', '201-500', '500+']),
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
                next_follow_up=next_follow_up,
                lead_score=random.randint(0, 100),
                engagement_level=random.choice(['cold', 'cold', 'warm', 'hot', 'very_hot']),
                estimated_project_value=random.choice([15000, 30000, 50000, 75000, 100000, 150000, None]),
                monthly_retainer=random.choice([5000, 10000, 15000, 25000, None]),
                notes=f'[seeded] Auto-generated dummy lead #{i}',
            ))

        created_objs = ASELead.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        # Back-date created_at for realism
        for idx, obj in enumerate(created_objs):
            if obj.pk:
                ASELead.objects.filter(pk=obj.pk).update(
                    created_at=now - timedelta(days=random.randint(1, 180))
                )

        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {len(created_objs)} dummy leads for ASE Technologies.'
        ))
