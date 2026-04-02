from django.db import models
from django.conf import settings


class ConversionAuditLog(models.Model):
    """
    Audit trail for customer-to-lead conversions
    Tracks all conversion attempts (success and failure) for compliance and analytics
    """
    ACTION_CHOICES = [
        ('convert_single', 'Single Conversion'),
        ('convert_bulk', 'Bulk Conversion'),
        ('conversion_failed', 'Conversion Failed'),
    ]
    
    # Action Details
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    customer_id = models.IntegerField()
    customer_phone = models.CharField(max_length=20)
    customer_name = models.CharField(max_length=255)
    lead_id = models.IntegerField(null=True, blank=True)
    
    # Context
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conversion_audits'
    )
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name='conversion_audits'
    )
    
    # Metadata
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'created_at']),
            models.Index(fields=['customer_id']),
            models.Index(fields=['lead_id']),
            models.Index(fields=['performed_by']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.customer_name} by {self.performed_by}"


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
    phone = models.CharField(max_length=20)  # Unique per company (enforced via unique_together)
    call_status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='pending')
    custom_call_status = models.CharField(max_length=100, blank=True, null=True)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        related_name='customers',
        help_text="Company this customer belongs to"
    )
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
        unique_together = [('phone', 'company')]
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['company', 'created_at']),
            models.Index(fields=['is_converted']),
            models.Index(fields=['company', 'is_converted']),
            models.Index(fields=['call_status']),
        ]
        
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