from django.db import models
from django.conf import settings


class PushSubscription(models.Model):
    """Browser Web Push subscription (VAPID). One user can have multiple devices."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.CharField(max_length=500, unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'push_subscriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:40]}..."


class FCMToken(models.Model):
    """Firebase Cloud Messaging token for mobile push notifications."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fcm_tokens')
    token = models.CharField(max_length=255, unique=True)
    device_type = models.CharField(max_length=20, default='android')
    device_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fcm_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.device_type} - {self.token[:20]}..."


class Notification(models.Model):
    """In-app notification stored in DB and delivered via polling."""
    NOTIFICATION_TYPES = [
        ('leave_request', 'Leave Request'),
        ('leave_status', 'Leave Status Update'),
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
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['company']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"
