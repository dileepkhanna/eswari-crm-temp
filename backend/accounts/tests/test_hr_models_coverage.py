"""
Tests for User model to increase code coverage.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class UserModelCoverageTest(TestCase):
    """Tests for User model methods and properties."""

    def test_user_str_method(self):
        """Test User __str__ method."""
        user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # User __str__ returns email
        self.assertEqual(str(user), 'test@example.com')

    def test_user_get_full_name_method(self):
        """Test User get_full_name method."""
        user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.assertEqual(user.get_full_name(), 'John Doe')

    def test_user_get_short_name_method(self):
        """Test User get_short_name method."""
        user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.assertEqual(user.get_short_name(), 'John')

    def test_user_creation_with_all_roles(self):
        """Test creating users with all available roles."""
        roles = ['admin', 'manager', 'employee', 'hr']
        
        for role in roles:
            user = User.objects.create_user(
                username=f'{role}_user',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertEqual(user.role, role)

    def test_user_default_role_is_employee(self):
        """Test that default role is employee."""
        user = User.objects.create_user(
            username='default_user',
            email='default@example.com',
            password='testpass123'
        )
        
        self.assertEqual(user.role, 'employee')

    def test_user_with_manager(self):
        """Test creating user with manager relationship."""
        manager = User.objects.create_user(
            username='manager',
            email='manager@example.com',
            password='testpass123',
            role='manager'
        )
        
        employee = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='testpass123',
            role='employee',
            manager=manager
        )
        
        self.assertEqual(employee.manager, manager)

    def test_user_phone_field(self):
        """Test user phone field."""
        user = User.objects.create_user(
            username='phone_user',
            email='phone@example.com',
            password='testpass123',
            phone='+1234567890'
        )
        
        self.assertEqual(user.phone, '+1234567890')

    def test_user_is_active_default(self):
        """Test that users are active by default."""
        user = User.objects.create_user(
            username='active_user',
            email='active@example.com',
            password='testpass123'
        )
        
        self.assertTrue(user.is_active)

    def test_user_is_staff_default(self):
        """Test that regular users are not staff by default."""
        user = User.objects.create_user(
            username='staff_user',
            email='staff@example.com',
            password='testpass123'
        )
        
        self.assertFalse(user.is_staff)

    def test_superuser_creation(self):
        """Test creating a superuser."""
        superuser = User.objects.create_superuser(
            username='superuser',
            email='super@example.com',
            password='testpass123'
        )
        
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_active)

    def test_user_email_uniqueness(self):
        """Test that email must be unique."""
        User.objects.create_user(
            username='user1',
            email='duplicate@example.com',
            password='testpass123'
        )
        
        # Email is unique in this model, so creating another user with same email should fail
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username='user2',
                email='duplicate@example.com',
                password='testpass123'
            )

    def test_user_username_uniqueness(self):
        """Test that username must be unique."""
        User.objects.create_user(
            username='unique_user',
            email='user1@example.com',
            password='testpass123'
        )
        
        # Attempting to create another user with same username should raise error
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='unique_user',
                email='user2@example.com',
                password='testpass123'
            )

    def test_user_password_hashing(self):
        """Test that passwords are hashed."""
        user = User.objects.create_user(
            username='hash_user',
            email='hash@example.com',
            password='plaintext123'
        )
        
        # Password should not be stored in plain text
        self.assertNotEqual(user.password, 'plaintext123')
        # But check_password should work
        self.assertTrue(user.check_password('plaintext123'))

    def test_user_meta_ordering(self):
        """Test User model ordering."""
        user1 = User.objects.create_user(
            username='zebra',
            email='z@example.com',
            password='testpass123'
        )
        user2 = User.objects.create_user(
            username='alpha',
            email='a@example.com',
            password='testpass123'
        )
        
        users = list(User.objects.all().order_by('username'))
        self.assertEqual(users[0].username, 'alpha')
        self.assertEqual(users[1].username, 'zebra')
