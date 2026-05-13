"""
BRE Research Data Model

A dedicated table for BRE employees to upload and manage research data.
Fields: name, phone_number, location, notes, created_by, assigned_to
"""
from django.db import models
from django.conf import settings


class BREResearchData(models.Model):
    """
    Research data uploaded by BRE employees.
    Separate from the main ASELead table.
    """

    name = models.CharField(
        max_length=255,
        help_text="Contact person name"
    )
    phone_number = models.CharField(
        max_length=20,
        help_text="Phone number"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="City / Area / Location"
    )
    notes = models.TextField(
        blank=True,
        default='',
        help_text="Additional notes"
    )

    # Status
    STATUS_CHOICES = [
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('converted', 'Converted to Lead'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
        help_text="Status: new (unassigned), assigned (given to BOE), or converted (positive lead)"
    )

    # BOE Call Status
    CALL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('no_answer', 'No Answer'),
        ('callback', 'Call Back Later'),
        ('not_interested', 'Not Interested'),
        ('interested', 'Interested'),
    ]
    call_status = models.CharField(
        max_length=20,
        choices=CALL_STATUS_CHOICES,
        default='pending',
        blank=True,
        help_text="Call status set by BOE employee"
    )
    call_notes = models.TextField(
        blank=True,
        default='',
        help_text="Notes from BOE call"
    )

    # CRE Assignment (when converted to lead)
    assigned_to_cre = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bre_research_cre_assigned',
        help_text="CRE employee assigned after positive call"
    )

    # Who created this record
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bre_research_created',
        help_text="BRE employee who added this data"
    )

    # Who is assigned to work on this
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bre_research_assigned',
        help_text="Employee assigned to this data (auto-assigned to creator initially)"
    )

    # Company
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name='bre_research_data',
        help_text="Company this data belongs to"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ase_leads_breresearchdata'
        ordering = ['-created_at']
        verbose_name = 'BRE Research Data'
        verbose_name_plural = 'BRE Research Data'
        unique_together = [('phone_number', 'company')]
        indexes = [
            models.Index(fields=['company', 'created_by']),
            models.Index(fields=['company', 'assigned_to']),
            models.Index(fields=['phone_number']),
        ]

    def __str__(self):
        return f"{self.name} - {self.phone_number}"

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None
