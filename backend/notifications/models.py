from django.db import models
from django.conf import settings


class PushSubscription(models.Model):
    """Store push notification subscriptions for users"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'push_subscriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:50]}..."


class Notification(models.Model):
    """Store notification history"""
    NOTIFICATION_TYPES = [
        ('leave_approved', 'Leave Approved'),
        ('leave_rejected', 'Leave Rejected'),
        ('leave_pending', 'Leave Pending'),
        ('announcement', 'Announcement'),
        ('task_assigned', 'Task Assigned'),
        ('task_updated', 'Task Updated'),
        ('project_updated', 'Project Updated'),
        ('lead_assigned', 'Lead Assigned'),
        ('customer_updated', 'Customer Updated'),
        ('system_alert', 'System Alert'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        related_name='notifications',
        null=True,
        blank=True,
        help_text="Company this notification belongs to"
    )
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['company']),
            models.Index(fields=['company', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"
