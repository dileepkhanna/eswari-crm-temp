from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class LeadNote(models.Model):
    """
    Append-only conversation notes for an ASE Lead.
    Each entry is immutable — employees add new notes rather than overwriting.
    Max 500 characters per note.
    """
    lead = models.ForeignKey(
        'ASELead',
        on_delete=models.CASCADE,
        related_name='note_entries',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='lead_notes',
    )
    content = models.TextField(help_text="Note content (max 500 characters)")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lead', 'created_at']),
        ]
    
    def clean(self):
        """Validate note content length"""
        super().clean()
        if self.content and len(self.content) > 500:
            raise ValidationError({'content': 'Note cannot exceed 500 characters.'})
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.clean()
        super().save(*args, **kwargs)
