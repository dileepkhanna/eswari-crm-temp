#!/usr/bin/env python
"""Script to create test data for ASE Technologies"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Company
from leads.models import Lead
from customers.models import Customer
from projects.models import Project
from tasks.models import Task
from leaves.models import Leave
from holidays.models import Holiday
from announcements.models import Announcement
from datetime import date, timedelta

User = get_user_model()

# Get ASE Technologies company
ase_company = Company.objects.get(code='ASE')
print(f"\nCreating test data for: {ase_company.name}")

# Get ASE users
ase_manager = User.objects.get(username='vinay_manager_02')
ase_employee1 = User.objects.get(username='dileep_employee_02')
ase_employee2 = User.objects.get(username='test_employee_03')

print(f"Manager: {ase_manager.username}")
print(f"Employees: {ase_employee1.username}, {ase_employee2.username}")

# Check if data already exists
existing_leads = Lead.objects.filter(company=ase_company).count()
if existing_leads > 0:
    print(f"\nTest data already exists for ASE Technologies!")
    print(f"  Leads: {existing_leads}")
    print(f"  Customers: {Customer.objects.filter(company=ase_company).count()}")
    print(f"  Projects: {Project.objects.filter(company=ase_company).count()}")
    print(f"  Tasks: {Task.objects.filter(company=ase_company).count()}")
    print(f"  Holidays: {Holiday.objects.filter(company=ase_company).count()}")
    print(f"  Announcements: {Announcement.objects.filter(company=ase_company).count()}")
    print(f"  Leave Requests: {Leave.objects.filter(company=ase_company).count()}")
    print("\nSkipping data creation.")
    exit(0)

# Create Leads
print("\nCreating leads...")
lead1 = Lead.objects.create(
    company=ase_company,
    name="ASE Lead 1",
    email="lead1@ase.com",
    phone="1234567890",
    status="new",
    source="website",
    assigned_to=ase_manager,
    created_by=ase_manager
)
lead2 = Lead.objects.create(
    company=ase_company,
    name="ASE Lead 2",
    email="lead2@ase.com",
    phone="1234567891",
    status="contacted",
    source="referral",
    assigned_to=ase_employee1,
    created_by=ase_manager
)
print(f"Created {Lead.objects.filter(company=ase_company).count()} leads")

# Create Customers
print("\nCreating customers...")
customer1 = Customer.objects.create(
    company=ase_company,
    name="ASE Customer 1",
    phone="8876543210",
    call_status="answered",
    notes="First ASE customer",
    assigned_to=ase_manager,
    created_by=ase_manager
)
customer2 = Customer.objects.create(
    company=ase_company,
    name="ASE Customer 2",
    phone="8876543211",
    call_status="pending",
    notes="Second ASE customer",
    assigned_to=ase_employee1,
    created_by=ase_manager
)
print(f"Created {Customer.objects.filter(company=ase_company).count()} customers")

# Create Projects
print("\nCreating projects...")
project1 = Project.objects.create(
    company=ase_company,
    name="ASE Project 1",
    location="ASE Location 1",
    type="apartment",
    description="First ASE project",
    status="under_construction",
    launchDate=date.today(),
    possessionDate=date.today() + timedelta(days=365),
    priceMin=5000000,
    priceMax=10000000,
    manager=ase_manager
)
project2 = Project.objects.create(
    company=ase_company,
    name="ASE Project 2",
    location="ASE Location 2",
    type="villa",
    description="Second ASE project",
    status="pre_launch",
    launchDate=date.today() + timedelta(days=30),
    possessionDate=date.today() + timedelta(days=730),
    priceMin=15000000,
    priceMax=25000000,
    manager=ase_manager
)
print(f"Created {Project.objects.filter(company=ase_company).count()} projects")

# Create Tasks
print("\nCreating tasks...")
task1 = Task.objects.create(
    company=ase_company,
    title="ASE Task 1",
    description="First task for ASE",
    status="in_progress",
    priority="high",
    due_date=date.today() + timedelta(days=7),
    project=project1,
    assigned_to=ase_employee1,
    created_by=ase_manager
)
task2 = Task.objects.create(
    company=ase_company,
    title="ASE Task 2",
    description="Second task for ASE",
    status="site_visit",
    priority="medium",
    due_date=date.today() + timedelta(days=14),
    project=project1,
    assigned_to=ase_employee2,
    created_by=ase_manager
)
print(f"Created {Task.objects.filter(company=ase_company).count()} tasks")

# Create Holidays
print("\nCreating holidays...")
holiday1 = Holiday.objects.create(
    company=ase_company,
    name="ASE Foundation Day",
    start_date=date.today() + timedelta(days=30),
    holiday_type="company",
    description="ASE Technologies Foundation Day",
    created_by=ase_manager
)
print(f"Created {Holiday.objects.filter(company=ase_company).count()} holidays")

# Create Announcements
print("\nCreating announcements...")
announcement1 = Announcement.objects.create(
    company=ase_company,
    title="Welcome to ASE Technologies",
    message="Welcome message for ASE employees",
    priority="high",
    target_roles=["employee", "manager"],
    created_by=ase_manager
)
print(f"Created {Announcement.objects.filter(company=ase_company).count()} announcements")

# Create Leave Request
print("\nCreating leave requests...")
leave1 = Leave.objects.create(
    company=ase_company,
    user=ase_employee1,
    leave_type="casual",
    start_date=date.today() + timedelta(days=10),
    end_date=date.today() + timedelta(days=12),
    reason="Personal work",
    status="pending"
)
print(f"Created {Leave.objects.filter(company=ase_company).count()} leave requests")

print("\n" + "=" * 80)
print("Test data creation complete!")
print("=" * 80)
