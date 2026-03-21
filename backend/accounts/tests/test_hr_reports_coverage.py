"""
Additional tests for HR reports to increase code coverage.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from leaves.models import Leave
from holidays.models import Holiday
from announcements.models import Announcement
from datetime import date, timedelta

User = get_user_model()


class HRReportsCoverageTest(TestCase):
    """Additional tests for HR reports endpoints."""

    def setUp(self):
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_reports',
            email='hr_reports@test.com',
            password='testpass123',
            role='hr'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_reports',
            email='admin_reports@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create manager user
        self.manager_user = User.objects.create_user(
            username='manager_reports',
            email='manager_reports@test.com',
            password='testpass123',
            role='manager'
        )
        
        # Create multiple employees
        for i in range(5):
            User.objects.create_user(
                username=f'employee_{i}',
                email=f'employee_{i}@test.com',
                password='testpass123',
                role='employee',
                manager=self.manager_user if i < 3 else None
            )

    def test_dashboard_metrics_with_data(self):
        """Test dashboard metrics with actual data."""
        # Create leaves
        employee = User.objects.filter(role='employee').first()
        Leave.objects.create(
            user=employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2),
            reason='Sick',
            status='pending'
        )
        
        # Create holiday
        Holiday.objects.create(
            name='Test Holiday',
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=10),
            created_by=self.admin_user
        )
        
        # Create announcement
        Announcement.objects.create(
            title='Test Announcement',
            message='Test message',
            created_by=self.admin_user,
            is_active=True
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_employees', response.data)
        self.assertIn('pending_leaves', response.data)
        self.assertIn('upcoming_holidays', response.data)
        self.assertIn('active_announcements', response.data)
        
        # Verify counts
        self.assertEqual(response.data['pending_leaves'], 1)
        self.assertEqual(response.data['upcoming_holidays'], 1)
        self.assertEqual(response.data['active_announcements'], 1)

    def test_employee_statistics_with_managers(self):
        """Test employee statistics with manager assignments."""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('with_manager', response.data)
        self.assertIn('without_manager', response.data)
        
        # 3 employees have manager, 2 don't
        self.assertEqual(response.data['with_manager'], 3)
        self.assertEqual(response.data['without_manager'], 5)  # 2 employees + 1 manager + 1 admin + 1 hr

    def test_employee_statistics_by_role_breakdown(self):
        """Test employee statistics role breakdown."""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/employees/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('by_role', response.data)
        
        # Verify role counts
        by_role = {item['role']: item['count'] for item in response.data['by_role']}
        self.assertEqual(by_role.get('employee', 0), 5)
        self.assertEqual(by_role.get('manager', 0), 1)
        self.assertEqual(by_role.get('admin', 0), 1)
        self.assertEqual(by_role.get('hr', 0), 1)

    def test_leave_statistics_with_multiple_types(self):
        """Test leave statistics with multiple leave types."""
        employee = User.objects.filter(role='employee').first()
        
        # Create leaves of different types
        Leave.objects.create(
            user=employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=1),
            reason='Sick',
            status='pending'
        )
        Leave.objects.create(
            user=employee,
            leave_type='casual',
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=6),
            reason='Personal',
            status='approved'
        )
        Leave.objects.create(
            user=employee,
            leave_type='annual',
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=15),
            reason='Vacation',
            status='rejected'
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_leaves'], 3)
        self.assertEqual(response.data['pending_count'], 1)
        
        # Check by_type breakdown
        by_type = {item['leave_type']: item['count'] for item in response.data['by_type']}
        self.assertEqual(by_type.get('sick', 0), 1)
        self.assertEqual(by_type.get('casual', 0), 1)
        self.assertEqual(by_type.get('annual', 0), 1)

    def test_leave_statistics_by_status_breakdown(self):
        """Test leave statistics status breakdown."""
        employee = User.objects.filter(role='employee').first()
        
        # Create leaves with different statuses
        Leave.objects.create(
            user=employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today(),
            reason='Test',
            status='pending'
        )
        Leave.objects.create(
            user=employee,
            leave_type='sick',
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=1),
            reason='Test',
            status='approved'
        )
        Leave.objects.create(
            user=employee,
            leave_type='sick',
            start_date=date.today() + timedelta(days=2),
            end_date=date.today() + timedelta(days=2),
            reason='Test',
            status='rejected'
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check by_status breakdown
        by_status = {item['status']: item['count'] for item in response.data['by_status']}
        self.assertEqual(by_status.get('pending', 0), 1)
        self.assertEqual(by_status.get('approved', 0), 1)
        self.assertEqual(by_status.get('rejected', 0), 1)

    def test_dashboard_metrics_with_no_data(self):
        """Test dashboard metrics when there's no data."""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pending_leaves'], 0)
        self.assertEqual(response.data['upcoming_holidays'], 0)
        self.assertEqual(response.data['active_announcements'], 0)

    def test_dashboard_metrics_with_past_holidays(self):
        """Test that past holidays are not counted."""
        # Create past holiday
        Holiday.objects.create(
            name='Past Holiday',
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() - timedelta(days=10),
            created_by=self.admin_user
        )
        
        # Create future holiday
        Holiday.objects.create(
            name='Future Holiday',
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=10),
            created_by=self.admin_user
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only future holiday should be counted
        self.assertEqual(response.data['upcoming_holidays'], 1)

    def test_dashboard_metrics_with_inactive_announcements(self):
        """Test that inactive announcements are not counted."""
        # Create inactive announcement
        Announcement.objects.create(
            title='Inactive Announcement',
            message='Test',
            created_by=self.admin_user,
            is_active=False
        )
        
        # Create active announcement
        Announcement.objects.create(
            title='Active Announcement',
            message='Test',
            created_by=self.admin_user,
            is_active=True
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/hr/reports/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only active announcement should be counted
        self.assertEqual(response.data['active_announcements'], 1)

    def test_admin_can_access_all_reports(self):
        """Test that admin can access all HR reports."""
        self.client.force_authenticate(user=self.admin_user)
        
        # Dashboard metrics
        response = self.client.get('/api/hr/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Employee statistics
        response = self.client.get('/api/hr/reports/employees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Leave statistics
        response = self.client.get('/api/hr/reports/leaves/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
