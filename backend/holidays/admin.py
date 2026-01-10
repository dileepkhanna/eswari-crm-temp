from django.contrib import admin
from .models import Holiday

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'holiday_type', 'is_recurring', 'created_by', 'created_at']
    list_filter = ['holiday_type', 'is_recurring', 'start_date']
    search_fields = ['name', 'description']
    ordering = ['start_date']
    readonly_fields = ['created_at', 'updated_at']