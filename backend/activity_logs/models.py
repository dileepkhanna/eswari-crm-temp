from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ActivityLog(models.Model):
    MODULE_CHOICES = [
        ('leads', 'Leads'),
        ('tasks', 'Tasks'),
        ('projects', 'Projects'),
        ('leaves', 'Leaves'),
        ('users', 'Users'),
        ('announcements', 'Announcements'),
        ('reports', 'Reports'),
    ]
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('converted', 'Converted'),
        ('assigned', 'Assigned'),
        ('completed', 'Completed'),
        ('viewed', 'Viewed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    user_name = models.CharField(max_length=100)  # Denormalized for easier queries
    user_role = models.CharField(max_length=20)   # Denormalized for easier queries
    module = models.CharField(max_length=20, choices=MODULE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['module', 'created_at']),
            models.Index(fields=['action', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user_name} {self.action} {self.module} - {self.details[:50]}"