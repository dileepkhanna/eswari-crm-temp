"""
BOE Lead Model

A separate table for leads converted from research data by BOE employees.
When BOE marks data as "Interested", it gets copied here as a lead.
"""
from django.db import models
from django.conf import settings


class BOELead(models.Model):
    """
    Leads created by BOE employees from research data.
    Separate table from BREResearchData for better performance.
    """

    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    location = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    call_notes = models.TextField(blank=True, default='')

    # Status
    STATUS_CHOICES = [
        ('interested', 'Interested'),
        ('assigned_cre', 'Assigned to CRE'),
        ('in_progress', 'In Progress'),
        ('converted', 'Converted'),
        ('completed', 'Completed'),
        ('lost', 'Lost'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='interested')

    # Source reference (link back to original research data)
    source_research = models.ForeignKey(
        'ase_leads.BREResearchData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        help_text="Original research data this lead came from"
    )

    # Who created this lead (BOE employee)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='boe_leads_created',
    )

    # CRE assignment
    assigned_to_cre = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='boe_leads_cre_assigned',
    )

    # Company
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name='boe_leads',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Task tracking
    task_created = models.BooleanField(default=False, help_text="Whether a task has been created for this lead")

    class Meta:
        db_table = 'ase_leads_boelead'
        ordering = ['-created_at']
        verbose_name = 'BOE Lead'
        verbose_name_plural = 'BOE Leads'

    def __str__(self):
        return f"{self.name} - {self.phone_number}"

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None

    @property
    def assigned_to_cre_name(self):
        if self.assigned_to_cre:
            return f"{self.assigned_to_cre.first_name} {self.assigned_to_cre.last_name}".strip() or self.assigned_to_cre.username
        return None
