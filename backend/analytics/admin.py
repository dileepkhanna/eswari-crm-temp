from django.contrib import admin
from .models import ReportSchedule


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    list_display = ['name', 'frequency', 'report_type', 'is_active', 'last_sent_at', 'next_send_at']
    list_filter = ['frequency', 'report_type', 'is_active']
    search_fields = ['name']
