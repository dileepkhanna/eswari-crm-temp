from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


class ASECustomer(models.Model):
    """
    ASE Technologies Simple Customer Model
    Similar to Eswari Group customers with basic fields
    """
    
    # Call status choices (same as regular customers)
    CALL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('answered', 'Answered'),
        ('not_answered', 'Not Answered'),
        ('busy', 'Busy'),
        ('not_interested', 'Not Interested'),
        ('custom', 'Custom'),
    ]
    
    # Priority choices
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Service interest choices (same as ASE Leads)
    SERVICE_CHOICES = [
        ('seo', 'SEO'),
        ('social_media', 'Social Media Marketing'),
        ('content_marketing', 'Content Marketing'),
        ('ppc', 'Pay-Per-Click Advertising'),
        ('email_marketing', 'Email Marketing'),
        ('web_design', 'Web Design & Development'),
        ('branding', 'Branding & Design'),
        ('analytics', 'Analytics & Reporting'),
        ('influencer', 'Influencer Marketing'),
        ('video_marketing', 'Video Marketing'),
        ('school_management', 'School Management'),
        ('custom', 'Custom/Other Services'),
    ]
    
    # Basic Information
    name = models.CharField(max_length=255, blank=True, null=True, help_text="Customer name (optional)")
    phone = models.CharField(max_length=20, help_text="Primary phone number (required)")
    email = models.EmailField(blank=True, null=True, help_text="Email address (optional)")
    company_name = models.CharField(max_length=255, blank=True, null=True, help_text="Company name (optional)")
    
    # Call Management
    call_status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='pending', help_text="Call status")
    custom_call_status = models.CharField(max_length=100, blank=True, null=True, help_text="Custom call status")
    
    # Assignment and Company
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        related_name='ase_customers',
        help_text="Company this customer belongs to"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_ase_customers',
        help_text="Assigned team member"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_ase_customers',
        help_text="User who created this customer"
    )
    
    # Scheduling and Dates
    scheduled_date = models.DateTimeField(null=True, blank=True, help_text="Scheduled call date")
    call_date = models.DateTimeField(null=True, blank=True, help_text="Actual call date")
    
    # Service Interests
    service_interests = models.JSONField(default=list, blank=True, help_text="Digital marketing services of interest")
    custom_services = models.TextField(blank=True, null=True, help_text="Custom services not in predefined list")
    
    # Notes (max 500 characters)
    notes = models.TextField(blank=True, null=True, help_text="Customer notes (max 500 characters)")
    
    # Conversion tracking
    is_converted = models.BooleanField(default=False, help_text="Converted to lead")
    converted_lead_id = models.CharField(max_length=50, blank=True, null=True, help_text="ID of converted lead")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'ASE Customer'
        verbose_name_plural = 'ASE Customers'
        unique_together = [('phone', 'company')]
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['call_status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['company', 'call_status']),
            models.Index(fields=['company', 'created_at']),
            models.Index(fields=['is_converted']),
        ]
    
    def __str__(self):
        display_name = self.name or self.company_name or "Unnamed Customer"
        return f"{display_name} - {self.phone}"
    
    def clean(self):
        """Validate model fields"""
        super().clean()
        # Validate notes length (max 500 characters)
        if self.notes and len(self.notes) > 500:
            raise ValidationError({'notes': 'Notes cannot exceed 500 characters.'})
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def service_interests_display(self):
        """Return human-readable service interests"""
        if not self.service_interests:
            return []
        
        service_dict = dict(self.SERVICE_CHOICES)
        return [service_dict.get(service, service) for service in self.service_interests]
    
    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None
    
    @property
    def created_by_name(self):
        return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username


class CallLog(models.Model):
    """
    Tracks every call/status update made on an ASE Customer.
    """
    customer = models.ForeignKey(
        ASECustomer,
        on_delete=models.CASCADE,
        related_name='call_logs',
    )
    called_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='call_logs',
    )
    call_status = models.CharField(max_length=20, choices=ASECustomer.CALL_STATUS_CHOICES)
    custom_status = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True, help_text="Call notes (max 500 characters)")
    called_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-called_at']
        indexes = [
            models.Index(fields=['customer', 'called_at']),
        ]
    
    def clean(self):
        """Validate notes length"""
        super().clean()
        if self.notes and len(self.notes) > 500:
            raise ValidationError({'notes': 'Call notes cannot exceed 500 characters.'})
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        caller = self.called_by.username if self.called_by else 'Unknown'
        return f"{self.customer} — {self.call_status} by {caller} at {self.called_at}"


class CustomerNote(models.Model):
    """
    Append-only conversation notes for an ASE Customer.
    Each entry is immutable — employees add new notes rather than overwriting.
    Max 500 characters per note.
    """
    customer = models.ForeignKey(
        ASECustomer,
        on_delete=models.CASCADE,
        related_name='note_entries',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='customer_notes',
    )
    content = models.TextField(help_text="Note content (max 500 characters)")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'created_at']),
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

    def __str__(self):
        author = self.author.username if self.author else 'Unknown'
        return f"Note by {author} on {self.customer} at {self.created_at}"
