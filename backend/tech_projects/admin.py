from django.contrib import admin
from .models import TechProject, TechTask

@admin.register(TechProject)
class TechProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'team', 'progress', 'start_date', 'end_date', 'created_at']
    list_filter = ['status', 'team', 'created_at']
    search_fields = ['name', 'description']
    date_hierarchy = 'created_at'

@admin.register(TechTask)
class TechTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task_type', 'priority', 'status', 'assignee', 'project', 'due_date', 'created_at']
    list_filter = ['task_type', 'priority', 'status', 'created_at']
    search_fields = ['title', 'description', 'tags']
    date_hierarchy = 'created_at'
    raw_id_fields = ['project', 'assignee', 'created_by']
