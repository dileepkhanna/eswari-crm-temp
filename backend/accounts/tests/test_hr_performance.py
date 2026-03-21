"""
Performance tests for HR endpoints.
Tests that HR endpoints meet performance requirements.
"""
import time
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

# Import models for dashboard test data
try:
    from leaves.models import Leave
except ImportError:
    Leave = None

try:
    from holidays.models import Holiday
except ImportError:
    Holiday = None

try:
    from announcements.models import Announcement
except ImportError:
    Announcement = None


class HRPerformanceTests(TestCase):
    """Test performance of HR endpoints."""
    
    def setUp(self):
        """Set up test data."""
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create test employees (100 users for realistic load testing)
        self.employees = []
        for i in range(100):
            user = User.objects.create_user(
                username=f'employee_{i}',
                email=f'employee{i}@test.com',
                password='testpass123',
                role='employee',
                first_name=f'Employee{i}',
                last_name=f'Test{i}'
            )
            self.employees.append(user)
        
        # Set up API client with HR authentication
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.hr_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    def test_employee_list_load_time(self):
        """Test that employee list loads in under 2 seconds."""
        # Warm up the database connection
        self.client.get('/api/auth/users/')
        
        # Measure actual load time
        start_time = time.time()
        response = self.client.get('/api/auth/users/')
        end_time = time.time()
        
        load_time = end_time - start_time
        
        # Assert response is successful
        self.assertEqual(response.status_code, 200)
        
        # Assert load time is under 2 seconds
        self.assertLess(
            load_time, 
            2.0, 
            f"Employee list took {load_time:.3f}s to load (requirement: < 2s)"
        )
        
        # Log the actual load time
        print(f"\n✓ Employee list load time: {load_time:.3f}s (requirement: < 2s)")
    
    def test_employee_list_with_pagination(self):
        """Test employee list with pagination for better performance."""
        start_time = time.time()
        response = self.client.get('/api/auth/users/?page=1&page_size=50')
        end_time = time.time()
        
        load_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            load_time, 
            1.0, 
            f"Paginated employee list took {load_time:.3f}s (should be < 1s)"
        )
        
        print(f"✓ Paginated employee list load time: {load_time:.3f}s")
    
    def test_employee_list_with_search(self):
        """Test employee list with search filter performance."""
        start_time = time.time()
        response = self.client.get('/api/auth/users/?search=employee')
        end_time = time.time()
        
        load_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            load_time, 
            2.0, 
            f"Employee search took {load_time:.3f}s (requirement: < 2s)"
        )
        
        print(f"✓ Employee search load time: {load_time:.3f}s")
    
    def test_employee_list_with_role_filter(self):
        """Test employee list with role filter performance."""
        start_time = time.time()
        response = self.client.get('/api/auth/users/?role=employee')
        end_time = time.time()
        
        load_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            load_time, 
            2.0, 
            f"Employee role filter took {load_time:.3f}s (requirement: < 2s)"
        )
        
        print(f"✓ Employee role filter load time: {load_time:.3f}s")
    
    def test_multiple_concurrent_requests(self):
        """Test performance with multiple requests (simulating concurrent users)."""
        total_time = 0
        num_requests = 5
        
        for i in range(num_requests):
            start_time = time.time()
            response = self.client.get('/api/auth/users/')
            end_time = time.time()
            
            self.assertEqual(response.status_code, 200)
            total_time += (end_time - start_time)
        
        avg_time = total_time / num_requests
        
        self.assertLess(
            avg_time, 
            2.0, 
            f"Average load time over {num_requests} requests: {avg_time:.3f}s"
        )
        
        print(f"✓ Average load time ({num_requests} requests): {avg_time:.3f}s")
    
    def test_dashboard_metrics_load_time(self):
        """Test that dashboard metrics endpoint loads in under 3 seconds."""
        # Create realistic test data for dashboard
        if Leave:
            # Create pending leaves
            for i in range(10):
                Leave.objects.create(
                    user=self.employees[i],
                    leave_type='sick',
                    start_date=datetime.now().date(),
                    end_date=datetime.now().date() + timedelta(days=1),
                    reason='Test leave',
                    status='pending'
                )
        
        if Holiday:
            # Create upcoming holidays
            for i in range(5):
                Holiday.objects.create(
                    name=f'Holiday {i}',
                    start_date=datetime.now().date() + timedelta(days=i+1),
                    description='Test holiday',
                    created_by=self.hr_user
                )
        
        if Announcement:
            # Create active announcements
            for i in range(3):
                Announcement.objects.create(
                    title=f'Announcement {i}',
                    message='Test announcement',
                    priority='medium',
                    created_by=self.hr_user,
                    is_active=True
                )
        
        # Warm up the database connection
        self.client.get('/api/hr/reports/dashboard/')
        
        # Measure actual load time
        start_time = time.time()
        response = self.client.get('/api/hr/reports/dashboard/')
        end_time = time.time()
        
        load_time = end_time - start_time
        
        # Assert response is successful
        self.assertEqual(response.status_code, 200)
        
        # Assert load time is under 3 seconds (requirement from Task 4.5)
        self.assertLess(
            load_time, 
            3.0, 
            f"Dashboard metrics took {load_time:.3f}s to load (requirement: < 3s)"
        )
        
        # Log the actual load time
        print(f"\n✓ Dashboard metrics load time: {load_time:.3f}s (requirement: < 3s)")
        
        # Verify data is returned correctly
        self.assertIn('total_employees', response.data)
        self.assertIn('pending_leaves', response.data)
        self.assertIn('upcoming_holidays', response.data)
        self.assertIn('active_announcements', response.data)
    
    def test_dashboard_metrics_multiple_requests(self):
        """Test dashboard metrics performance with multiple requests."""
        total_time = 0
        num_requests = 5
        
        for i in range(num_requests):
            start_time = time.time()
            response = self.client.get('/api/hr/reports/dashboard/')
            end_time = time.time()
            
            self.assertEqual(response.status_code, 200)
            total_time += (end_time - start_time)
        
        avg_time = total_time / num_requests
        
        self.assertLess(
            avg_time, 
            3.0, 
            f"Average dashboard load time over {num_requests} requests: {avg_time:.3f}s"
        )
        
        print(f"✓ Average dashboard load time ({num_requests} requests): {avg_time:.3f}s")
