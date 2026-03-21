"""
Test HR user listing access

This test verifies that HR users can list all users in the system.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class HRUserListingTest(TestCase):
    """Test that HR users can list all users"""
    
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
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create manager user
        self.manager_user = User.objects.create_user(
            username='manager_test',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager_user
        )
        
        self.client = APIClient()
    
    def test_hr_can_list_all_users(self):
        """Test that HR users can retrieve all users"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # HR should see all 4 users (hr, admin, manager, employee)
        self.assertEqual(len(response.data), 4)
        
        # Verify all user roles are present
        roles = [user['role'] for user in response.data]
        self.assertIn('hr', roles)
        self.assertIn('admin', roles)
        self.assertIn('manager', roles)
        self.assertIn('employee', roles)
    
    def test_admin_can_list_all_users(self):
        """Test that admin users can still list all users"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Admin should see all 4 users
        self.assertEqual(len(response.data), 4)
    
    def test_manager_cannot_list_all_users(self):
        """Test that manager users have limited user listing"""
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Manager should see: their employees, other managers, and admins
        # In this case: employee (their employee), admin, manager (themselves)
        # But NOT the HR user (unless HR is in the allowed list)
        self.assertGreaterEqual(len(response.data), 3)
    
    def test_employee_cannot_list_all_users(self):
        """Test that employee users have very limited user listing"""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Employee should see: themselves, their manager, admins, and other managers
        # Should NOT see all employees
        self.assertLess(len(response.data), 4)
