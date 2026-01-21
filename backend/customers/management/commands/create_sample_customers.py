from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample customers for testing'

    def handle(self, *args, **options):
        # Get admin user to create customers
        try:
            admin_user = User.objects.filter(role='admin').first()
            if not admin_user:
                self.stdout.write(self.style.ERROR('No admin user found'))
                return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error finding admin user: {e}'))
            return

        # Sample customers data
        sample_customers = [
            {
                'name': 'Alice Johnson',
                'phone': '+1555123456',
                'call_status': 'pending',
                'notes': 'Interested in 2BHK apartment'
            },
            {
                'name': 'Bob Wilson', 
                'phone': '+1555123457',
                'call_status': 'answered',
                'notes': 'Looking for villa'
            },
            {
                'name': 'Carol Smith',
                'phone': '+1555123458', 
                'call_status': 'not_answered'
            },
            {
                'name': 'Diana Prince',
                'phone': '+1555123459',
                'call_status': 'custom',
                'custom_call_status': 'Callback Requested',
                'notes': 'Requested callback after 6 PM'
            },
            {
                'phone': '+1555123460',
                'call_status': 'pending'
            }
        ]

        created_count = 0
        for customer_data in sample_customers:
            # Check if customer already exists
            if not Customer.objects.filter(phone=customer_data['phone']).exists():
                Customer.objects.create(
                    created_by=admin_user,
                    **customer_data
                )
                created_count += 1
                self.stdout.write(f'Created customer: {customer_data.get("name", "Unknown")} - {customer_data["phone"]}')
            else:
                self.stdout.write(f'Customer already exists: {customer_data["phone"]}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} sample customers')
        )