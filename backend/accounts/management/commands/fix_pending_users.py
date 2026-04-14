"""
Management command to mark all pending approval users as inactive.
This ensures they cannot log in until approved by admin.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Mark all pending approval users as inactive'

    def handle(self, *args, **options):
        # Find all users pending approval
        pending_users = User.objects.filter(pending_approval=True)
        count = pending_users.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No pending users found.'))
            return
        
        # Mark them as inactive
        updated = pending_users.update(is_active=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully marked {updated} pending user(s) as inactive.'
            )
        )
        
        # List the users
        for user in pending_users:
            self.stdout.write(
                f'  - {user.username} ({user.first_name} {user.last_name}) - {user.role}'
            )
