from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Lead(models.Model):
    STATUS_CHOICES = [
        ('hot', 'Hot'),
        ('warm', 'Warm'),
        ('cold', 'Cold'),
        ('not_interested', 'Not Interested'),
        ('reminder', 'Reminder'),
    ]
    
    REQUIREMENT_TYPE_CHOICES = [
        ('villa', 'Villa'),
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('plot', 'Plot'),
    ]
    
    BHK_CHOICES = [
        ('1', '1 BHK'),
        ('2', '2 BHK'),
        ('3', '3 BHK'),
        ('4', '4 BHK'),
        ('5+', '5+ BHK'),
    ]
    
    SOURCE_CHOICES = [
        ('call', 'Call'),
        ('walk_in', 'Walk-in'),
        ('website', 'Website'),
        ('referral', 'Referral'),
    ]

    # Basic Information
    name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    
    # Requirements
    requirement_type = models.CharField(max_length=20, choices=REQUIREMENT_TYPE_CHOICES, default='apartment')
    bhk_requirement = models.CharField(max_length=3, choices=BHK_CHOICES, default='2')
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preferred_location = models.CharField(max_length=200, blank=True)
    
    # Lead Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='hot')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='website')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leads', null=True, blank=True)
    
    # Project Assignment
    assigned_project = models.CharField(max_length=100, blank=True, null=True)
    
    # Notes and Follow-up
    description = models.TextField(blank=True, help_text="Lead description and notes")
    follow_up_date = models.DateTimeField(null=True, blank=True, help_text="Date and time for follow-up reminder")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"