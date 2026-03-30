from django.db import models
from django.conf import settings


class ASELead(models.Model):
    """
    ASE Technologies Digital Marketing Lead Model
    Contains all the digital marketing specific fields that were previously in ASECustomer
    """
    
    # Status choices for digital marketing leads
    STATUS_CHOICES = [
        ('new', 'New Lead'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('proposal_sent', 'Proposal Sent'),
        ('negotiating', 'Negotiating'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('on_hold', 'On Hold'),
        ('nurturing', 'Nurturing'),
    ]
    
    # Service interest choices
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
        ('custom', 'Custom/Other Services'),
    ]
    
    # Industry choices
    INDUSTRY_CHOICES = [
        ('technology', 'Technology'),
        ('healthcare', 'Healthcare'),
        ('finance', 'Finance'),
        ('retail', 'Retail & E-commerce'),
        ('real_estate', 'Real Estate'),
        ('education', 'Education'),
        ('hospitality', 'Hospitality & Tourism'),
        ('manufacturing', 'Manufacturing'),
        ('professional_services', 'Professional Services'),
        ('non_profit', 'Non-Profit'),
        ('automotive', 'Automotive'),
        ('food_beverage', 'Food & Beverage'),
        ('fashion', 'Fashion & Beauty'),
        ('sports_fitness', 'Sports & Fitness'),
        ('entertainment', 'Entertainment & Media'),
        ('other', 'Other'),
    ]
    
    # Basic Information
    company_name = models.CharField(max_length=255, help_text="Company or business name")
    contact_person = models.CharField(max_length=255, help_text="Primary contact person name")
    email = models.EmailField(blank=True, null=True, help_text="Primary email address")
    phone = models.CharField(max_length=20, help_text="Primary phone number")
    website = models.URLField(blank=True, null=True, help_text="Company website URL")
    
    # Business Information
    industry = models.CharField(max_length=50, choices=INDUSTRY_CHOICES, help_text="Industry sector")
    company_size = models.CharField(max_length=50, blank=True, null=True, help_text="Number of employees")
    annual_revenue = models.CharField(max_length=100, blank=True, null=True, help_text="Annual revenue range")
    
    # Marketing Information
    service_interests = models.JSONField(default=list, help_text="List of interested services")
    custom_services = models.TextField(blank=True, null=True, help_text="Custom services not in predefined list")
    current_marketing_spend = models.CharField(max_length=100, blank=True, null=True, help_text="Current monthly marketing spend")
    budget_amount = models.CharField(max_length=100, blank=True, null=True, help_text="Budget amount for services")
    
    # Current Marketing Status
    has_website = models.BooleanField(default=True, help_text="Does the company have a website?")
    has_social_media = models.BooleanField(default=False, help_text="Active on social media?")
    current_seo_agency = models.CharField(max_length=255, blank=True, null=True, help_text="Current SEO/Marketing agency")
    marketing_goals = models.TextField(blank=True, null=True, help_text="Primary marketing goals and objectives")
    
    # Lead Information
    lead_source = models.CharField(max_length=100, blank=True, null=True, help_text="How did they find us?")
    referral_source = models.CharField(max_length=255, blank=True, null=True, help_text="Referral source if applicable")
    
    # Status and Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', help_text="Current status")
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium', help_text="Priority level")
    
    # Assignment and Company
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        related_name='ase_leads',
        help_text="Company this lead belongs to"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_ase_leads',
        help_text="Assigned team member"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_ase_leads',
        help_text="User who created this lead"
    )
    
    # Important Dates
    first_contact_date = models.DateTimeField(null=True, blank=True, help_text="Date of first contact")
    last_contact_date = models.DateTimeField(null=True, blank=True, help_text="Date of last contact")
    next_follow_up = models.DateTimeField(null=True, blank=True, help_text="Next follow-up date")
    proposal_sent_date = models.DateTimeField(null=True, blank=True, help_text="Date proposal was sent")
    contract_start_date = models.DateTimeField(null=True, blank=True, help_text="Contract start date")
    
    # Financial Information
    estimated_project_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        help_text="Estimated project value in INR"
    )
    monthly_retainer = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        help_text="Monthly retainer amount in INR"
    )
    
    # Notes and Communication
    notes = models.TextField(blank=True, null=True, help_text="Internal notes and comments")
    communication_log = models.JSONField(default=list, help_text="Log of communications")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'ASE Lead'
        verbose_name_plural = 'ASE Leads'
        unique_together = [('phone', 'company')]
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['industry']),
            models.Index(fields=['priority']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.company_name} - {self.contact_person}"
    
    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None
    
    @property
    def created_by_name(self):
        return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
    
    @property
    def service_interests_display(self):
        """Return human-readable service interests"""
        if not self.service_interests:
            return []
        
        service_dict = dict(self.SERVICE_CHOICES)
        return [service_dict.get(service, service) for service in self.service_interests]