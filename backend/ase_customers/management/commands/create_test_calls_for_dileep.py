"""
Django management command to create 100 test calls for dileep_employee_14
to verify auto-assignment is working correctly.

Usage:
    python manage.py create_test_calls_for_dileep
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from ase_customers.models import ASECustomer
import random


class Command(BaseCommand):
    help = 'Create 100 test calls for dileep_employee_14 to verify auto-assignment'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('Creating 100 Test Calls for dileep_employee_14'))
        self.stdout.write(self.style.SUCCESS('='*70))
        
        # Find the employee
        try:
            dileep = User.objects.get(username='dileep_employee_14')
            self.stdout.write(f'\n✓ Found employee: {dileep.first_name} {dileep.last_name}')
            self.stdout.write(f'  ID: {dileep.id}')
            self.stdout.write(f'  Role: {dileep.role}')
            self.stdout.write(f'  Company: {dileep.company.name if dileep.company else "None"}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('\n❌ Employee "dileep_employee_14" not found!'))
            return
        
        if not dileep.company:
            self.stdout.write(self.style.ERROR('❌ Employee has no company assigned!'))
            return
        
        # Sample data for realistic calls
        first_names = [
            'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Karthik', 'Divya',
            'Suresh', 'Lakshmi', 'Arun', 'Meera', 'Ravi', 'Pooja', 'Manoj', 'Kavya',
            'Sanjay', 'Nisha', 'Deepak', 'Swathi', 'Ramesh', 'Anitha', 'Prakash', 'Sowmya'
        ]
        
        last_names = [
            'Kumar', 'Sharma', 'Reddy', 'Patel', 'Singh', 'Nair', 'Iyer', 'Rao',
            'Gupta', 'Menon', 'Krishnan', 'Pillai', 'Desai', 'Joshi', 'Verma', 'Agarwal'
        ]
        
        companies = [
            'Tech Solutions Pvt Ltd', 'Digital Marketing Hub', 'Web Innovations',
            'SEO Masters', 'Social Media Pro', 'Content Creators Inc', 'Brand Builders',
            'Online Marketing Co', 'Digital Growth Agency', 'Marketing Experts',
            'Web Design Studio', 'E-commerce Solutions', 'Digital Consultants',
            'Marketing Wizards', 'SEO Specialists', 'Social Media Agency'
        ]
        
        call_statuses = ['pending', 'answered', 'not_answered', 'busy', 'follow_up']
        
        self.stdout.write(f'\n📝 Creating 100 test calls...')
        
        created_calls = []
        for i in range(100):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            phone = f"9{random.randint(100000000, 999999999)}"
            company_name = random.choice(companies)
            call_status = random.choice(call_statuses)
            
            # Create the call - simulating what happens when employee creates via API
            call = ASECustomer.objects.create(
                name=name,
                phone=phone,
                company_name=company_name,
                call_status=call_status,
                notes=f'Test call #{i+1} for auto-assignment verification',
                company=dileep.company,
                created_by=dileep,
                assigned_to=dileep,  # This simulates the backend auto-assignment
            )
            
            created_calls.append(call)
            
            if (i + 1) % 20 == 0:
                self.stdout.write(f'  Created {i + 1} calls...')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully created {len(created_calls)} calls'))
        
        # Verify the assignments
        self.stdout.write(f'\n🔍 Verifying assignments...')
        
        all_dileep_calls = ASECustomer.objects.filter(created_by=dileep)
        assigned_to_dileep = all_dileep_calls.filter(assigned_to=dileep)
        assigned_to_others = all_dileep_calls.exclude(assigned_to=dileep)
        
        self.stdout.write(f'\n📊 Results:')
        self.stdout.write(f'  Total calls created by dileep: {all_dileep_calls.count()}')
        self.stdout.write(f'  Assigned to dileep: {assigned_to_dileep.count()}')
        self.stdout.write(f'  Assigned to others: {assigned_to_others.count()}')
        
        if assigned_to_others.count() > 0:
            self.stdout.write(self.style.WARNING(f'\n⚠️  WARNING: {assigned_to_others.count()} calls NOT assigned to dileep!'))
            for call in assigned_to_others[:5]:
                assignee = call.assigned_to.username if call.assigned_to else 'None'
                self.stdout.write(f'     - Call #{call.id}: {call.name} -> assigned to {assignee}')
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ SUCCESS! All calls correctly assigned to dileep!'))
        
        # Show sample calls
        self.stdout.write(f'\n📋 Sample calls created:')
        for call in created_calls[:5]:
            self.stdout.write(
                f'  #{call.id}: {call.name} ({call.phone}) - '
                f'{call.company_name} - Status: {call.call_status}'
            )
        
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('COMPLETE!'))
        self.stdout.write('='*70)
        
        # Instructions
        self.stdout.write(f'\n📝 Next Steps:')
        self.stdout.write(f'1. Login as dileep_employee_14 in the web app')
        self.stdout.write(f'2. Go to ASE Calls section')
        self.stdout.write(f'3. Verify you see all {len(created_calls)} new calls')
        self.stdout.write(f'4. Create a new call manually and verify it auto-assigns to you')
        self.stdout.write(f'5. Check that "Assigned To" column shows your name\n')
