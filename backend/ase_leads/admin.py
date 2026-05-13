from django.contrib import admin
from .models import ASELead, ASELeadActivity, ASELeadTask


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


@admin.register(ASELeadActivity)
class ASELeadActivityAdmin(admin.ModelAdmin):
    list_display = [
        'lead',
        'activity_type',
        'title',
        'user',
        'outcome',
        'requires_followup',
        'followup_completed',
        'created_at'
    ]
    list_filter = [
        'activity_type',
        'requires_followup',
        'followup_completed',
        'email_opened',
        'email_clicked',
        'created_at'
    ]
    search_fields = [
        'lead__company_name',
        'lead__contact_person',
        'title',
        'description',
        'outcome'
    ]
    readonly_fields = ['created_at', 'updated_at', 'is_overdue_followup']
    
    fieldsets = (
        ('Activity Information', {
            'fields': ('lead', 'user', 'activity_type', 'title', 'description', 'outcome')
        }),
        ('Call Details', {
            'fields': ('call_duration_minutes', 'call_outcome'),
            'classes': ('collapse',)
        }),
        ('Email Details', {
            'fields': ('email_subject', 'email_opened', 'email_clicked'),
            'classes': ('collapse',)
        }),
        ('Meeting Details', {
            'fields': ('meeting_date', 'meeting_attendees'),
            'classes': ('collapse',)
        }),
        ('Follow-up', {
            'fields': ('requires_followup', 'followup_date', 'followup_completed', 'is_overdue_followup')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new object
            obj.user = request.user
        super().save_model(request, obj, form, change)


@admin.register(ASELeadTask)
class ASELeadTaskAdmin(admin.ModelAdmin):
    list_display = [
        'lead',
        'task_type',
        'title',
        'assigned_to',
        'priority',
        'status',
        'due_date',
        'is_overdue',
        'created_by',
        'created_at'
    ]
    list_filter = [
        'task_type',
        'priority',
        'status',
        'reminder_sent',
        'created_at',
        'due_date'
    ]
    search_fields = [
        'lead__company_name',
        'lead__contact_person',
        'title',
        'description',
        'assigned_to__username',
        'assigned_to__first_name',
        'assigned_to__last_name'
    ]
    readonly_fields = [
        'created_at', 
        'updated_at', 
        'is_overdue', 
        'is_due_soon',
        'assigned_to_name',
        'created_by_name',
        'priority_order'
    ]
    
    fieldsets = (
        ('Task Information', {
            'fields': ('lead', 'task_type', 'title', 'description')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'assigned_to_name', 'created_by', 'created_by_name')
        }),
        ('Priority & Status', {
            'fields': ('priority', 'priority_order', 'status')
        }),
        ('Scheduling', {
            'fields': ('due_date', 'completed_at', 'is_overdue', 'is_due_soon')
        }),
        ('Reminder', {
            'fields': ('reminder_sent', 'reminder_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)