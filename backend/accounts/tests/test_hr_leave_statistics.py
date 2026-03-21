"""
Tests for HR Leave Statistics API Endpoint

This module tests the /api/hr/reports/leaves/ endpoint to ensure:
1. Only admin and HR roles can access the endpoint
2. Returns correct leave statistics
3. Handles empty data gracefully
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from leaves.models import Leave
from datetime import date, timedelta

User = get_user_model()


class HRLeaveStatisticsTestCase(TestCase):
    """Test cases for HR leave statistics endpoint"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        self.manager_user = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        self.employee_user = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager_user
        )
        
        # Create sample leave data
        today = date.today()
        
        # Pending sick leave
        Leave.objects.create(
            user=self.employee_user,
            user_name=f"{self.employee_user.first_name} {self.employee_user.last_name}",
            user_role=self.employee_user.role,
            leave_type='sick',
            start_date=today,
            end_date=today + timedelta(days=2),
            reason='Flu',
            status='pending'
        )
        
        # Approved casual leave
        Leave.objects.create(
            user=self.employee_user,
            user_name=f"{self.employee_user.first_name} {self.employee_user.last_name}",
            user_role=self.employee_user.role,
            leave_type='casual',
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=11),
            reason='Personal',
            status='approved',
            approved_by=self.manager_user
        )
        
        # Rejected annual leave
        Leave.objects.create(
            user=self.employee_user,
            user_name=f"{self.employee_user.first_name} {self.employee_user.last_name}",
            user_role=self.employee_user.role,
            leave_type='annual',
            start_date=today + timedelta(days=20),
            end_date=today + timedelta(days=25),
            reason='Vacation',
            status='rejected',
            approved_by=self.manager_user,
            rejection_reason='Insufficient leave balance'
        )
        
        # Another pending sick leave
        Leave.objects.create(
            user=self.manager_user,
            user_name=f"{self.manager_user.first_name} {self.manager_user.last_name}",
            user_role=self.manager_user.role,
            leave_type='sick',
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=6),
            reason='Medical checkup',
            status='pending'
        )

    def test_admin_can_access_leave_statistics(self):
        """Test that admin users can access leave statistics"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_leaves', response.data)
        self.assertIn('by_status', response.data)
        self.assertIn('by_type', response.data)
        self.assertIn('pending_count', response.data)

    def test_hr_can_access_leave_statistics(self):
        """Test that HR users can access leave statistics"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_leaves', response.data)
        self.assertIn('by_status', response.data)
        self.assertIn('by_type', response.data)
        self.assertIn('pending_count', response.data)

    def test_manager_cannot_access_leave_statistics(self):
        """Test that manager users cannot access leave statistics"""
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('Permission denied', response.data['error'])

    def test_employee_cannot_access_leave_statistics(self):
        """Test that employee users cannot access leave statistics"""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('Permission denied', response.data['error'])

    def test_unauthenticated_cannot_access_leave_statistics(self):
        """Test that unauthenticated users cannot access leave statistics"""
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_leave_statistics_total_count(self):
        """Test that total_leaves returns correct count"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_leaves'], 4)

    def test_leave_statistics_by_status(self):
        """Test that by_status returns correct breakdown"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        by_status = response.data['by_status']
        status_dict = {item['status']: item['count'] for item in by_status}
        
        self.assertEqual(status_dict.get('pending', 0), 2)
        self.assertEqual(status_dict.get('approved', 0), 1)
        self.assertEqual(status_dict.get('rejected', 0), 1)

    def test_leave_statistics_by_type(self):
        """Test that by_type returns correct breakdown"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        by_type = response.data['by_type']
        type_dict = {item['leave_type']: item['count'] for item in by_type}
        
        self.assertEqual(type_dict.get('sick', 0), 2)
        self.assertEqual(type_dict.get('casual', 0), 1)
        self.assertEqual(type_dict.get('annual', 0), 1)

    def test_leave_statistics_pending_count(self):
        """Test that pending_count returns correct count"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pending_count'], 2)

    def test_leave_statistics_with_no_leaves(self):
        """Test that endpoint handles empty leave data gracefully"""
        # Delete all leaves
        Leave.objects.all().delete()
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_leaves'], 0)
        self.assertEqual(response.data['by_status'], [])
        self.assertEqual(response.data['by_type'], [])
        self.assertEqual(response.data['pending_count'], 0)

    def test_leave_statistics_response_structure(self):
        """Test that response has correct structure"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check all required fields are present
        required_fields = ['total_leaves', 'by_status', 'by_type', 'pending_count']
        for field in required_fields:
            self.assertIn(field, response.data)
        
        # Check data types
        self.assertIsInstance(response.data['total_leaves'], int)
        self.assertIsInstance(response.data['by_status'], list)
        self.assertIsInstance(response.data['by_type'], list)
        self.assertIsInstance(response.data['pending_count'], int)
        
        # Check by_status structure
        if response.data['by_status']:
            for item in response.data['by_status']:
                self.assertIn('status', item)
                self.assertIn('count', item)
        
        # Check by_type structure
        if response.data['by_type']:
            for item in response.data['by_type']:
                self.assertIn('leave_type', item)
                self.assertIn('count', item)
