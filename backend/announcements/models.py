from django.db import models
from django.contrib.auth import get_user_model
import os

User = get_user_model()

def announcement_document_path(instance, filename):
    """Generate upload path for announcement documents"""
    # During creation, companies might not be set yet, so check legacy company first
    if hasattr(instance, 'company') and instance.company:
        company_code = instance.company.code
    elif hasattr(instance, 'companies') and instance.companies.exists():
        company_code = instance.companies.first().code
    else:
        # Fallback for cases where no company is set yet
        company_code = 'general'
    return f'announcements/{company_code}/{filename}'

class Announcement(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    target_roles = models.JSONField(default=list)  # Store array of roles
    
    # Legacy single company field (kept for backward compatibility)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        related_name='announcements_legacy',
        null=True,
        blank=True,
        help_text="Legacy single company field (deprecated)"
    )
    
    # New multiple companies field
    companies = models.ManyToManyField(
        'accounts.Company',
        related_name='announcements',
        blank=True,
        help_text="Companies this announcement is sent to"
    )
    
    assigned_employees = models.ManyToManyField(
        User, 
        blank=True, 
        related_name='assigned_announcements',
        help_text='Specific employees who can see this announcement. If empty, uses target_roles.'
    )
    document = models.FileField(
        upload_to=announcement_document_path,
        null=True,
        blank=True,
        help_text='Optional document attachment (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) or image (JPG, PNG, GIF, BMP, SVG, WEBP)'
    )
    document_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='URL to an external document or image'
    )
    document_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Display name for the document/image (required for URL-based documents)'
    )
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),  # Keep for backward compatibility
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.title
    
    def get_companies(self):
        """Get all companies for this announcement (new + legacy)"""
        companies = list(self.companies.all())
        if self.company and self.company not in companies:
            companies.append(self.company)
        return companies
    
    def clean(self):
        """Validate document file type and URL/file exclusivity"""
        if self.document and self.document_url:
            from django.core.exceptions import ValidationError
            raise ValidationError('Cannot have both uploaded document and document URL. Please choose one.')
        
        if self.document:
            allowed_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', 
                                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
            file_extension = os.path.splitext(self.document.name)[1].lower()
            if file_extension not in allowed_extensions:
                from django.core.exceptions import ValidationError
                raise ValidationError(f'File type {file_extension} is not allowed. Allowed types: {", ".join(allowed_extensions)}')
        
        if self.document_url and not self.document_name:
            from django.core.exceptions import ValidationError
            raise ValidationError('Document name is required when using document URL.')
    
    def save(self, *args, **kwargs):
        # Store original filename
        if self.document and not self.document_name:
            self.document_name = self.document.name
        super().save(*args, **kwargs)

class AnnouncementRead(models.Model):
    """Track which users have read which announcements"""
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='reads')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcement_reads')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['announcement', 'user']  # Prevent duplicate reads
        ordering = ['-read_at']
    
    def __str__(self):
        return f"{self.user.username} read {self.announcement.title}"