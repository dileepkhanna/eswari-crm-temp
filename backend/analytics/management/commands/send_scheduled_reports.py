"""
Management command to send scheduled analytics reports via email.

Usage:
  python manage.py send_scheduled_reports

Run this via cron job:
  Daily:   0 8 * * * cd /path/to/backend && python manage.py send_scheduled_reports
  (Runs at 8 AM daily, sends reports whose next_send_at has passed)
"""

from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from django.template.loader import render_to_string
from django.conf import settings

from analytics.models import ReportSchedule
from analytics.views import (
    _get_period_range,
)
from accounts.models import User, Company
from leads.models import Lead
from ase_leads.models import ASELead
from capital.models import CapitalLoan, CapitalService, CapitalCustomer
from customers.models import Customer
from tasks.models import Task
from django.db.models import Count, Sum, Q

import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send scheduled analytics reports via email'

    def handle(self, *args, **options):
        now = timezone.now()
        due_schedules = ReportSchedule.objects.filter(
            is_active=True,
            next_send_at__lte=now
        )

        if not due_schedules.exists():
            self.stdout.write('No reports due for sending.')
            return

        for schedule in due_schedules:
            try:
                self._send_report(schedule)
                self._update_next_send(schedule, now)
                self.stdout.write(self.style.SUCCESS(f'Sent: {schedule.name}'))
            except Exception as e:
                logger.error(f'Failed to send report "{schedule.name}": {e}')
                self.stdout.write(self.style.ERROR(f'Failed: {schedule.name} - {e}'))

    def _send_report(self, schedule):
        """Generate and send the report email."""
        report_data = self._generate_report_data(schedule.report_type)
        subject = f'[Eswari CRM] {schedule.name} - {timezone.now().strftime("%d %b %Y")}'
        body = self._format_report_body(schedule, report_data)

        if not schedule.recipients:
            logger.warning(f'No recipients for schedule: {schedule.name}')
            return

        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@eswaricrm.com',
            recipient_list=schedule.recipients,
            fail_silently=False,
        )

    def _generate_report_data(self, report_type):
        """Generate report data based on type."""
        period = 'week' if report_type != 'monthly' else 'month'
        start_date, end_date = _get_period_range(period)

        data = {
            'period_start': str(start_date),
            'period_end': str(end_date),
        }

        if report_type in ('overview', 'revenue'):
            data['eswari_leads'] = Lead.objects.filter(created_at__date__gte=start_date).count()
            data['eswari_hot'] = Lead.objects.filter(status='hot').count()
            data['eswari_customers'] = Customer.objects.filter(created_at__date__gte=start_date).count()

            data['ase_leads'] = ASELead.objects.filter(created_at__date__gte=start_date).count()
            data['ase_won'] = ASELead.objects.filter(status='won', deal_closed_at__date__gte=start_date).count()
            data['ase_revenue'] = float(ASELead.objects.filter(
                status='won', deal_closed_at__date__gte=start_date
            ).aggregate(total=Sum('estimated_project_value'))['total'] or 0)

            data['capital_loans'] = CapitalLoan.objects.filter(created_at__date__gte=start_date).count()
            data['capital_disbursed'] = CapitalLoan.objects.filter(
                status='disbursed', created_at__date__gte=start_date
            ).count()
            data['capital_services'] = CapitalService.objects.filter(
                created_at__date__gte=start_date
            ).count()

        elif report_type == 'scorecards':
            top_performers = User.objects.filter(
                is_active=True, role__in=['manager', 'employee']
            ).annotate(
                leads_count=Count('created_leads', filter=Q(created_leads__created_at__date__gte=start_date))
            ).order_by('-leads_count')[:5]

            data['top_performers'] = [
                {'name': f"{u.first_name} {u.last_name}".strip() or u.username, 'leads': u.leads_count}
                for u in top_performers
            ]

        return data

    def _format_report_body(self, schedule, data):
        """Format report data into a readable email body."""
        lines = [
            f"📊 {schedule.name}",
            f"Period: {data.get('period_start', 'N/A')} to {data.get('period_end', 'N/A')}",
            "",
            "=" * 50,
        ]

        if schedule.report_type in ('overview', 'revenue'):
            lines.extend([
                "",
                "🏠 ESWARI GROUP (Real Estate)",
                f"  New Leads: {data.get('eswari_leads', 0)}",
                f"  Hot Leads: {data.get('eswari_hot', 0)}",
                f"  New Customers: {data.get('eswari_customers', 0)}",
                "",
                "💻 ASE TECHNOLOGIES (Digital Marketing)",
                f"  New Leads: {data.get('ase_leads', 0)}",
                f"  Deals Won: {data.get('ase_won', 0)}",
                f"  Revenue: ₹{data.get('ase_revenue', 0):,.0f}",
                "",
                "💰 ESWARI CAPITAL (Financial Services)",
                f"  New Loans: {data.get('capital_loans', 0)}",
                f"  Disbursed: {data.get('capital_disbursed', 0)}",
                f"  New Services: {data.get('capital_services', 0)}",
            ])

        elif schedule.report_type == 'scorecards':
            lines.extend(["", "🏆 TOP PERFORMERS"])
            for i, p in enumerate(data.get('top_performers', []), 1):
                lines.append(f"  {i}. {p['name']} - {p['leads']} leads")

        lines.extend([
            "",
            "=" * 50,
            "This is an automated report from Eswari CRM.",
            "Login to view detailed analytics: /admin/unified-analytics",
        ])

        return "\n".join(lines)

    def _update_next_send(self, schedule, now):
        """Update last_sent_at and calculate next_send_at."""
        from datetime import timedelta

        schedule.last_sent_at = now

        if schedule.frequency == 'daily':
            schedule.next_send_at = now + timedelta(days=1)
        elif schedule.frequency == 'weekly':
            schedule.next_send_at = now + timedelta(days=7)
        elif schedule.frequency == 'monthly':
            if now.month == 12:
                schedule.next_send_at = now.replace(year=now.year + 1, month=1, day=1)
            else:
                schedule.next_send_at = now.replace(month=now.month + 1, day=1)

        schedule.save()
