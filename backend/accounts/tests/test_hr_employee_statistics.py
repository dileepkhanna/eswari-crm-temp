"""
Test HR Employee Statistics API Endpoint

This test verifies that the employee_statistics endpoint returns correct statistics
and enforces proper role-based access control.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class HREmployeeStatisticsTest(TestCase):
    """Test HR employee statistics endpoint"""
    
    def setUp(self):
        """Set up test users"""
        # Create test users with different roles
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        self.manager_user = User.objects.create_user(
            username='manager_test',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager_user
        )
        
        # Create additional employees for better testing
        self.employee_user2 = User.objects.create_user(
            username='employee_test2',
            email='employee2@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee2',
            last_name='User',
            manager=self.manager_user
        )
        
        # Create an employee without a manager
        self.employee_no_manager = User.objects.create_user(
            username='employee_no_manager',
            email='employee_no_manager@test.com',
            password='testpass123',
            role='employee',
            first_name='NoManager',
            last_name='Employee'
        )
        
        self.client = APIClient()
    
    def test_hr_can_access_employee_statistics(self):
        """Test that HR users can access employee statistics"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_employees', response.data)
        self.assertIn('by_role', response.data)
        self.assertIn('with_manager', response.data)
        self.assertIn('without_manager', response.data)
    
    def test_admin_can_access_employee_statistics(self):
        """Test that admin users can access employee statistics"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_employees', response.data)
        self.assertIn('by_role', response.data)
        self.assertIn('with_manager', response.data)
        self.assertIn('without_manager', response.data)
    
    def test_manager_cannot_access_employee_statistics(self):
        """Test that manager users cannot access employee statistics"""
        self.client.force_authenticate(user=self.manager_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Permission denied', response.data['error'])
    
    def test_employee_cannot_access_employee_statistics(self):
        """Test that employee users cannot access employee statistics"""
        self.client.force_authenticate(user=self.employee_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Permission denied', response.data['error'])
    
    def test_unauthenticated_cannot_access_employee_statistics(self):
        """Test that unauthenticated users cannot access employee statistics"""
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_employee_statistics_correct_total(self):
        """Test that employee statistics return correct total count"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify total employees (6 users created in setUp)
        self.assertEqual(response.data['total_employees'], 6)
    
    def test_employee_statistics_by_role(self):
        """Test that employee statistics return correct role breakdown"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify by_role is a list
        self.assertIsInstance(response.data['by_role'], list)
        
        # Convert to dict for easier testing
        role_counts = {item['role']: item['count'] for item in response.data['by_role']}
        
        # Verify counts for each role
        self.assertEqual(role_counts.get('hr', 0), 1)
        self.assertEqual(role_counts.get('admin', 0), 1)
        self.assertEqual(role_counts.get('manager', 0), 1)
        self.assertEqual(role_counts.get('employee', 0), 3)
    
    def test_employee_statistics_manager_assignment(self):
        """Test that employee statistics return correct manager assignment counts"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify with_manager count (2 employees have manager assigned)
        self.assertEqual(response.data['with_manager'], 2)
        
        # Verify without_manager count (4 users without manager: hr, admin, manager, employee_no_manager)
        self.assertEqual(response.data['without_manager'], 4)
    
    def test_employee_statistics_updates_dynamically(self):
        """Test that employee statistics update when data changes"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Get initial statistics
        response = self.client.get('/api/hr/reports/employees/')
        initial_total = response.data['total_employees']
        
        # Create a new employee
        User.objects.create_user(
            username='new_employee',
            email='new_employee@test.com',
            password='testpass123',
            role='employee',
            first_name='New',
            last_name='Employee',
            manager=self.manager_user
        )
        
        # Get updated statistics
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_employees'], initial_total + 1)
        self.assertEqual(response.data['with_manager'], 3)  # Now 3 employees with manager
    
    def test_employee_statistics_all_fields_present(self):
        """Test that all required fields are present in the response"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify all required fields are present
        required_fields = ['total_employees', 'by_role', 'with_manager', 'without_manager']
        for field in required_fields:
            self.assertIn(field, response.data, f"Field '{field}' is missing from response")
    
    def test_employee_statistics_by_role_structure(self):
        """Test that by_role field has correct structure"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify by_role is a list
        self.assertIsInstance(response.data['by_role'], list)
        
        # Verify each item has 'role' and 'count' fields
        for item in response.data['by_role']:
            self.assertIn('role', item)
            self.assertIn('count', item)
            self.assertIsInstance(item['count'], int)
            self.assertIn(item['role'], ['admin', 'manager', 'employee', 'hr'])
