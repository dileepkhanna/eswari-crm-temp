from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class CustomUserManager(UserManager):
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        
        # Create user instance first with all fields
        user = self.model(email=email, **extra_fields)
        
        # Generate username if not provided, using the user instance with all fields set
        if 'username' not in extra_fields or not extra_fields['username']:
            user.username = user.generate_username()
        
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=[
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    ], default='employee')
    manager = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='employees',
        limit_choices_to={'role': 'manager'},
        help_text='Manager assigned to this employee (only for employees)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

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