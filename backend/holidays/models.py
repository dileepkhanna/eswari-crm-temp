from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Holiday(models.Model):
    HOLIDAY_TYPES = [
        ('national', 'National Holiday'),
        ('religious', 'Religious Holiday'),
        ('company', 'Company Holiday'),
        ('optional', 'Optional Holiday'),
    ]

    name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Leave blank for single-day holiday")
    holiday_type = models.CharField(max_length=20, choices=HOLIDAY_TYPES, default='company')
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='holidays/', blank=True, null=True, help_text="Optional holiday image")
    is_recurring = models.BooleanField(default=False, help_text="Repeats every year")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_holidays')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']
        unique_together = ['name', 'start_date']

    def __str__(self):
        if self.end_date and self.end_date != self.start_date:
            return f"{self.name} - {self.start_date} to {self.end_date}"
        return f"{self.name} - {self.start_date}"

    @property
    def date(self):
        """Backward compatibility property"""
        return self.start_date

    @property
    def duration_days(self):
        """Calculate the duration of the holiday in days"""
        if self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 1