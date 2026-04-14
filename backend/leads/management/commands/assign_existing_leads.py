"""
Management command to assign existing unassigned leads to employees
"""
from django.core.management.base import BaseCommand
from leads.models import Lead
from accounts.models import User
import random


class Command(BaseCommand):
    help = 'Assign existing unassigned leads to employees'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n🔄 Assigning Unassigned Leads...\n'))
        
        # Get all unassigned leads
        unassigned_leads = Lead.objects.filter(assigned_to__isnull=True).select_related('company')
        
        self.stdout.write(f'Found {unassigned_leads.count()} unassigned leads\n')
        
        if unassigned_leads.count() == 0:
            self.stdout.write(self.style.SUCCESS('No unassigned leads found!\n'))
            return
        
        # Group leads by company
        leads_by_company = {}
        for lead in unassigned_leads:
            company_id = lead.company.id
            if company_id not in leads_by_company:
                leads_by_company[company_id] = []
            leads_by_company[company_id].append(lead)
        
        total_assigned = 0
        
        # Assign leads for each company
        for company_id, leads in leads_by_company.items():
            # Get employees and managers for this company
            employees = list(User.objects.filter(
                company_id=company_id,
                role__in=['employee', 'manager'],
                is_active=True
            ))
            
            if not employees:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠ No employees found for company ID {company_id}, skipping {len(leads)} leads'
                    )
                )
                continue
            
            self.stdout.write(f'  Assigning {len(leads)} leads to {len(employees)} employees in company ID {company_id}')
            
            # Round-robin assignment
            for i, lead in enumerate(leads):
                assigned_employee = employees[i % len(employees)]
                lead.assigned_to = assigned_employee
                lead.save()
                total_assigned += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Assigned {len(leads)} leads in company ID {company_id}'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully assigned {total_assigned} leads!\n'
            )
        )
