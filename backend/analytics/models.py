from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class ReportSchedule(models.Model):
    """
    Configuration for automated scheduled reports.
    Defines what report to generate, how often, and who receives it.
    """
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly (Monday)'),
        ('monthly', 'Monthly (1st)'),
    ]

    REPORT_TYPE_CHOICES = [
        ('overview', 'Cross-Company Overview'),
        ('funnel', 'Conversion Funnel'),
        ('scorecards', 'Employee Scorecards'),
        ('revenue', 'Revenue Summary'),
        ('capital', 'Capital Services Report'),
    ]

    name = models.CharField(max_length=200, help_text="Report name/title")
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='weekly')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES, default='overview')
    recipients = models.JSONField(
        default=list,
        help_text="List of email addresses to send the report to"
    )
    is_active = models.BooleanField(default=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    next_send_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_report_schedules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"

    def save(self, *args, **kwargs):
        # Auto-calculate next_send_at if not set
        if not self.next_send_at:
            now = timezone.now()
            if self.frequency == 'daily':
                self.next_send_at = now + timedelta(days=1)
            elif self.frequency == 'weekly':
                days_until_monday = (7 - now.weekday()) % 7 or 7
                self.next_send_at = now + timedelta(days=days_until_monday)
            elif self.frequency == 'monthly':
                if now.month == 12:
                    self.next_send_at = now.replace(year=now.year + 1, month=1, day=1)
                else:
                    self.next_send_at = now.replace(month=now.month + 1, day=1)
        super().save(*args, **kwargs)
