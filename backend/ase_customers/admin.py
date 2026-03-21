from django.contrib import admin
from .models import ASECustomer


@admin.register(ASECustomer)
class ASECustomerAdmin(admin.ModelAdmin):
    list_display = [
        'name', 
        'phone', 
        'email',
        'call_status', 
        'assigned_to',
        'created_at'
    ]
    list_filter = [
        'call_status', 
        'company',
        'assigned_to',
        'is_converted',
        'created_at'
    ]
    search_fields = [
        'name', 
        'phone', 
        'email',
        'notes'
    ]
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'phone', 'email')
        }),
        ('Call Management', {
            'fields': ('call_status', 'custom_call_status', 'scheduled_date', 'call_date')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'company')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Conversion', {
            'fields': ('is_converted', 'converted_lead_id')
        }),
        ('System Information', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)