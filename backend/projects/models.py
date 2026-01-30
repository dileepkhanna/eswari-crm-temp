from django.db import models
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class Project(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    TYPE_CHOICES = [
        ('villa', 'Villa'),
        ('apartment', 'Apartment'),
        ('plots', 'Plots'),
    ]

    # Basic project information
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=300)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='apartment')
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    
    # Pricing information
    priceMin = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Minimum price in rupees")
    priceMax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Maximum price in rupees")
    
    # Date information
    launchDate = models.DateField(null=True, blank=True, help_text="Project launch date")
    possessionDate = models.DateField(null=True, blank=True, help_text="Expected possession date")
    
    # Additional details
    towerDetails = models.TextField(blank=True, help_text="Tower/Building details")
    amenities = models.JSONField(default=list, blank=True, help_text="List of amenities")
    nearbyLandmarks = models.JSONField(default=list, blank=True, help_text="List of nearby landmarks")
    
    # Image fields
    coverImage = models.URLField(blank=True, help_text="Cover/Project image URL")
    blueprintImage = models.URLField(blank=True, help_text="Blueprint/Plan image URL")
    
    # Legacy fields for backward compatibility (can be removed later)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_projects')
    team_members = models.ManyToManyField(User, blank=True, related_name='projects')
    
    # Legacy image fields (for backward compatibility)
    cover_image = models.URLField(blank=True)
    blueprint_image = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Sync new fields with legacy fields for backward compatibility
        if self.coverImage and not self.cover_image:
            self.cover_image = self.coverImage
        elif self.cover_image and not self.coverImage:
            self.coverImage = self.cover_image
            
        if self.blueprintImage and not self.blueprint_image:
            self.blueprint_image = self.blueprintImage
        elif self.blueprint_image and not self.blueprintImage:
            self.blueprintImage = self.blueprint_image
            
        if self.launchDate and not self.start_date:
            self.start_date = self.launchDate
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']