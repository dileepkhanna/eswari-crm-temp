from django.contrib import admin
from .models import ASELead


@admin.register(ASELead)
class ASELeadAdmin(admin.ModelAdmin):
    list_display = [
        'company_name', 
        'contact_person', 
        'email', 
        'phone', 
        'status', 
        'priority',
        'industry',
        'budget_amount',
        'assigned_to',
        'created_at'
    ]
    list_filter = [
        'status', 
        'priority', 
        'industry', 
        'has_website',
        'has_social_media',
        'company',
        'created_at'
    ]
    search_fields = [
        'company_name', 
        'contact_person', 
        'email', 
        'phone',
        'notes'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company_name', 'contact_person', 'email', 'phone', 'website')
        }),
        ('Business Information', {
            'fields': ('industry', 'company_size', 'annual_revenue')
        }),
        ('Marketing Information', {
            'fields': (
                'service_interests', 
                'budget_amount',
                'current_marketing_spend',
                'has_website',
                'has_social_media',
                'current_seo_agency',
                'marketing_goals'
            )
        }),
        ('Lead Management', {
            'fields': (
                'status', 
                'priority', 
                'lead_source', 
                'referral_source',
                'assigned_to'
            )
        }),
        ('Important Dates', {
            'fields': (
                'first_contact_date',
                'last_contact_date', 
                'next_follow_up',
                'proposal_sent_date',
                'contract_start_date'
            )
        }),
        ('Financial Information', {
            'fields': ('estimated_project_value', 'monthly_retainer')
        }),
        ('Notes & Communication', {
            'fields': ('notes', 'communication_log')
        }),
        ('System Information', {
            'fields': ('company', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)