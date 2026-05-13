from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Team(models.Model):
    """
    Team model for ASE Technologies
    Organizes employees into different departments/teams
    """
    
    TEAM_TYPE_CHOICES = [
        ('technical', 'Technical Team'),
        ('marketing', 'Marketing Team'),
    ]
    
    # Marketing team categories (for ASE Technologies Marketing Teams)
    MARKETING_CATEGORY_CHOICES = [
        ('bre', 'Business Research Executive (BRE)'),
        ('boe', 'Business Outreach Executive (BOE)'),
        ('cre', 'Client Research Executive (CRE)'),
        ('marketing_lead', 'Marketing Team Lead'),
    ]
    
    name = models.CharField(max_length=100, help_text="Team name (e.g., 'Frontend Development', 'SEO Team')")
    team_type = models.CharField(max_length=20, choices=TEAM_TYPE_CHOICES, help_text="Type of team")
    
    # Marketing team category (only for marketing teams)
    marketing_category = models.CharField(
        max_length=20,
        choices=MARKETING_CATEGORY_CHOICES,
        blank=True,
        null=True,
        help_text="Marketing team category (only for marketing teams)"
    )
    
    description = models.TextField(blank=True, null=True, help_text="Team description and responsibilities")
    
    # Team lead
    team_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_teams',
        help_text="Team leader/manager"
    )
    
    # Company association (ASE Technologies)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name='teams',
        help_text="Company this team belongs to"
    )
    
    # Status
    is_active = models.BooleanField(default=True, help_text="Is this team currently active?")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['team_type', 'name']
        verbose_name = 'Team'
        verbose_name_plural = 'Teams'
        unique_together = [('name', 'company')]
        indexes = [
            models.Index(fields=['company', 'team_type']),
            models.Index(fields=['company', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_team_type_display()})"
    
    def clean(self):
        """
        Validate that marketing categories are only used for ASE Technologies.
        """
        super().clean()
        
        # Check if marketing_category is set
        if self.marketing_category:
            # Ensure it's only for ASE Technologies (company code 'ASE')
            if self.company and self.company.code != 'ASE':
                raise ValidationError({
                    'marketing_category': 'Marketing team categories are only available for ASE Technologies. '
                                        'Other companies cannot use marketing categories.'
                })
            
            # Ensure team_type is 'marketing' when marketing_category is set
            if self.team_type != 'marketing':
                raise ValidationError({
                    'marketing_category': 'Marketing category can only be set for teams with team_type="marketing".'
                })
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def member_count(self):
        """Return the number of members in this team"""
        return self.members.count()
    
    @property
    def team_lead_name(self):
        """Return team lead's full name"""
        if self.team_lead:
            return f"{self.team_lead.first_name} {self.team_lead.last_name}".strip() or self.team_lead.username
        return None
