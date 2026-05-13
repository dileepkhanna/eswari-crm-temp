from django.db import models
from django.contrib.auth import get_user_model
from teams.models import Team

User = get_user_model()

class TechProject(models.Model):
    """Technical projects for development teams"""
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('testing', 'Testing'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='tech_projects')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0)  # 0-100
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tech_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name


class TechTask(models.Model):
    """Tasks for technical projects"""
    TYPE_CHOICES = [
        ('design', 'Design'),
        ('development', 'Development'),
        ('bug', 'Bug Fix'),
        ('feature', 'Feature'),
        ('documentation', 'Documentation'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('backlog', 'Backlog'),
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'In Review'),
        ('done', 'Done'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='development')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='backlog')
    project = models.ForeignKey(TechProject, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tech_tasks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tech_tasks')
    story_points = models.IntegerField(default=0, help_text='Effort estimation')
    due_date = models.DateField(null=True, blank=True)
    tags = models.CharField(max_length=200, blank=True, help_text='Comma-separated tags')
    order = models.IntegerField(default=0, help_text='Order within status column')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', '-created_at']
    
    def __str__(self):
        return self.title
