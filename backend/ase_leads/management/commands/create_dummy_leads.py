from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ase_leads.models import ASELead
from accounts.models import Company
import random
from datetime import datetime, timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create 500 dummy ASE leads for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=500,
            help='Number of dummy leads to create (default: 500)'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # Get admin user
        admin_user = User.objects.filter(role='admin').first()
        if not admin_user:
            self.stdout.write(self.style.ERROR('No admin user found. Please create an admin user first.'))
            return
        
        # Get ASE company
        ase_company = Company.objects.filter(name__icontains='ASE').first()
        if not ase_company:
            self.stdout.write(self.style.ERROR('ASE company not found. Please create ASE company first.'))
            return
        
        # Get all employees in ASE company for assignment
        employees = User.objects.filter(company=ase_company, is_active=True)
        if not employees.exists():
            employees = [admin_user]
        
        self.stdout.write(f'Creating {count} dummy leads...')
        
        # Indian first names
        first_names = [
            'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rahul', 'Pooja',
            'Arjun', 'Divya', 'Karthik', 'Lakshmi', 'Suresh', 'Meera', 'Arun', 'Kavya',
            'Ravi', 'Nisha', 'Sanjay', 'Deepa', 'Manoj', 'Swathi', 'Naveen', 'Rekha',
            'Prakash', 'Sangeetha', 'Venkat', 'Ramya', 'Krishna', 'Sowmya', 'Ganesh', 'Pavithra',
            'Mahesh', 'Harini', 'Dinesh', 'Vani', 'Ashok', 'Shruthi', 'Kumar', 'Bhavana',
            'Mohan', 'Archana', 'Gopal', 'Lavanya', 'Bala', 'Keerthi', 'Murali', 'Sindhu',
            'Ramesh', 'Anitha', 'Senthil', 'Geetha', 'Vijay', 'Radha', 'Anand', 'Saranya'
        ]
        
        last_names = [
            'Kumar', 'Reddy', 'Sharma', 'Patel', 'Singh', 'Iyer', 'Nair', 'Rao',
            'Gupta', 'Verma', 'Menon', 'Pillai', 'Naidu', 'Choudhary', 'Joshi', 'Desai',
            'Mehta', 'Shah', 'Agarwal', 'Bansal', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia',
            'Sethi', 'Khanna', 'Arora', 'Sinha', 'Jain', 'Saxena', 'Mishra', 'Pandey'
        ]
        
        companies = [
            'Tech Solutions Pvt Ltd', 'Global Industries', 'Sunrise Enterprises', 'Metro Trading Co',
            'Prime Logistics', 'Smart Systems', 'Elite Services', 'Apex Corporation',
            'Vision Technologies', 'Dynamic Solutions', 'Infinity Group', 'Nexus Ventures',
            'Stellar Industries', 'Quantum Systems', 'Phoenix Enterprises', 'Omega Trading',
            'Alpha Solutions', 'Beta Technologies', 'Gamma Industries', 'Delta Services',
            'Epsilon Corp', 'Zeta Ventures', 'Eta Systems', 'Theta Group',
            'Iota Enterprises', 'Kappa Solutions', 'Lambda Tech', 'Sigma Industries'
        ]
        
        services = [
            'seo', 'social_media', 'content_marketing', 'ppc', 'email_marketing',
            'web_design', 'branding', 'analytics', 'influencer', 'video_marketing', 'custom'
        ]
        
        industries = [
            'technology', 'healthcare', 'finance', 'retail', 'real_estate', 'education',
            'hospitality', 'manufacturing', 'professional_services', 'non_profit',
            'automotive', 'food_beverage', 'fashion', 'sports_fitness', 'entertainment', 'other'
        ]
        
        lead_sources = ['website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'trade_show', 'partner', 'google_search']
        lead_statuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'on_hold', 'nurturing']
        priorities = ['low', 'medium', 'high', 'urgent']
        
        created_count = 0
        
        for i in range(count):
            try:
                # Generate random phone number (Indian format)
                phone = f"{random.choice(['9', '8', '7'])}{random.randint(100000000, 999999999)}"
                
                # Generate random name
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)
                name = f"{first_name} {last_name}"
                
                # Generate email
                email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}@example.com"
                
                # Random company
                company_name = random.choice(companies)
                
                # Random services (1-3 services)
                num_services = random.randint(1, 3)
                service_interests = random.sample(services, num_services)
                
                # Random dates
                days_ago = random.randint(0, 90)
                created_date = datetime.now() - timedelta(days=days_ago)
                
                # Random assignment
                assigned_to = random.choice(list(employees)) if random.random() > 0.2 else None
                
                # Random lead data
                lead_source = random.choice(lead_sources)
                lead_status = random.choice(lead_statuses)
                priority = random.choice(priorities)
                industry = random.choice(industries)
                
                # Random estimated value
                estimated_value = random.choice([None, random.randint(50000, 5000000)])
                monthly_retainer = random.choice([None, random.randint(10000, 200000)])
                
                # Create lead
                lead = ASELead.objects.create(
                    phone=phone,
                    contact_person=name,
                    email=email,
                    company_name=company_name,
                    service_interests=service_interests,
                    lead_source=lead_source,
                    status=lead_status,
                    priority=priority,
                    industry=industry,
                    estimated_project_value=estimated_value,
                    monthly_retainer=monthly_retainer,
                    notes=f"Dummy lead created for testing - {i+1}",
                    company=ase_company,
                    created_by=admin_user,
                    assigned_to=assigned_to,
                )
                
                # Update created_at to random date
                ASELead.objects.filter(id=lead.id).update(created_at=created_date)
                
                created_count += 1
                
                if (i + 1) % 50 == 0:
                    self.stdout.write(f'Created {i + 1} leads...')
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error creating lead {i+1}: {str(e)}'))
                continue
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} dummy ASE leads!'))
        self.stdout.write(f'Company: {ase_company.name}')
        self.stdout.write(f'Created by: {admin_user.username} (Admin)')
        self.stdout.write(f'Assigned to: {employees.count()} employees (randomly distributed)')
