"""
Test HR Dashboard Metrics API Endpoint

This test verifies that the dashboard_metrics endpoint returns correct metrics
and enforces proper role-based access control.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from leaves.models import Leave
from holidays.models import Holiday
from announcements.models import Announcement
from datetime import datetime, timedelta

User = get_user_model()


class HRDashboardMetricsTest(TestCase):
    """Test HR dashboard metrics endpoint"""
    
    def setUp(self):
        """Set up test users and test data"""
        # Create test users
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
        
        # Create test leaves
        Leave.objects.create(
            user=self.employee_user,
            user_name=f"{self.employee_user.first_name} {self.employee_user.last_name}",
            user_role=self.employee_user.role,
            leave_type='sick',
            start_date=datetime.now().date(),
            end_date=datetime.now().date() + timedelta(days=2),
            reason='Test leave',
            status='pending'
        )
        
        Leave.objects.create(
            user=self.employee_user,
            user_name=f"{self.employee_user.first_name} {self.employee_user.last_name}",
            user_role=self.employee_user.role,
            leave_type='casual',
            start_date=datetime.now().date() + timedelta(days=5),
            end_date=datetime.now().date() + timedelta(days=7),
            reason='Test leave 2',
            status='approved'
        )
        
        # Create test holidays
        Holiday.objects.create(
            name='Upcoming Holiday',
            start_date=datetime.now().date() + timedelta(days=10),
            holiday_type='national',
            description='Test holiday',
            created_by=self.admin_user
        )
        
        Holiday.objects.create(
            name='Past Holiday',
            start_date=datetime.now().date() - timedelta(days=10),
            holiday_type='company',
            description='Past test holiday',
            created_by=self.admin_user
        )
        
        # Create test announcements
        Announcement.objects.create(
            title='Active Announcement',
            message='Test active announcement',
            priority='high',
            target_roles=['all'],
            is_active=True,
            created_by=self.admin_user
        )
        
        Announcement.objects.create(
            title='Inactive Announcement',
            message='Test inactive announcement',
            priority='low',
            target_roles=['employee'],
            is_active=False,
            created_by=self.admin_user
        )
        
        self.client = APIClient()
    
    def test_hr_can_access_dashboard_metrics(self):
        """Test that HR users can access dashboard metrics"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_employees', response.data)
        self.assertIn('pending_leaves', response.data)
        self.assertIn('upcoming_holidays', response.data)
        self.assertIn('active_announcements', response.data)
    
    def test_admin_can_access_dashboard_metrics(self):
        """Test that admin users can access dashboard metrics"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_employees', response.data)
        self.assertIn('pending_leaves', response.data)
        self.assertIn('upcoming_holidays', response.data)
        self.assertIn('active_announcements', response.data)
    
    def test_manager_cannot_access_dashboard_metrics(self):
        """Test that manager users cannot access dashboard metrics"""
        self.client.force_authenticate(user=self.manager_user)
        
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Permission denied', response.data['error'])
    
    def test_employee_cannot_access_dashboard_metrics(self):
        """Test that employee users cannot access dashboard metrics"""
        self.client.force_authenticate(user=self.employee_user)
        
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Permission denied', response.data['error'])
    
    def test_unauthenticated_cannot_access_dashboard_metrics(self):
        """Test that unauthenticated users cannot access dashboard metrics"""
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_dashboard_metrics_correct_values(self):
        """Test that dashboard metrics return correct values"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify total employees (4 users created in setUp)
        self.assertEqual(response.data['total_employees'], 4)
        
        # Verify pending leaves (1 pending leave created)
        self.assertEqual(response.data['pending_leaves'], 1)
        
        # Verify upcoming holidays (1 upcoming holiday created)
        self.assertEqual(response.data['upcoming_holidays'], 1)
        
        # Verify active announcements (1 active announcement created)
        self.assertEqual(response.data['active_announcements'], 1)
    
    def test_dashboard_metrics_updates_dynamically(self):
        """Test that dashboard metrics update when data changes"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Get initial metrics
        response = self.client.get('/api/hr/reports/dashboard/')
        initial_pending_leaves = response.data['pending_leaves']
        
        # Create a new pending leave
        Leave.objects.create(
            user=self.manager_user,
            user_name=f"{self.manager_user.first_name} {self.manager_user.last_name}",
            user_role=self.manager_user.role,
            leave_type='annual',
            start_date=datetime.now().date() + timedelta(days=15),
            end_date=datetime.now().date() + timedelta(days=17),
            reason='New test leave',
            status='pending'
        )
        
        # Get updated metrics
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pending_leaves'], initial_pending_leaves + 1)
