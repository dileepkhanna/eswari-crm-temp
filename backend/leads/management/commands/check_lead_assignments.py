"""
Management command to check lead assignments
"""
from django.core.management.base import BaseCommand
from leads.models import Lead
from accounts.models import User


class Command(BaseCommand):
    help = 'Check lead assignments in the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n📊 Checking Lead Assignments...\n'))
        
        # Get all leads
        leads = Lead.objects.select_related('assigned_to', 'created_by', 'company').all()
        
        self.stdout.write(f'Total Leads: {leads.count()}\n')
        
        # Group by assignment status
        assigned_leads = leads.filter(assigned_to__isnull=False)
        unassigned_leads = leads.filter(assigned_to__isnull=True)
        
        self.stdout.write(f'Assigned Leads: {assigned_leads.count()}')
        self.stdout.write(f'Unassigned Leads: {unassigned_leads.count()}\n')
        
        # Show assigned leads details
        if assigned_leads.exists():
            self.stdout.write(self.style.SUCCESS('Assigned Leads Details:'))
            for lead in assigned_leads[:10]:  # Show first 10
                self.stdout.write(
                    f'  - Lead: {lead.name} (ID: {lead.id})\n'
                    f'    Assigned To: {lead.assigned_to.first_name} {lead.assigned_to.last_name} '
                    f'(ID: {lead.assigned_to.id}, Role: {lead.assigned_to.role})\n'
                    f'    Company: {lead.company.name}\n'
                )
        
        # Check users and their assigned leads
        self.stdout.write(self.style.SUCCESS('\n👥 Users and Their Assigned Leads:\n'))
        
        employees = User.objects.filter(role__in=['employee', 'manager']).order_by('role', 'first_name')
        
        for user in employees:
            user_leads = Lead.objects.filter(assigned_to=user)
            self.stdout.write(
                f'  {user.first_name} {user.last_name} ({user.role}): {user_leads.count()} leads'
            )
            if user_leads.exists():
                for lead in user_leads[:3]:  # Show first 3
                    self.stdout.write(f'    - {lead.name} (Status: {lead.status})')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Check complete!\n'))
