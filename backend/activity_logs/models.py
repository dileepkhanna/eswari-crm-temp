from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ActivityLog(models.Model):
    MODULE_CHOICES = [
        ('leads', 'Leads'),
        ('customers', 'Customers'),  # Added customers
        ('tasks', 'Tasks'),
        ('projects', 'Projects'),
        ('leaves', 'Leaves'),
        ('users', 'Users'),
        ('announcements', 'Announcements'),
        ('reports', 'Reports'),
    ]
    
    ACTION_CHOICES = [
        ('create', 'Create'),      # Changed to present tense to match frontend
        ('created', 'Created'),    # Keep both for compatibility
        ('update', 'Update'),      # Changed to present tense to match frontend
        ('updated', 'Updated'),    # Keep both for compatibility
        ('delete', 'Delete'),      # Changed to present tense to match frontend
        ('deleted', 'Deleted'),    # Keep both for compatibility
        ('view', 'View'),          # Changed to present tense to match frontend
        ('viewed', 'Viewed'),      # Keep both for compatibility
        ('approve', 'Approve'),    # Changed to present tense to match frontend
        ('approved', 'Approved'),  # Keep both for compatibility
        ('reject', 'Reject'),      # Changed to present tense to match frontend
        ('rejected', 'Rejected'),  # Keep both for compatibility
        ('convert', 'Convert'),    # Changed to present tense to match frontend
        ('converted', 'Converted'), # Keep both for compatibility
        ('assign', 'Assign'),      # Changed to present tense to match frontend
        ('assigned', 'Assigned'),  # Keep both for compatibility
        ('complete', 'Complete'),  # Changed to present tense to match frontend
        ('completed', 'Completed'), # Keep both for compatibility
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