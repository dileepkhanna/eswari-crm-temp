"""
Django management command to fix Capital employee assignments.
Ensures all Capital records created by employees are assigned to themselves.

Usage:
    python manage.py fix_capital_employee_assignments
"""
from django.core.management.base import BaseCommand
from django.db import models
from django.db.models import Q, F
from accounts.models import User
from capital.models import CapitalCustomer, CapitalLead, CapitalLoan, CapitalService, CapitalTask


class Command(BaseCommand):
    help = 'Fix Capital employee assignments - assign records to their creators if they are employees'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Capital employee assignment fix...'))
        
        total_fixed = 0
        
        # Fix Capital Customers (Calls)
        self.stdout.write('\n=== Fixing Capital Customers (Calls) ===')
        employee_customers = CapitalCustomer.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        customers_count = employee_customers.count()
        self.stdout.write(f'Found {customers_count} customers to fix')
        
        for customer in employee_customers:
            old_assignee = customer.assigned_to.username if customer.assigned_to else 'None'
            customer.assigned_to = customer.created_by
            customer.save(update_fields=['assigned_to'])
            total_fixed += 1
            self.stdout.write(
                f'  Fixed Customer #{customer.id}: {customer.name or customer.phone} - '
                f'Changed from {old_assignee} to {customer.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {customers_count} Capital Customers'))
        
        # Fix Capital Leads
        self.stdout.write('\n=== Fixing Capital Leads ===')
        employee_leads = CapitalLead.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        leads_count = employee_leads.count()
        self.stdout.write(f'Found {leads_count} leads to fix')
        
        for lead in employee_leads:
            old_assignee = lead.assigned_to.username if lead.assigned_to else 'None'
            lead.assigned_to = lead.created_by
            lead.save(update_fields=['assigned_to'])
            total_fixed += 1
            self.stdout.write(
                f'  Fixed Lead #{lead.id}: {lead.name} - '
                f'Changed from {old_assignee} to {lead.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {leads_count} Capital Leads'))
        
        # Fix Capital Loans
        self.stdout.write('\n=== Fixing Capital Loans ===')
        employee_loans = CapitalLoan.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        loans_count = employee_loans.count()
        self.stdout.write(f'Found {loans_count} loans to fix')
        
        for loan in employee_loans:
            old_assignee = loan.assigned_to.username if loan.assigned_to else 'None'
            loan.assigned_to = loan.created_by
            loan.save(update_fields=['assigned_to'])
            total_fixed += 1
            self.stdout.write(
                f'  Fixed Loan #{loan.id}: {loan.applicant_name} - '
                f'Changed from {old_assignee} to {loan.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {loans_count} Capital Loans'))
        
        # Fix Capital Services
        self.stdout.write('\n=== Fixing Capital Services ===')
        employee_services = CapitalService.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        services_count = employee_services.count()
        self.stdout.write(f'Found {services_count} services to fix')
        
        for service in employee_services:
            old_assignee = service.assigned_to.username if service.assigned_to else 'None'
            service.assigned_to = service.created_by
            service.save(update_fields=['assigned_to'])
            total_fixed += 1
            self.stdout.write(
                f'  Fixed Service #{service.id}: {service.client_name} - '
                f'Changed from {old_assignee} to {service.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {services_count} Capital Services'))
        
        # Fix Capital Tasks
        self.stdout.write('\n=== Fixing Capital Tasks ===')
        employee_tasks = CapitalTask.objects.filter(
            created_by__role='employee'
        ).exclude(
            assigned_to=F('created_by')
        ).select_related('created_by', 'assigned_to')
        
        tasks_count = employee_tasks.count()
        self.stdout.write(f'Found {tasks_count} tasks to fix')
        
        for task in employee_tasks:
            old_assignee = task.assigned_to.username if task.assigned_to else 'None'
            task.assigned_to = task.created_by
            task.save(update_fields=['assigned_to'])
            total_fixed += 1
            self.stdout.write(
                f'  Fixed Task #{task.id}: {task.title} - '
                f'Changed from {old_assignee} to {task.created_by.username}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Fixed {tasks_count} Capital Tasks'))
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(
            f'SUMMARY:\n'
            f'  Capital Customers fixed: {customers_count}\n'
            f'  Capital Leads fixed: {leads_count}\n'
            f'  Capital Loans fixed: {loans_count}\n'
            f'  Capital Services fixed: {services_count}\n'
            f'  Capital Tasks fixed: {tasks_count}\n'
            f'  Total fixed: {total_fixed}'
        ))
        self.stdout.write('='*50)
