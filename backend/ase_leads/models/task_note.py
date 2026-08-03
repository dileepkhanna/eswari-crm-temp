"""
ASE Lead Task Note Model
Manages notes/comments on tasks
"""
from django.db import models
from django.conf import settings


class TaskNote(models.Model):
    """
    Notes/comments on ASE Lead Tasks
    
    This model stores historical notes for tracking task progress and communications.
    Notes are append-only to maintain audit trail.
    """
    
    task = models.ForeignKey(
        'ase_leads.ASELeadTask',
        on_delete=models.CASCADE,
        related_name='notes',
        help_text="The task this note belongs to"
    )
    
    note = models.TextField(
        max_length=500,
        help_text="Note content (max 500 characters)"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_notes',
        help_text="User who created this note"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this note was created"
    )
    
    class Meta:
        ordering = ['-created_at']  # Newest first
        verbose_name = 'Task Note'
        verbose_name_plural = 'Task Notes'
        indexes = [
            models.Index(fields=['task', '-created_at']),
        ]
    
    def __str__(self):
        task_title = getattr(self.task, 'title', 'Unknown Task')
        return f"Note on {task_title} by {self.created_by_name} at {self.created_at}"
    
    @property
    def created_by_name(self):
        """Return the full name of the user who created this note"""
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return "Unknown User"
