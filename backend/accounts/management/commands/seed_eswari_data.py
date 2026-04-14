"""
Management command to seed fake data for Eswari Group CRM
Generates realistic test data for all modules
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal
import random

from accounts.models import Company
from leads.models import Lead
from customers.models import Customer
from projects.models import Project
from tasks.models import Task
from announcements.models import Announcement

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds fake data for Eswari Group CRM'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            default='Eswari Group',
            help='Company name to seed data for (default: Eswari Group)'
        )
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of users to create (default: 10)'
        )
        parser.add_argument(
            '--leads',
            type=int,
            default=50,
            help='Number of leads to create (default: 50)'
        )
        parser.add_argument(
            '--customers',
            type=int,
            default=30,
            help='Number of customers to create (default: 30)'
        )
        parser.add_argument(
            '--projects',
            type=int,
            default=5,
            help='Number of projects to create (default: 5)'
        )

    def handle(self, *args, **options):
        company_name = options['company']
        num_users = options['users']
        num_leads = options['leads']
        num_customers = options['customers']
        num_projects = options['projects']

        self.stdout.write(self.style.SUCCESS(f'\n🚀 Starting data seeding for {company_name}...\n'))

        # Get or create company
        company = self.get_or_create_company(company_name)
        
        # Create users
        users = self.create_users(company, num_users)
        
        # Create projects
        projects = self.create_projects(company, users, num_projects)
        
        # Create leads
        leads = self.create_leads(company, users, projects, num_leads)
        
        # Create customers
        customers = self.create_customers(company, users, num_customers)
        
        # Create tasks
        tasks = self.create_tasks(company, users, projects, leads)
        
        # Create announcements
        announcements = self.create_announcements(company, users)

        self.stdout.write(self.style.SUCCESS(f'\n✅ Data seeding completed successfully!\n'))
        self.stdout.write(self.style.SUCCESS(f'📊 Summary:'))
        self.stdout.write(f'   - Company: {company.name}')
        self.stdout.write(f'   - Users: {len(users)}')
        self.stdout.write(f'   - Projects: {len(projects)}')
        self.stdout.write(f'   - Leads: {len(leads)}')
        self.stdout.write(f'   - Customers: {len(customers)}')
        self.stdout.write(f'   - Tasks: {len(tasks)}')
        self.stdout.write(f'   - Announcements: {len(announcements)}\n')

    def get_or_create_company(self, company_name):
        """Get or create the company"""
        company, created = Company.objects.get_or_create(
            name=company_name,
            defaults={
                'code': company_name.upper().replace(' ', '_'),
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created company: {company.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Company already exists: {company.name}'))
        return company

    def create_users(self, company, count):
        """Create fake users with different roles"""
        self.stdout.write(f'\n👥 Creating {count} users...')
        
        first_names = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Karthik', 'Divya', 
                      'Arjun', 'Meera', 'Rahul', 'Pooja', 'Suresh', 'Kavya', 'Arun']
        last_names = ['Kumar', 'Sharma', 'Reddy', 'Patel', 'Singh', 'Nair', 'Rao', 'Gupta', 
                     'Iyer', 'Menon', 'Verma', 'Joshi', 'Desai', 'Pillai', 'Chopra']
        
        roles = ['manager', 'employee', 'employee', 'employee']  # More employees than managers
        users = []
        
        # Create admin if doesn't exist
        admin_email = f'admin@{company.code.lower()}.com'
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'admin',
                'company': company,
                'phone': '9999999999'
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(f'  ✓ Created admin: {admin.email}')
        
        users.append(admin)
        
        # Create managers and employees
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            role = roles[i % len(roles)]
            email = f'{first_name.lower()}.{last_name.lower()}{i}@{company.code.lower()}.com'
            
            # Skip if user with this email already exists
            if User.objects.filter(email=email).exists():
                continue
            
            try:
                user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    company=company,
                    phone=f'98{random.randint(10000000, 99999999)}'
                )
                user.set_password('password123')
                user.save()
                users.append(user)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠ Skipped user {email}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(users)} users'))
        return users

    def create_projects(self, company, users, count):
        """Create fake real estate projects"""
        self.stdout.write(f'\n🏗️  Creating {count} projects...')
        
        project_names = [
            'Eswari Heights', 'Green Valley Apartments', 'Sunrise Villas', 
            'Royal Gardens', 'Palm Residency', 'Lake View Towers',
            'Silver Oak Homes', 'Golden Gate Complex', 'Emerald Plaza'
        ]
        
        locations = [
            'Gachibowli, Hyderabad', 'Kondapur, Hyderabad', 'Madhapur, Hyderabad',
            'Banjara Hills, Hyderabad', 'Jubilee Hills, Hyderabad', 'Kukatpally, Hyderabad',
            'Miyapur, Hyderabad', 'Manikonda, Hyderabad'
        ]
        
        amenities_list = [
            ['Swimming Pool', 'Gym', 'Children Play Area', 'Club House'],
            ['24/7 Security', 'Power Backup', 'Parking', 'Lift'],
            ['Garden', 'Jogging Track', 'Indoor Games', 'Party Hall'],
            ['CCTV Surveillance', 'Intercom', 'Rainwater Harvesting', 'Solar Panels']
        ]
        
        landmarks_list = [
            ['IKEA - 2km', 'Inorbit Mall - 3km', 'Metro Station - 1km'],
            ['International School - 1.5km', 'Apollo Hospital - 4km', 'Tech Park - 2km'],
            ['Shopping Complex - 1km', 'Bus Stop - 500m', 'Park - 800m']
        ]
        
        projects = []
        managers = [u for u in users if u.role == 'manager']
        
        for i in range(count):
            project_name = project_names[i % len(project_names)]
            
            project, created = Project.objects.get_or_create(
                name=f'{project_name} {i+1}' if i >= len(project_names) else project_name,
                company=company,
                defaults={
                    'location': random.choice(locations),
                    'type': random.choice(['villa', 'apartment', 'plots']),
                    'description': f'Premium residential project with modern amenities',
                    'status': random.choice(['pre_launch', 'launch', 'under_construction', 'mid_stage']),
                    'priceMin': Decimal(random.randint(3000, 5000)) * 1000,
                    'priceMax': Decimal(random.randint(8000, 15000)) * 1000,
                    'launchDate': date.today() - timedelta(days=random.randint(0, 365)),
                    'possessionDate': date.today() + timedelta(days=random.randint(365, 1095)),
                    'towerDetails': f'{random.randint(2, 8)} Towers, {random.randint(10, 25)} Floors',
                    'amenities': random.choice(amenities_list),
                    'nearbyLandmarks': random.choice(landmarks_list),
                    'manager': random.choice(managers) if managers else None
                }
            )
            
            if created:
                projects.append(project)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(projects)} projects'))
        return projects

    def create_leads(self, company, users, projects, count):
        """Create fake leads"""
        self.stdout.write(f'\n📞 Creating {count} leads...')
        
        first_names = ['Ramesh', 'Lakshmi', 'Venkat', 'Sita', 'Krishna', 'Radha', 'Mohan', 'Geetha',
                      'Ravi', 'Suma', 'Prasad', 'Vani', 'Srinivas', 'Padma', 'Murthy']
        last_names = ['Reddy', 'Rao', 'Kumar', 'Prasad', 'Naidu', 'Chowdary', 'Varma', 'Sastry']
        
        locations = ['Gachibowli', 'Kondapur', 'Madhapur', 'Banjara Hills', 'Jubilee Hills', 
                    'Kukatpally', 'Miyapur', 'Manikonda', 'Financial District']
        
        leads = []
        employees = [u for u in users if u.role in ['employee', 'manager']]
        
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            phone = f'9{random.randint(100000000, 999999999)}'
            
            # Check if lead with this phone already exists for this company
            if Lead.objects.filter(phone=phone, company=company).exists():
                continue
            
            lead = Lead.objects.create(
                name=f'{first_name} {last_name}',
                email=f'{first_name.lower()}.{last_name.lower()}{i}@gmail.com',
                phone=phone,
                address=f'{random.randint(1, 999)}, Street {random.randint(1, 50)}, {random.choice(locations)}',
                requirement_type=random.choice(['villa', 'apartment', 'house', 'plot']),
                bhk_requirement=random.choice(['1', '2', '3', '4', '5+']),
                budget_min=Decimal(random.randint(30, 60)) * 100000,
                budget_max=Decimal(random.randint(80, 150)) * 100000,
                preferred_location=random.choice(locations),
                status=random.choice(['new', 'hot', 'warm', 'cold', 'reminder']),
                source=random.choice(['call', 'walk_in', 'website', 'referral']),
                company=company,
                assigned_to=random.choice(employees) if employees else None,
                created_by=random.choice(users),
                description=f'Looking for {random.choice(["2", "3", "4"])} BHK in {random.choice(locations)}',
                follow_up_date=timezone.now() + timedelta(days=random.randint(1, 30)) if random.random() > 0.5 else None
            )
            
            # Assign random projects
            if projects and random.random() > 0.3:
                lead.assigned_projects = [random.choice(projects).id for _ in range(random.randint(1, 3))]
                lead.save()
            
            leads.append(lead)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(leads)} leads'))
        return leads

    def create_customers(self, company, users, count):
        """Create fake customers"""
        self.stdout.write(f'\n👤 Creating {count} customers...')
        
        first_names = ['Sunil', 'Madhavi', 'Naresh', 'Swathi', 'Kishore', 'Lavanya', 'Prakash', 'Deepa']
        last_names = ['Kumar', 'Reddy', 'Sharma', 'Patel', 'Rao', 'Nair']
        
        customers = []
        employees = [u for u in users if u.role in ['employee', 'manager']]
        
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            phone = f'8{random.randint(100000000, 999999999)}'
            
            # Check if customer with this phone already exists for this company
            if Customer.objects.filter(phone=phone, company=company).exists():
                continue
            
            customer = Customer.objects.create(
                name=f'{first_name} {last_name}',
                phone=phone,
                call_status=random.choice(['pending', 'answered', 'not_answered', 'busy']),
                company=company,
                assigned_to=random.choice(employees) if employees else None,
                created_by=random.choice(users),
                scheduled_date=timezone.now() + timedelta(days=random.randint(1, 15)) if random.random() > 0.5 else None,
                notes=f'Customer interested in property investment' if random.random() > 0.5 else ''
            )
            customers.append(customer)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(customers)} customers'))
        return customers

    def create_tasks(self, company, users, projects, leads):
        """Create fake tasks"""
        self.stdout.write(f'\n✅ Creating tasks...')
        
        task_titles = [
            'Follow up with client', 'Schedule site visit', 'Prepare quotation',
            'Send project brochure', 'Arrange bank loan meeting', 'Document verification',
            'Site inspection', 'Client meeting', 'Property registration', 'Final walkthrough'
        ]
        
        tasks = []
        employees = [u for u in users if u.role in ['employee', 'manager']]
        
        # Create 2-3 tasks per project
        for project in projects:
            for _ in range(random.randint(2, 3)):
                task = Task.objects.create(
                    title=random.choice(task_titles),
                    description=f'Task related to {project.name}',
                    project=project,
                    company=company,
                    status=random.choice(['in_progress', 'site_visit', 'completed']),
                    priority=random.choice(['low', 'medium', 'high', 'urgent']),
                    assigned_to=random.choice(employees) if employees else None,
                    created_by=random.choice(users),
                    due_date=timezone.now() + timedelta(days=random.randint(1, 30)),
                    estimated_hours=Decimal(random.randint(2, 16))
                )
                tasks.append(task)
        
        # Create some tasks linked to leads
        for lead in random.sample(leads, min(10, len(leads))):
            task = Task.objects.create(
                title=f'Follow up with {lead.name}',
                description=f'Contact lead regarding {lead.requirement_type} requirement',
                lead=lead,
                company=company,
                status=random.choice(['in_progress', 'site_visit']),
                priority=random.choice(['medium', 'high']),
                assigned_to=lead.assigned_to,
                created_by=random.choice(users),
                due_date=timezone.now() + timedelta(days=random.randint(1, 7))
            )
            tasks.append(task)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(tasks)} tasks'))
        return tasks

    def create_announcements(self, company, users):
        """Create fake announcements"""
        self.stdout.write(f'\n📢 Creating announcements...')
        
        announcements_data = [
            {
                'title': 'New Project Launch - Eswari Heights',
                'message': 'We are excited to announce the launch of our new premium project Eswari Heights in Gachibowli. Special pre-launch offers available!',
                'priority': 'high'
            },
            {
                'title': 'Team Meeting - Monthly Review',
                'message': 'Monthly performance review meeting scheduled for all team members. Please prepare your reports.',
                'priority': 'medium'
            },
            {
                'title': 'Holiday Notice',
                'message': 'Office will remain closed on upcoming public holidays. Emergency contacts will be shared separately.',
                'priority': 'low'
            },
            {
                'title': 'Sales Target Achievement',
                'message': 'Congratulations team! We have achieved 120% of our quarterly sales target. Keep up the excellent work!',
                'priority': 'high'
            },
            {
                'title': 'New CRM Features',
                'message': 'New features have been added to the CRM system. Please check the documentation for details.',
                'priority': 'medium'
            }
        ]
        
        announcements = []
        admin_users = [u for u in users if u.role == 'admin']
        creator = admin_users[0] if admin_users else users[0]
        
        for data in announcements_data:
            announcement = Announcement.objects.create(
                title=data['title'],
                message=data['message'],
                priority=data['priority'],
                target_roles=['employee', 'manager'],
                company=company,
                is_active=True,
                created_by=creator,
                expires_at=timezone.now() + timedelta(days=30)
            )
            announcement.companies.add(company)
            announcements.append(announcement)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(announcements)} announcements'))
        return announcements
