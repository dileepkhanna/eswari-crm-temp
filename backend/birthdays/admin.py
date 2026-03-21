from django.contrib import admin
from .models import Birthday, BirthdayAnnouncement

@admin.register(Birthday)
class BirthdayAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'birth_date', 'age', 'next_birthday', 
        'is_birthday_today', 'announce_birthday', 'created_by', 'created_at'
    ]
    list_filter = [
        'announce_birthday', 'show_age', 'created_at', 
        'employee__role', 'employee__company'
    ]
    search_fields = [
        'employee__first_name', 'employee__last_name', 
        'employee__email', 'employee__company__name'
    ]
    readonly_fields = ['age', 'next_birthday', 'is_birthday_today', 'days_until_birthday']
    
    fieldsets = (
        ('Employee Information', {
            'fields': ('employee', 'birth_date')
        }),
        ('Display Preferences', {
            'fields': ('show_age', 'announce_birthday')
        }),
        ('Calculated Fields', {
            'fields': ('age', 'next_birthday', 'is_birthday_today', 'days_until_birthday'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
        if obj:  # Editing existing object
            readonly.extend(['created_at', 'updated_at'])
        return readonly


@admin.register(BirthdayAnnouncement)
class BirthdayAnnouncementAdmin(admin.ModelAdmin):
    list_display = [
        'birthday', 'announcement_date', 'announcement_id', 'created_at'
    ]
    list_filter = ['announcement_date', 'created_at']
    search_fields = [
        'birthday__employee__first_name', 'birthday__employee__last_name',
        'birthday__employee__email'
    ]
    readonly_fields = ['created_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return ['birthday', 'announcement_date', 'announcement_id', 'created_at']
        return ['created_at']