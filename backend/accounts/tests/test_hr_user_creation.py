"""
Test HR user creation restrictions

This test verifies that HR users can only create manager and employee users,
and cannot create admin or HR users.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class HRUserCreationTest(TestCase):
    """Test HR user creation permissions"""
    
    def setUp(self):
        """Set up test users and client"""
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create admin user for comparison
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create manager user to test non-admin/non-HR access
        self.manager_user = User.objects.create_user(
            username='manager_test',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        self.client = APIClient()
    
    def test_hr_can_create_employee(self):
        """Test that HR users can create employee users"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Create a manager first for the employee
        manager = User.objects.create_user(
            username='test_manager',
            email='testmanager@test.com',
            password='testpass123',
            role='manager',
            first_name='Test',
            last_name='Manager'
        )
        
        employee_data = {
            'email': 'employee@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'employee',
            'first_name': 'New',
            'last_name': 'Employee',
            'manager': manager.id
        }
        
        response = self.client.post('/api/auth/register/', employee_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('User created successfully', response.data['message'])
        
        # Verify user was created with correct role
        created_user = User.objects.get(email='employee@test.com')
        self.assertEqual(created_user.role, 'employee')
        self.assertEqual(created_user.manager, manager)
    
    def test_hr_can_create_manager(self):
        """Test that HR users can create manager users"""
        self.client.force_authenticate(user=self.hr_user)
        
        manager_data = {
            'email': 'newmanager@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'manager',
            'first_name': 'New',
            'last_name': 'Manager'
        }
        
        response = self.client.post('/api/auth/register/', manager_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('User created successfully', response.data['message'])
        
        # Verify user was created with correct role
        created_user = User.objects.get(email='newmanager@test.com')
        self.assertEqual(created_user.role, 'manager')
    
    def test_hr_cannot_create_admin(self):
        """Test that HR users cannot create admin users"""
        self.client.force_authenticate(user=self.hr_user)
        
        admin_data = {
            'username': 'new_admin',
            'email': 'newadmin@test.com',
            'password': 'testpass123',
            'role': 'admin',
            'first_name': 'New',
            'last_name': 'Admin'
        }
        
        response = self.client.post('/api/auth/register/', admin_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('HR can only create manager and employee users', response.data['error'])
        
        # Verify user was NOT created
        self.assertFalse(User.objects.filter(username='new_admin').exists())
    
    def test_hr_cannot_create_hr_user(self):
        """Test that HR users cannot create other HR users"""
        self.client.force_authenticate(user=self.hr_user)
        
        hr_data = {
            'username': 'new_hr',
            'email': 'newhr@test.com',
            'password': 'testpass123',
            'role': 'hr',
            'first_name': 'New',
            'last_name': 'HR'
        }
        
        response = self.client.post('/api/auth/register/', hr_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('HR can only create manager and employee users', response.data['error'])
        
        # Verify user was NOT created
        self.assertFalse(User.objects.filter(username='new_hr').exists())
    
    def test_admin_can_create_all_roles(self):
        """Test that admin users can create users with any role"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Test creating admin
        admin_data = {
            'email': 'admincreated@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'admin',
            'first_name': 'Admin',
            'last_name': 'Created'
        }
        response = self.client.post('/api/auth/register/', admin_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test creating HR
        hr_data = {
            'email': 'hrcreated@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'hr',
            'first_name': 'HR',
            'last_name': 'Created'
        }
        response = self.client.post('/api/auth/register/', hr_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test creating manager
        manager_data = {
            'email': 'managercreated@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'manager',
            'first_name': 'Manager',
            'last_name': 'Created'
        }
        response = self.client.post('/api/auth/register/', manager_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test creating employee (needs a manager)
        test_manager = User.objects.create_user(
            username='emp_manager',
            email='empmanager@test.com',
            password='testpass123',
            role='manager',
            first_name='Employee',
            last_name='Manager'
        )
        
        employee_data = {
            'email': 'employeecreated@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'role': 'employee',
            'first_name': 'Employee',
            'last_name': 'Created',
            'manager': test_manager.id
        }
        response = self.client.post('/api/auth/register/', employee_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_manager_cannot_create_users(self):
        """Test that manager users cannot create any users"""
        self.client.force_authenticate(user=self.manager_user)
        
        employee_data = {
            'username': 'manager_attempt',
            'email': 'managerattempt@test.com',
            'password': 'testpass123',
            'role': 'employee',
            'first_name': 'Manager',
            'last_name': 'Attempt'
        }
        
        response = self.client.post('/api/auth/register/', employee_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only administrators and HR can create users', response.data['error'])
        
        # Verify user was NOT created
        self.assertFalse(User.objects.filter(username='manager_attempt').exists())
    
    def test_hr_error_message_for_invalid_role(self):
        """Test that HR gets proper error message when trying to create invalid role"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Try to create with invalid role
        invalid_data = {
            'username': 'invalid_role',
            'email': 'invalid@test.com',
            'password': 'testpass123',
            'role': 'superuser',  # Invalid role
            'first_name': 'Invalid',
            'last_name': 'Role'
        }
        
        response = self.client.post('/api/auth/register/', invalid_data)
        
        # Should get 403 because HR can only create manager/employee
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('HR can only create manager and employee users', response.data['error'])

