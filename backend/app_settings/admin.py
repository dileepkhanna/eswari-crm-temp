from django.contrib import admin
from .models import AppSettings

@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ['app_name', 'primary_color', 'accent_color', 'updated_at']
    fields = [
        'app_name', 
        'logo_url', 
        'favicon_url', 
        'primary_color', 
        'accent_color', 
        'sidebar_color', 
        'custom_css'
    ]
    
    def has_add_permission(self, request):
        # Only allow one instance (singleton)
        return not AppSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False