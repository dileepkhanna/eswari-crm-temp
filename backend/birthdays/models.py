from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from datetime import date

User = get_user_model()

class Birthday(models.Model):
    """Model to store employee birthday information"""
    
    # Employee information
    employee = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='birthday_info',
        help_text="Employee whose birthday is being recorded"
    )
    
    # Birthday information
    birth_date = models.DateField(
        help_text="Employee's birth date (year will be used for age calculation)"
    )
    
    # Display preferences
    show_age = models.BooleanField(
        default=True,
        help_text="Whether to show age in birthday announcements"
    )
    
    # Announcement preferences
    announce_birthday = models.BooleanField(
        default=True,
        help_text="Whether to create automatic birthday announcements"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_birthdays',
        help_text="HR/Admin who added this birthday"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'birthdays'
        verbose_name = 'Birthday'
        verbose_name_plural = 'Birthdays'
        ordering = ['employee__first_name', 'employee__last_name']
    
    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.birth_date.strftime('%B %d')}"
    
    def clean(self):
        """Validate the birthday data"""
        if self.birth_date and self.birth_date > date.today():
            raise ValidationError("Birth date cannot be in the future")
    
    @property
    def age(self):
        """Calculate current age"""
        if not self.birth_date:
            return None
        
        today = date.today()
        age = today.year - self.birth_date.year
        
        # Adjust if birthday hasn't occurred this year yet
        if today.month < self.birth_date.month or \
           (today.month == self.birth_date.month and today.day < self.birth_date.day):
            age -= 1
            
        return age
    
    @property
    def next_birthday(self):
        """Get the next birthday date"""
        if not self.birth_date:
            return None
            
        today = date.today()
        next_birthday = date(today.year, self.birth_date.month, self.birth_date.day)
        
        # If birthday has passed this year, get next year's birthday
        if next_birthday < today:
            next_birthday = date(today.year + 1, self.birth_date.month, self.birth_date.day)
            
        return next_birthday
    
    @property
    def is_birthday_today(self):
        """Check if today is the employee's birthday"""
        if not self.birth_date:
            return False
            
        today = date.today()
        return (today.month == self.birth_date.month and 
                today.day == self.birth_date.day)
    
    @property
    def days_until_birthday(self):
        """Calculate days until next birthday"""
        next_birthday = self.next_birthday
        if not next_birthday:
            return None
            
        today = date.today()
        return (next_birthday - today).days


class BirthdayAnnouncement(models.Model):
    """Track birthday announcements that have been created"""
    
    birthday = models.ForeignKey(
        Birthday,
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    
    announcement_date = models.DateField(
        help_text="Date when the birthday announcement was created"
    )
    
    announcement_id = models.IntegerField(
        help_text="ID of the created announcement"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'birthday_announcements'
        verbose_name = 'Birthday Announcement'
        verbose_name_plural = 'Birthday Announcements'
        unique_together = ['birthday', 'announcement_date']
        ordering = ['-announcement_date']
    
    def __str__(self):
        return f"Birthday announcement for {self.birthday.employee.get_full_name()} on {self.announcement_date}"