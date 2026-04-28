"""
Django management command to fix employee assignments.
Ensures all calls/leads created by employees are assigned to themselves.

Usage:
    python manage.py fix_employee_assignments
"""
from django.core.management.base import BaseCommand
from django.db import models
from django.db.models import Q, F
from accounts.models import User
from ase_customers.models import ASECustomer
from ase_leads.models import ASELead


class Command(BaseCommand):
    help = 'Fix employee assignments - assign calls/leads to their creators if they are employees'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting employee assignment fix...'))
        
        # Fix ASE Customers (Calls)
        self.stdout.write('\n=== Fixing ASE Customers (Calls) ===')
        
        # Find all calls created by employees where assigned_to is different from created_by
        employee_calls = ASECustomer.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        calls_count = employee_calls.count()
        self.stdout.write(f'Found {calls_count} calls to fix')
        
        fixed_calls = 0
        for call in employee_calls:
            old_assignee = call.assigned_to.username if call.assigned_to else 'None'
            call.assigned_to = call.created_by
            call.save(update_fields=['assigned_to'])
            fixed_calls += 1
            self.stdout.write(
                f'  Fixed Call #{call.id}: {call.name or call.phone} - '
                f'Changed from {old_assignee} to {call.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {fixed_calls} ASE Calls'))
        
        # Fix ASE Leads
        self.stdout.write('\n=== Fixing ASE Leads ===')
        
        # Find all leads created by employees where assigned_to is different from created_by
        employee_leads = ASELead.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        leads_count = employee_leads.count()
        self.stdout.write(f'Found {leads_count} leads to fix')
        
        fixed_leads = 0
        for lead in employee_leads:
            old_assignee = lead.assigned_to.username if lead.assigned_to else 'None'
            lead.assigned_to = lead.created_by
            lead.save(update_fields=['assigned_to'])
            fixed_leads += 1
            self.stdout.write(
                f'  Fixed Lead #{lead.id}: {lead.contact_person} - '
                f'Changed from {old_assignee} to {lead.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {fixed_leads} ASE Leads'))
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(
            f'SUMMARY:\n'
            f'  ASE Calls fixed: {fixed_calls}\n'
            f'  ASE Leads fixed: {fixed_leads}\n'
            f'  Total fixed: {fixed_calls + fixed_leads}'
        ))
        self.stdout.write('='*50)
