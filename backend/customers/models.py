from django.db import models
from django.conf import settings

class Customer(models.Model):
    CALL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('answered', 'Answered'),
        ('not_answered', 'Not Answered'),
        ('busy', 'Busy'),
        ('not_interested', 'Not Interested'),
        ('custom', 'Custom'),
    ]
    
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, unique=True)  # Make phone number unique
    call_status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='pending')
    custom_call_status = models.CharField(max_length=100, blank=True, null=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_customers')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_customers')
    scheduled_date = models.DateTimeField(null=True, blank=True)
    call_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    is_converted = models.BooleanField(default=False)
    converted_lead_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name or 'Unknown'} - {self.phone}"
    
    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None
    
    @property
    def created_by_name(self):
        return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username


class CallAllocation(models.Model):
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='call_allocations')
    date = models.DateField()
    total_allocated = models.IntegerField(default=0)
    completed = models.IntegerField(default=0)
    pending = models.IntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_allocations')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.employee.username} - {self.date} ({self.total_allocated} customers)"
    
    @property
    def employee_name(self):
        return f"{self.employee.first_name} {self.employee.last_name}".strip() or self.employee.username