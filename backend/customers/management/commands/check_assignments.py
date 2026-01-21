from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Check customer assignments in the database'

    def handle(self, *args, **options):
        self.stdout.write('=== Customer Assignment Status ===')
        
        # List all customers
        customers = Customer.objects.all()
        self.stdout.write(f'Total customers: {customers.count()}')
        
        for customer in customers:
            assigned_info = f"Assigned to: {customer.assigned_to.username if customer.assigned_to else 'Unassigned'}"
            self.stdout.write(f'Customer: {customer.name or "Unknown"} ({customer.phone}) - {assigned_info}')
        
        self.stdout.write('\n=== Users by Role ===')
        
        # List all users
        users = User.objects.all()
        for user in users:
            self.stdout.write(f'User: {user.username} ({user.first_name} {user.last_name}) - Role: {user.role} - ID: {user.id}')
        
        self.stdout.write('\n=== Employee Assignments ===')
        
        # Check assignments for each employee
        employees = User.objects.filter(role='employee')
        for employee in employees:
            assigned_customers = Customer.objects.filter(assigned_to=employee)
            self.stdout.write(f'Employee: {employee.username} has {assigned_customers.count()} assigned customers:')
            for customer in assigned_customers:
                self.stdout.write(f'  - {customer.name or "Unknown"} ({customer.phone})')