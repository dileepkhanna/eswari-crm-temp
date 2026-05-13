from django.contrib import admin
from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'team_type', 'company', 'team_lead', 'member_count', 'is_active', 'created_at']
    list_filter = ['team_type', 'is_active', 'company', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'team_type', 'description', 'company')
        }),
        ('Team Lead', {
            'fields': ('team_lead',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def member_count(self, obj):
        return obj.member_count
    member_count.short_description = 'Members'
