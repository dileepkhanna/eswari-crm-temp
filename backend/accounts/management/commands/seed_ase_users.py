from django.core.management.base import BaseCommand
from accounts.models import User, Company


DUMMY_USERS = [
    # Managers
    {'first_name': 'Arjun',   'last_name': 'Sharma',    'role': 'manager',  'email': 'arjun.sharma@ase.com'},
    {'first_name': 'Priya',   'last_name': 'Nair',      'role': 'manager',  'email': 'priya.nair@ase.com'},
    # Employees
    {'first_name': 'Rahul',   'last_name': 'Verma',     'role': 'employee', 'email': 'rahul.verma@ase.com'},
    {'first_name': 'Sneha',   'last_name': 'Reddy',     'role': 'employee', 'email': 'sneha.reddy@ase.com'},
    {'first_name': 'Kiran',   'last_name': 'Patel',     'role': 'employee', 'email': 'kiran.patel@ase.com'},
    {'first_name': 'Meena',   'last_name': 'Iyer',      'role': 'employee', 'email': 'meena.iyer@ase.com'},
    {'first_name': 'Suresh',  'last_name': 'Kumar',     'role': 'employee', 'email': 'suresh.kumar@ase.com'},
    {'first_name': 'Divya',   'last_name': 'Menon',     'role': 'employee', 'email': 'divya.menon@ase.com'},
    {'first_name': 'Anil',    'last_name': 'Joshi',     'role': 'employee', 'email': 'anil.joshi@ase.com'},
    {'first_name': 'Lakshmi', 'last_name': 'Pillai',    'role': 'employee', 'email': 'lakshmi.pillai@ase.com'},
]


class Command(BaseCommand):
    help = 'Seed dummy users for ASE Technologies company'

    def handle(self, *args, **kwargs):
        try:
            company = Company.objects.get(code='ASE')
        except Company.DoesNotExist:
            self.stderr.write('ASE company not found. Run list_companies to check.')
            return

        created = 0
        skipped = 0

        for data in DUMMY_USERS:
            if User.objects.filter(email=data['email']).exists():
                self.stdout.write(f"  skip  {data['email']} (already exists)")
                skipped += 1
                continue

            user = User(
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=data['role'],
                email=data['email'],
                company=company,
                is_active=True,
            )
            user.username = user.generate_username()
            user.set_password('Test@1234')
            user.save()
            created += 1
            self.stdout.write(f"  created  {user.username}  ({data['role']})  {data['email']}")

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Created: {created}, Skipped: {skipped}'
        ))
