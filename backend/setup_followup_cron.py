#!/usr/bin/env python
"""
Set up the daily follow-up reminder cron job.
Run once: python setup_followup_cron.py
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')

import django
django.setup()


def create_cron_script():
    script = f"""#!/bin/bash
# ASE Customer Follow-up Reminder Cron Job
# Runs daily at 9:00 AM to notify users of today's scheduled follow-ups

cd {BASE_DIR}

if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

python manage.py send_followup_reminders >> followup_cron.log 2>&1
echo "$(date): Follow-up reminder job executed" >> followup_cron.log
"""
    path = BASE_DIR / 'followup_cron.sh'
    path.write_text(script)
    os.chmod(path, 0o755)
    return path


def dry_run_test():
    from ase_customers.tasks import send_followup_reminders
    from django.utils import timezone

    today = timezone.localdate()
    from ase_customers.models import ASECustomer
    count = ASECustomer.objects.filter( 
        scheduled_date__date=today,
        is_converted=False,
    ).exclude(call_status='not_interested').count()
    print(f'✅ DB query OK — {count} follow-up(s) scheduled for today ({today})')
    return True


def main():
    print('Setting up Follow-up Reminder Cron Job')
    print('=' * 45)

    if not dry_run_test():
        print('❌ DB test failed. Check your Django setup.')
        return

    script_path = create_cron_script()
    print(f'✅ Created: {script_path}')
    print()
    print('Add to crontab (crontab -e):')
    print(f'  0 9 * * * {script_path}')
    print()
    print('Test manually:')
    print('  python manage.py send_followup_reminders --dry-run')
    print('  python manage.py send_followup_reminders')
    print()
    print('Windows Task Scheduler equivalent:')
    print('  Program: python')
    print(f'  Arguments: {BASE_DIR}\\manage.py send_followup_reminders')
    print(f'  Start in: {BASE_DIR}')
    print('  Trigger: Daily at 9:00 AM')


if __name__ == '__main__':
    main()
