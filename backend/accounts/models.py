from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class Company(models.Model):
    """
    Represents a company/tenant in the multi-tenant system.
    """
    name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Company name (must be unique)"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Company code for internal reference (must be unique)"
    )
    logo = models.ImageField(
        upload_to='company_logos/',
        blank=True,
        null=True,
        help_text="Company logo image"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the company is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code'], name='company_code_idx'),
            models.Index(fields=['is_active'], name='company_active_idx'),
        ]
    
    def __str__(self):
        return self.name


    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion if company has associated data.
        Implements Requirements 1.6 and 1.7.
        """
        from django.core.exceptions import ValidationError

        # Check for associated users
        if self.users.exists():
            user_count = self.users.count()
            raise ValidationError(
                f"Cannot delete company '{self.name}' because it has {user_count} associated user(s). "
                f"Please remove or reassign all users before deleting the company."
            )

        # Check for associated data across all modules
        associated_data = []

        # Check leads
        try:
            from leads.models import Lead
            lead_count = Lead.objects.filter(company=self).count()
            if lead_count > 0:
                associated_data.append(f"{lead_count} lead(s)")
        except ImportError:
            pass

        # Check customers
        try:
            from customers.models import Customer
            customer_count = Customer.objects.filter(company=self).count()
            if customer_count > 0:
                associated_data.append(f"{customer_count} customer(s)")
        except ImportError:
            pass

        # Check projects
        try:
            from projects.models import Project
            project_count = Project.objects.filter(company=self).count()
            if project_count > 0:
                associated_data.append(f"{project_count} project(s)")
        except ImportError:
            pass

        # Check tasks
        try:
            from tasks.models import Task
            task_count = Task.objects.filter(company=self).count()
            if task_count > 0:
                associated_data.append(f"{task_count} task(s)")
        except ImportError:
            pass

        # Check leaves
        try:
            from leaves.models import Leave
            leave_count = Leave.objects.filter(company=self).count()
            if leave_count > 0:
                associated_data.append(f"{leave_count} leave(s)")
        except ImportError:
            pass

        # Check holidays
        try:
            from holidays.models import Holiday
            holiday_count = Holiday.objects.filter(company=self).count()
            if holiday_count > 0:
                associated_data.append(f"{holiday_count} holiday(s)")
        except ImportError:
            pass

        # Check announcements
        try:
            from announcements.models import Announcement
            announcement_count = Announcement.objects.filter(company=self).count()
            if announcement_count > 0:
                associated_data.append(f"{announcement_count} announcement(s)")
        except ImportError:
            pass

        # Check activity logs
        try:
            from activity_logs.models import ActivityLog
            log_count = ActivityLog.objects.filter(company=self).count()
            if log_count > 0:
                associated_data.append(f"{log_count} activity log(s)")
        except ImportError:
            pass

        # Check notifications
        try:
            from notifications.models import Notification
            notification_count = Notification.objects.filter(company=self).count()
            if notification_count > 0:
                associated_data.append(f"{notification_count} notification(s)")
        except ImportError:
            pass

        # If any associated data exists, prevent deletion
        if associated_data:
            data_summary = ", ".join(associated_data)
            raise ValidationError(
                f"Cannot delete company '{self.name}' because it has associated business data: {data_summary}. "
                f"To preserve data integrity, please deactivate the company instead by setting is_active to False."
            )

        # If no associated data, allow deletion
        super().delete(*args, **kwargs)



class CustomUserManager(UserManager):
    def create_user(self, email=None, password=None, **extra_fields):
        """Create and save a User with the given email and password."""
        if email:
            email = self.normalize_email(email)
        
        # Create user instance first with all fields
        user = self.model(email=email, **extra_fields)
        
        # Generate username if not provided, using the user instance with all fields set
        if 'username' not in extra_fields or not extra_fields['username']:
            user.username = user.generate_username()
        
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """Create and save a SuperUser with the given username, email and password."""
        # If email is not provided, use a default or prompt for it
        if not email:
            email = f"{username}@admin.com"  # Default email pattern
            
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('first_name', 'Admin')
        extra_fields.setdefault('last_name', 'User')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        # Set the username explicitly
        extra_fields['username'] = username
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=[
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
        ('hr', 'HR'),
    ], default='employee')
    company = models.ForeignKey(
        'Company',
        on_delete=models.PROTECT,
        related_name='users',
        null=True,
        blank=True,
        help_text="Company this user belongs to (optional for admin and HR roles)"
    )
    manager = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='employees',
        limit_choices_to={'role': 'manager'},
        help_text='Manager assigned to this employee (only for employees)'
    )
    joining_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date when the user joined the company'
    )
    designation = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Job title or designation of the user'
    )
    pending_approval = models.BooleanField(
        default=False,
        help_text='Whether this user is pending admin approval'
    )
    approved_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_users',
        help_text='Admin who approved this user'
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this user was approved'
    )
    # Personal & banking details
    permanent_address = models.TextField(blank=True, null=True, help_text='Permanent address')
    present_address = models.TextField(blank=True, null=True, help_text='Present/current address')
    bank_name = models.CharField(max_length=100, blank=True, null=True, help_text='Bank name')
    bank_account_number = models.CharField(max_length=30, blank=True, null=True, help_text='Bank account number')
    bank_ifsc = models.CharField(max_length=20, blank=True, null=True, help_text='IFSC code')
    blood_group = models.CharField(max_length=5, blank=True, null=True, help_text='Blood group (e.g. A+, O-)')
    aadhar_number = models.CharField(max_length=12, blank=True, null=True, help_text='12-digit Aadhar card number')
    # Emergency contacts
    emergency_contact1_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact1_phone = models.CharField(max_length=15, blank=True, null=True)
    emergency_contact1_relation = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact2_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact2_phone = models.CharField(max_length=15, blank=True, null=True)
    emergency_contact2_relation = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                condition=models.Q(email__isnull=False),
                name='unique_email_when_not_null'
            )
        ]
        indexes = [
            models.Index(fields=['company'], name='user_company_idx'),
        ]

    def generate_username(self):
        """Generate username with pattern: {first_name}_{role}_{number}"""
        # Use first name (lowercase) as the base, fallback to email prefix if no first name
        if self.first_name and self.first_name.strip():
            base_name = self.first_name.lower().strip()
        elif self.email:
            # Fallback to email prefix if no first name
            base_name = self.email.split('@')[0].lower()
        else:
            base_name = "user"
        
        # Remove spaces and special characters, keep only alphanumeric
        base_name = ''.join(c for c in base_name if c.isalnum())
        
        # Get the count of users with the same role
        role_count = User.objects.filter(role=self.role).count()
        # Generate next number (starting from 01)
        next_number = role_count + 1
        # Format with zero padding (e.g., 01, 02, 03...)
        formatted_number = f"{next_number:02d}"
        # Create username pattern
        username = f"{base_name}_{self.role}_{formatted_number}"
        
        # Check if username already exists and increment if needed
        while User.objects.filter(username=username).exists():
            next_number += 1
            formatted_number = f"{next_number:02d}"
            username = f"{base_name}_{self.role}_{formatted_number}"
        
        return username

    def __str__(self):
        return self.email


import uuid as _uuid
from django.utils import timezone as _tz

class InviteToken(models.Model):
    """One-time invite link for self-registration."""
    ROLE_CHOICES = [
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    ]

    token = models.UUIDField(default=_uuid.uuid4, unique=True, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    company = models.ForeignKey(
        'Company', on_delete=models.CASCADE, related_name='invite_tokens',
        null=True, blank=True
    )
    created_by = models.ForeignKey(
        'User', on_delete=models.CASCADE, related_name='created_invites'
    )
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    used_by = models.ForeignKey(
        'User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='used_invite'
    )
    manager = models.ForeignKey(
        'User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invite_manager',
        limit_choices_to={'role': 'manager'},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invite({self.role}, expires={self.expires_at.date()}, used={self.used})"

    @property
    def is_valid(self):
        return not self.used and self.expires_at > _tz.now()
