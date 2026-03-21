from django.core.management.base import BaseCommand
from django.utils import timezone
from ase_customers.tasks import send_followup_reminders


class Command(BaseCommand):
    help = 'Send follow-up reminder push notifications for today\'s scheduled ASE customers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help='Target date in YYYY-MM-DD format (defaults to today)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show counts without sending notifications',
        )

    def handle(self, *args, **options):
        from ase_customers.models import ASECustomer

        target_date = None
        if options['date']:
            from datetime import date
            target_date = date.fromisoformat(options['date'])
        else:
            target_date = timezone.localdate()

        self.stdout.write(f'Checking follow-ups for {target_date}...')

        if options['dry_run']:
            count = ASECustomer.objects.filter(
                scheduled_date__date=target_date,
                is_converted=False,
            ).exclude(call_status='not_interested').count()
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: {count} follow-up(s) would trigger notifications')
            )
            return

        result = send_followup_reminders(target_date)

        if result['total'] == 0:
            self.stdout.write(self.style.WARNING('No follow-ups scheduled for today'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Sent reminders: {result['notified_users']} user(s) notified "
                f"for {result['total']} follow-up(s)"
            ))
            if result.get('unassigned'):
                self.stdout.write(self.style.WARNING(
                    f"  {result['unassigned']} unassigned follow-up(s) — admins notified"
                ))
            if result.get('errors'):
                for err in result['errors']:
                    self.stdout.write(self.style.ERROR(f"  Error: {err}"))
