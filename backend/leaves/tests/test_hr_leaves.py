from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from leaves.models import Leave
from datetime import date, timedelta

User = get_user_model()


class HRLeaveAccessTestCase(TestCase):
    """Test HR user can view all leaves"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee users
        self.employee1 = User.objects.create_user(
            username='employee1',
            email='employee1@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='One',
            manager=self.manager
        )
        
        self.employee2 = User.objects.create_user(
            username='employee2',
            email='employee2@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='Two',
            manager=self.manager
        )
        
        # Create leaves for different users
        self.leave1 = Leave.objects.create(
            user=self.employee1,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2),
            reason='Sick leave',
            status='pending'
        )
        
        self.leave2 = Leave.objects.create(
            user=self.employee2,
            leave_type='casual',
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=7),
            reason='Personal work',
            status='pending'
        )
        
        self.leave3 = Leave.objects.create(
            user=self.manager,
            leave_type='annual',
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=15),
            reason='Vacation',
            status='approved',
            approved_by=self.admin
        )
    
    def test_hr_can_view_all_leaves(self):
        """Test that HR user can view all leaves from all employees"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            leaves = response.data['results']
        else:
            leaves = response.data
        
        self.assertEqual(len(leaves), 3)  # Should see all 3 leaves
    
    def test_employee_can_only_view_own_leaves(self):
        """Test that employee user can only view their own leaves"""
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get('/api/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            leaves = response.data['results']
        else:
            leaves = response.data
        
        self.assertEqual(len(leaves), 1)  # Should only see their own leave
        self.assertEqual(leaves[0]['user'], self.employee1.id)
    
    def test_manager_can_view_team_leaves(self):
        """Test that manager can view leaves from their team"""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get('/api/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            leaves = response.data['results']
        else:
            leaves = response.data
        
        # Manager should see their own leave + their employees' leaves
        self.assertEqual(len(leaves), 3)


class HRLeaveApprovalTestCase(TestCase):
    """Test HR user can approve and reject leaves"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
        
        # Create pending leave
        self.pending_leave = Leave.objects.create(
            user=self.employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2),
            reason='Sick leave',
            status='pending'
        )
    
    def test_hr_can_approve_leave(self):
        """Test that HR user can approve leave requests"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.patch(f'/api/leaves/{self.pending_leave.id}/approve/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        self.assertEqual(response.data['approved_by'], self.hr_user.id)
        
        # Verify in database
        self.pending_leave.refresh_from_db()
        self.assertEqual(self.pending_leave.status, 'approved')
        self.assertEqual(self.pending_leave.approved_by, self.hr_user)
    
    def test_hr_can_reject_leave(self):
        """Test that HR user can reject leave requests"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'rejection_reason': 'Insufficient leave balance'
        }
        
        response = self.client.patch(
            f'/api/leaves/{self.pending_leave.id}/reject/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')
        self.assertEqual(response.data['approved_by'], self.hr_user.id)
        
        # Verify in database
        self.pending_leave.refresh_from_db()
        self.assertEqual(self.pending_leave.status, 'rejected')
        self.assertEqual(self.pending_leave.rejection_reason, 'Insufficient leave balance')
    
    def test_employee_cannot_approve_leave(self):
        """Test that employee user cannot approve leaves"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.patch(f'/api/leaves/{self.pending_leave.id}/approve/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HRLeaveDeleteTestCase(TestCase):
    """Test HR user can delete leaves"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
        
        # Create leaves
        self.leave1 = Leave.objects.create(
            user=self.employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=2),
            reason='Sick leave',
            status='pending'
        )
        
        self.leave2 = Leave.objects.create(
            user=self.employee,
            leave_type='casual',
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=7),
            reason='Personal work',
            status='approved',
            approved_by=self.admin
        )
    
    def test_hr_can_delete_pending_leave(self):
        """Test that HR user can delete pending leaves"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/leaves/{self.leave1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify leave was deleted
        self.assertFalse(Leave.objects.filter(id=self.leave1.id).exists())
    
    def test_hr_can_delete_approved_leave(self):
        """Test that HR user can delete approved leaves"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/leaves/{self.leave2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify leave was deleted
        self.assertFalse(Leave.objects.filter(id=self.leave2.id).exists())
    
    def test_employee_cannot_delete_leave(self):
        """Test that employee user cannot delete leaves"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.delete(f'/api/leaves/{self.leave1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify leave still exists
        self.assertTrue(Leave.objects.filter(id=self.leave1.id).exists())
    
    def test_manager_cannot_delete_leave(self):
        """Test that manager user cannot delete leaves"""
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.delete(f'/api/leaves/{self.leave1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify leave still exists
        self.assertTrue(Leave.objects.filter(id=self.leave1.id).exists())



class HRLeaveFilteringTest(TestCase):
    """Tests for leave filtering functionality."""

    def setUp(self):
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_filter',
            email='hr_filter@test.com',
            password='testpass123',
            role='hr'
        )
        
        # Create employee
        self.employee = User.objects.create_user(
            username='employee_filter',
            email='employee_filter@test.com',
            password='testpass123',
            role='employee'
        )
        
        # Create leaves with different statuses and types
        Leave.objects.create(
            user=self.employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=1),
            reason='Sick',
            status='pending'
        )
        Leave.objects.create(
            user=self.employee,
            leave_type='casual',
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=6),
            reason='Personal',
            status='approved'
        )
        Leave.objects.create(
            user=self.employee,
            leave_type='annual',
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=15),
            reason='Vacation',
            status='rejected'
        )

    def test_hr_can_filter_leaves_by_status(self):
        """Test HR can filter leaves by status."""
        self.client.force_authenticate(user=self.hr_user)
        
        # Filter by pending status
        response = self.client.get('/api/leaves/?status=pending')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Filter by approved status
        response = self.client.get('/api/leaves/?status=approved')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_can_filter_leaves_by_type(self):
        """Test HR can filter leaves by type."""
        self.client.force_authenticate(user=self.hr_user)
        
        # Filter by sick leave
        response = self.client.get('/api/leaves/?leave_type=sick')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Filter by casual leave
        response = self.client.get('/api/leaves/?leave_type=casual')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_can_get_leave_detail(self):
        """Test HR can get individual leave details."""
        self.client.force_authenticate(user=self.hr_user)
        
        leave = Leave.objects.first()
        response = self.client.get(f'/api/leaves/{leave.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], leave.id)

    def test_hr_can_view_leave_list(self):
        """Test HR can view leave list."""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/leaves/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see all 3 leaves created in setUp
        self.assertGreaterEqual(len(response.data), 3)


class HRLeaveApprovalEdgeCasesTest(TestCase):
    """Tests for edge cases in leave approval."""

    def setUp(self):
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_edge',
            email='hr_edge@test.com',
            password='testpass123',
            role='hr'
        )
        
        # Create employee
        self.employee = User.objects.create_user(
            username='employee_edge',
            email='employee_edge@test.com',
            password='testpass123',
            role='employee'
        )

    def test_hr_can_view_approved_leave(self):
        """Test HR can view an already approved leave."""
        leave = Leave.objects.create(
            user=self.employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=1),
            reason='Sick',
            status='approved'
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/leaves/{leave.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')

    def test_hr_can_view_rejected_leave(self):
        """Test HR can view a rejected leave."""
        leave = Leave.objects.create(
            user=self.employee,
            leave_type='sick',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=1),
            reason='Sick',
            status='rejected'
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/leaves/{leave.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')
