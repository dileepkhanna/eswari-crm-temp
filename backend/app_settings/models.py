from django.db import models

class AppSettings(models.Model):
    """
    Application-wide settings model.
    This is a singleton model - only one instance should exist.
    """
    app_name = models.CharField(max_length=100, default='ESWARI CONNECTS')
    logo_url = models.TextField(blank=True, null=True, help_text='URL or data URL for the application logo')
    favicon_url = models.TextField(blank=True, null=True, help_text='URL or data URL for the favicon')
    primary_color = models.CharField(max_length=50, default='152 45% 28%', help_text='HSL format: "152 45% 28%"')
    accent_color = models.CharField(max_length=50, default='45 90% 50%', help_text='HSL format: "45 90% 50%"')
    sidebar_color = models.CharField(max_length=50, default='152 35% 15%', help_text='HSL format: "152 35% 15%"')
    custom_css = models.TextField(blank=True, null=True, help_text='Custom CSS styles')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'App Settings'
        verbose_name_plural = 'App Settings'
    
    def __str__(self):
        return f"App Settings - {self.app_name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and AppSettings.objects.exists():
            # If trying to create a new instance but one already exists, update the existing one
            existing = AppSettings.objects.first()
            existing.app_name = self.app_name
            existing.logo_url = self.logo_url
            existing.favicon_url = self.favicon_url
            existing.primary_color = self.primary_color
            existing.accent_color = self.accent_color
            existing.sidebar_color = self.sidebar_color
            existing.custom_css = self.custom_css
            existing.save()
            return existing
        return super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get the app settings instance, create default if none exists"""
        settings, created = cls.objects.get_or_create(
            pk=1,  # Always use ID 1 for singleton
            defaults={
                'app_name': 'ESWARI CONNECTS',
                'primary_color': '152 45% 28%',
                'accent_color': '45 90% 50%',
                'sidebar_color': '152 35% 15%',
            }
        )
        return settings