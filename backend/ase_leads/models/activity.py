"""
ASE Lead Activity Model
Tracks all activities and interactions with ASE leads
"""
from django.db import models
from django.conf import settings


class ASELeadActivity(models.Model):
    """
    Track all activities on ASE leads
    
    This model logs all interactions with leads including:
    - Phone calls
    - Emails
    - Meetings
    - Notes
    - Status changes
    - Assignment changes
    """
    
    ACTIVITY_TYPE_CHOICES = [
        ('call', 'Phone Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('note', 'Note'),
        ('status_change', 'Status Change'),
        ('assignment', 'Assignment'),
    ]
    
    # Relationships
    lead = models.ForeignKey(
        'ase_leads.ASELead',
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="The lead this activity is associated with"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ase_lead_activities',
        help_text="User who performed this activity"
    )
    
    # Activity Details
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPE_CHOICES,
        help_text="Type of activity"
    )
    title = models.CharField(
        max_length=255,
        help_text="Brief title or summary of the activity"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed description of the activity"
    )
    outcome = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Outcome or result of the activity"
    )
    
    # Call-specific fields
    call_duration_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text="Duration of the call in minutes"
    )
    call_outcome = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Outcome of the call (answered, voicemail, no answer, etc.)"
    )
    
    # Email-specific fields
    email_subject = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Subject line of the email"
    )
    email_opened = models.BooleanField(
        default=False,
        help_text="Whether the email was opened by the recipient"
    )
    email_clicked = models.BooleanField(
        default=False,
        help_text="Whether any links in the email were clicked"
    )
    
    # Meeting-specific fields
    meeting_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Scheduled date and time of the meeting"
    )
    meeting_attendees = models.JSONField(
        default=list,
        help_text="List of meeting attendees"
    )
    
    # Follow-up tracking
    requires_followup = models.BooleanField(
        default=False,
        help_text="Whether this activity requires a follow-up"
    )
    followup_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when follow-up is due"
    )
    followup_completed = models.BooleanField(
        default=False,
        help_text="Whether the follow-up has been completed"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this activity was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this activity was last updated"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'ASE Lead Activity'
        verbose_name_plural = 'ASE Lead Activities'
        indexes = [
            models.Index(fields=['lead', 'activity_type']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['requires_followup', 'followup_date']),
            models.Index(fields=['lead', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.lead.company_name} - {self.created_at.strftime('%Y-%m-%d')}"
    
    @property
    def user_name(self):
        """Return the full name of the user who performed this activity"""
        if self.user:
            return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        return None
    
    @property
    def is_overdue_followup(self):
        """Check if this activity has an overdue follow-up"""
        if self.requires_followup and not self.followup_completed and self.followup_date:
            from django.utils import timezone
            return timezone.now() > self.followup_date
        return False
