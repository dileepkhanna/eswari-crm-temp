"""
Follow-up reminder tasks for ASE Customers.
Designed to be called by a daily cron job (e.g. 9 AM).

Logic:
  - Find all ASECustomers where scheduled_date falls on today (date match)
    AND is_converted=False AND call_status != 'not_interested'
  - Group by assigned_to user
  - Send one push notification per user: "You have X follow-up(s) today"
  - Also send one summary notification to each company's admin/manager
"""

import logging
from datetime import date, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_followup_reminders(target_date=None):
    """
    Send follow-up reminder push notifications for the given date (defaults to today).
    Returns a summary dict.
    """
    from .models import ASECustomer
    from notifications.utils import send_push_notification

    if target_date is None:
        target_date = timezone.localdate()

    # Customers with a scheduled_date on target_date that are still active
    qs = ASECustomer.objects.filter(
        scheduled_date__date=target_date,
        is_converted=False,
    ).exclude(
        call_status='not_interested'
    ).select_related('assigned_to', 'company')

    total = qs.count()
    if total == 0:
        logger.info(f'[FollowUp] No follow-ups scheduled for {target_date}')
        return {'date': str(target_date), 'total': 0, 'notified_users': 0, 'errors': []}

    # Group by assigned user
    from collections import defaultdict
    by_user = defaultdict(list)
    unassigned = []

    for customer in qs:
        if customer.assigned_to:
            by_user[customer.assigned_to].append(customer)
        else:
            unassigned.append(customer)

    notified = 0
    errors = []

    for user, customers in by_user.items():
        count = len(customers)
        names = ', '.join(
            c.name or c.phone for c in customers[:3]
        ) + (f' +{count - 3} more' if count > 3 else '')

        title = f'📞 {count} Follow-up{"s" if count > 1 else ""} Today'
        body = f'Scheduled: {names}'

        try:
            send_push_notification(
                user=user,
                title=title,
                message=body,
                notification_type='followup_reminder',
                data={
                    'type': 'followup_reminder',
                    'date': str(target_date),
                    'count': count,
                    'url': '/ase-customers',
                },
                company=user.company,
            )
            notified += 1
            logger.info(f'[FollowUp] Notified {user.username} — {count} follow-up(s)')
        except Exception as e:
            errors.append({'user': user.username, 'error': str(e)})
            logger.error(f'[FollowUp] Failed to notify {user.username}: {e}')

    # Notify admins/managers about unassigned follow-ups
    if unassigned:
        _notify_admins_unassigned(unassigned, target_date, errors)

    return {
        'date': str(target_date),
        'total': total,
        'notified_users': notified,
        'unassigned': len(unassigned),
        'errors': errors,
    }


def _notify_admins_unassigned(customers, target_date, errors):
    """Send a notification to admins about unassigned follow-ups."""
    from notifications.utils import send_push_notification
    from collections import defaultdict

    # Group unassigned by company
    by_company = defaultdict(list)
    for c in customers:
        by_company[c.company].append(c)

    for company, company_customers in by_company.items():
        count = len(company_customers)
        try:
            from accounts.models import User
            admins = User.objects.filter(
                company=company,
                role__in=['admin', 'manager'],
                is_active=True,
            )
            for admin in admins:
                send_push_notification(
                    user=admin,
                    title=f'⚠️ {count} Unassigned Follow-up{"s" if count > 1 else ""}',
                    message=f'{count} customer(s) have follow-ups today but are unassigned.',
                    notification_type='followup_reminder',
                    data={
                        'type': 'followup_reminder_unassigned',
                        'date': str(target_date),
                        'count': count,
                        'url': '/ase-customers',
                    },
                    company=company,
                )
        except Exception as e:
            errors.append({'company': str(company), 'error': str(e)})
            logger.error(f'[FollowUp] Failed to notify admins for {company}: {e}')


def get_todays_followups_for_user(user):
    """
    Return queryset of today's follow-ups for a given user.
    Used by the API endpoint.
    """
    from .models import ASECustomer

    today = timezone.localdate()
    qs = ASECustomer.objects.filter(
        scheduled_date__date=today,
        is_converted=False,
    ).exclude(call_status='not_interested')

    if user.role == 'employee':
        return qs.filter(assigned_to=user)
    if user.role == 'manager':
        from django.db.models import Q
        employee_ids = list(
            user.__class__.objects.filter(
                manager=user, company=user.company
            ).values_list('id', flat=True)
        )
        employee_ids.append(user.id)
        return qs.filter(
            company=user.company,
            assigned_to__id__in=employee_ids,
        )
    if user.role == 'admin':
        return qs
    # hr
    return qs.filter(company=user.company)
