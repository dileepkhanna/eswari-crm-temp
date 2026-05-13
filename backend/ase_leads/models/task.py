"""
ASE Lead Task Model
Manages tasks and follow-ups for ASE leads
"""
from django.db import models
from django.conf import settings


class ASELeadTask(models.Model):
    """
    Tasks and follow-ups for ASE leads
    
    This model manages all tasks related to lead management including:
    - Calls to make
    - Emails to send
    - Meetings to schedule
    - Research tasks
    - Proposals to prepare
    - Follow-ups
    """
    
    TASK_TYPE_CHOICES = [
        ('call', 'Make Call'),
        ('email', 'Send Email'),
        ('meeting', 'Schedule Meeting'),
        ('research', 'Research'),
        ('proposal', 'Prepare Proposal'),
        ('followup', 'Follow Up'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Relationships
    lead = models.ForeignKey(
        'ase_leads.ASELead',
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,
        blank=True,
        help_text="The lead this task is associated with"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ase_lead_tasks',
        help_text="User assigned to complete this task"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_ase_lead_tasks',
        help_text="User who created this task"
    )
    
    # Task Details
    task_type = models.CharField(
        max_length=20,
        choices=TASK_TYPE_CHOICES,
        help_text="Type of task to be performed"
    )
    title = models.CharField(
        max_length=255,
        help_text="Brief title or summary of the task"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed description of the task"
    )
    
    # Priority and Status
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Priority level of the task"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of the task"
    )
    
    # Scheduling
    due_date = models.DateTimeField(
        help_text="When this task is due"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this task was completed"
    )
    
    # Reminder
    reminder_sent = models.BooleanField(
        default=False,
        help_text="Whether a reminder has been sent for this task"
    )
    reminder_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to send a reminder for this task"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this task was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this task was last updated"
    )
    
    class Meta:
        ordering = ['due_date', '-priority']
        verbose_name = 'ASE Lead Task'
        verbose_name_plural = 'ASE Lead Tasks'
        indexes = [
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['lead', 'status']),
            models.Index(fields=['due_date', 'status']),
            models.Index(fields=['assigned_to', 'due_date']),
            models.Index(fields=['status', 'priority', 'due_date']),
        ]
    
    def __str__(self):
        return f"{self.get_task_type_display()} - {self.lead.company_name} - Due: {self.due_date.strftime('%Y-%m-%d')}"
    
    @property
    def assigned_to_name(self):
        """Return the full name of the user assigned to this task"""
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None
    
    @property
    def created_by_name(self):
        """Return the full name of the user who created this task"""
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None
    
    @property
    def is_overdue(self):
        """Check if this task is overdue"""
        if self.status not in ['completed', 'cancelled']:
            from django.utils import timezone
            return timezone.now() > self.due_date
        return False
    
    @property
    def is_due_soon(self):
        """Check if this task is due within the next 24 hours"""
        if self.status not in ['completed', 'cancelled']:
            from django.utils import timezone
            from datetime import timedelta
            now = timezone.now()
            return now < self.due_date <= now + timedelta(hours=24)
        return False
    
    @property
    def priority_order(self):
        """Return numeric priority for sorting (higher = more urgent)"""
        priority_map = {
            'urgent': 4,
            'high': 3,
            'medium': 2,
            'low': 1,
        }
        return priority_map.get(self.priority, 0)
