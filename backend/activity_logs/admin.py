from django.contrib import admin
from .models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user_name', 'module', 'action', 'details', 'created_at']
    list_filter = ['module', 'action', 'user_role', 'created_at']
    search_fields = ['user_name', 'details']
    readonly_fields = ['created_at']
    ordering = ['-created_at']