from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from announcements.models import Announcement

User = get_user_model()


class HRAnnouncementAccessTestCase(TestCase):
    """Test HR user can view all announcements"""
    
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
        
        # Create announcements
        self.announcement1 = Announcement.objects.create(
            title='General Announcement',
            message='This is for everyone',
            priority='medium',
            created_by=self.admin,
            is_active=True
        )
        
        self.announcement2 = Announcement.objects.create(
            title='Manager Only',
            message='This is for managers',
            priority='high',
            created_by=self.admin,
            target_roles=['manager'],
            is_active=True
        )
        
        self.announcement3 = Announcement.objects.create(
            title='Inactive Announcement',
            message='This is inactive',
            priority='low',
            created_by=self.admin,
            is_active=False
        )
    
    def test_hr_can_view_all_announcements(self):
        """Test that HR user can view all announcements including inactive ones"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/announcements/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            announcements = response.data['results']
        else:
            announcements = response.data
        
        self.assertEqual(len(announcements), 3)  # Should see all 3 announcements
        
        # Verify HR sees inactive announcements too
        announcement_titles = [a['title'] for a in announcements]
        self.assertIn('Inactive Announcement', announcement_titles)
    
    def test_employee_cannot_view_inactive_announcements(self):
        """Test that employee user cannot view inactive announcements"""
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/announcements/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            announcements = response.data['results']
        else:
            announcements = response.data
        
        # Employee should only see active announcements they have access to
        announcement_titles = [a['title'] for a in announcements]
        self.assertNotIn('Inactive Announcement', announcement_titles)
    
    def test_hr_can_view_role_specific_announcements(self):
        """Test that HR can view announcements targeted to specific roles"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/announcements/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            announcements = response.data['results']
        else:
            announcements = response.data
        
        # HR should see manager-only announcement
        announcement_titles = [a['title'] for a in announcements]
        self.assertIn('Manager Only', announcement_titles)
    
    def test_hr_unread_announcements(self):
        """Test that HR can view unread announcements endpoint"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/announcements/unread/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            announcements = response.data['results']
        else:
            announcements = response.data
        
        # HR should see unread announcements (excluding expired ones)
        # The unread endpoint filters by expiry date, so we expect at least 2
        self.assertGreaterEqual(len(announcements), 2)
        
        # Verify HR can see the general announcement
        announcement_titles = [a['title'] for a in announcements]
        self.assertIn('General Announcement', announcement_titles)


class HRAnnouncementCreationTestCase(TestCase):
    """Test HR user can create announcements"""
    
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
    
    def test_hr_can_create_announcement(self):
        """Test that HR user can create a basic announcement"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'title': 'HR Announcement',
            'message': 'This is an announcement from HR',
            'priority': 'high',
            'target_roles': ['employee', 'manager'],
            'is_active': True
        }
        
        response = self.client.post('/api/announcements/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'HR Announcement')
        self.assertEqual(response.data['message'], 'This is an announcement from HR')
        self.assertEqual(response.data['priority'], 'high')
        self.assertEqual(response.data['created_by'], self.hr_user.id)
        
        # Verify announcement was created in database
        announcement = Announcement.objects.get(title='HR Announcement')
        self.assertEqual(announcement.created_by, self.hr_user)
        self.assertEqual(announcement.priority, 'high')
    
    def test_hr_can_create_announcement_with_all_fields(self):
        """Test that HR can create announcement with all fields including expiry"""
        self.client.force_authenticate(user=self.hr_user)
        
        from django.utils import timezone
        from datetime import timedelta
        
        expires_at = timezone.now() + timedelta(days=7)
        
        data = {
            'title': 'Complete Announcement',
            'message': 'This has all fields',
            'priority': 'medium',
            'target_roles': ['admin', 'manager', 'employee', 'hr'],
            'expires_at': expires_at.isoformat(),
            'is_active': True
        }
        
        response = self.client.post('/api/announcements/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Complete Announcement')
        self.assertIsNotNone(response.data['expires_at'])
    
    def test_hr_can_assign_announcements_to_any_employees(self):
        """Test that HR can assign announcements to any employees (not restricted like managers)"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'title': 'Assigned Announcement',
            'message': 'This is assigned to specific employees',
            'priority': 'high',
            'target_roles': ['employee'],
            'assigned_employee_ids': [self.employee1.id, self.employee2.id],
            'is_active': True
        }
        
        response = self.client.post('/api/announcements/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify employees were assigned
        announcement = Announcement.objects.get(title='Assigned Announcement')
        assigned_ids = list(announcement.assigned_employees.values_list('id', flat=True))
        self.assertIn(self.employee1.id, assigned_ids)
        self.assertIn(self.employee2.id, assigned_ids)
    
    def test_hr_can_create_announcement_for_all_roles(self):
        """Test that HR can create announcements targeting all roles"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'title': 'Company-wide Announcement',
            'message': 'This is for everyone',
            'priority': 'high',
            'target_roles': [],  # Empty means all roles
            'is_active': True
        }
        
        response = self.client.post('/api/announcements/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Company-wide Announcement')
    
    def test_employee_cannot_create_announcement(self):
        """Test that employee user cannot create announcements"""
        self.client.force_authenticate(user=self.employee1)
        
        data = {
            'title': 'Employee Announcement',
            'message': 'This should fail',
            'priority': 'low',
            'is_active': True
        }
        
        response = self.client.post('/api/announcements/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HRAnnouncementUpdateTestCase(TestCase):
    """Test HR user can update announcements"""
    
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
        
        # Create announcement by manager
        self.manager_announcement = Announcement.objects.create(
            title='Manager Announcement',
            message='Created by manager',
            priority='medium',
            created_by=self.manager,
            is_active=True
        )
        
        # Create announcement by admin
        self.admin_announcement = Announcement.objects.create(
            title='Admin Announcement',
            message='Created by admin',
            priority='high',
            created_by=self.admin,
            is_active=True
        )
    
    def test_hr_can_update_any_announcement(self):
        """Test that HR can update announcements created by others"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'title': 'Updated by HR',
            'message': 'HR updated this announcement',
            'priority': 'high',
            'is_active': True
        }
        
        response = self.client.put(
            f'/api/announcements/{self.manager_announcement.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated by HR')
        
        # Verify in database
        self.manager_announcement.refresh_from_db()
        self.assertEqual(self.manager_announcement.title, 'Updated by HR')
    
    def test_hr_can_update_admin_announcement(self):
        """Test that HR can update announcements created by admin"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'title': 'HR Updated Admin Announcement',
            'message': 'HR can update admin announcements',
            'priority': 'medium',
            'is_active': True
        }
        
        response = self.client.put(
            f'/api/announcements/{self.admin_announcement.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'HR Updated Admin Announcement')


class HRAnnouncementDeleteTestCase(TestCase):
    """Test HR user can delete announcements"""
    
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
        
        # Create announcement by manager
        self.manager_announcement = Announcement.objects.create(
            title='Manager Announcement',
            message='Created by manager',
            priority='medium',
            created_by=self.manager,
            is_active=True
        )
        
        # Create announcement by admin
        self.admin_announcement = Announcement.objects.create(
            title='Admin Announcement',
            message='Created by admin',
            priority='high',
            created_by=self.admin,
            is_active=True
        )
    
    def test_hr_can_delete_any_announcement(self):
        """Test that HR can delete announcements created by others"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/announcements/{self.manager_announcement.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify announcement was deleted
        self.assertFalse(Announcement.objects.filter(id=self.manager_announcement.id).exists())
    
    def test_hr_can_delete_admin_announcement(self):
        """Test that HR can delete announcements created by admin"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/announcements/{self.admin_announcement.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify announcement was deleted
        self.assertFalse(Announcement.objects.filter(id=self.admin_announcement.id).exists())
    
    def test_hr_can_toggle_announcement_active_status(self):
        """Test that HR can toggle announcement active status"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Toggle to inactive
        response = self.client.patch(f'/api/announcements/{self.manager_announcement.id}/toggle_active/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        # Verify in database
        self.manager_announcement.refresh_from_db()
        self.assertFalse(self.manager_announcement.is_active)
        
        # Toggle back to active
        response = self.client.patch(f'/api/announcements/{self.manager_announcement.id}/toggle_active/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_active'])



class HRAnnouncementFilteringTest(TestCase):
    """Tests for announcement filtering functionality."""

    def setUp(self):
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_filter_ann',
            email='hr_filter_ann@test.com',
            password='testpass123',
            role='hr'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_filter_ann',
            email='admin_filter_ann@test.com',
            password='testpass123',
            role='admin'
        )
        
        # Create announcements with different priorities
        Announcement.objects.create(
            title='Low Priority',
            message='Test message',
            created_by=self.admin_user,
            priority='low',
            is_active=True
        )
        Announcement.objects.create(
            title='Medium Priority',
            message='Test message',
            created_by=self.admin_user,
            priority='medium',
            is_active=True
        )
        Announcement.objects.create(
            title='High Priority',
            message='Test message',
            created_by=self.admin_user,
            priority='high',
            is_active=True
        )

    def test_hr_can_filter_announcements_by_priority(self):
        """Test HR can filter announcements by priority."""
        self.client.force_authenticate(user=self.hr_user)
        
        # Filter by high priority
        response = self.client.get('/api/announcements/?priority=high')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Filter by low priority
        response = self.client.get('/api/announcements/?priority=low')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_can_filter_announcements_by_active_status(self):
        """Test HR can filter announcements by active status."""
        # Create inactive announcement
        Announcement.objects.create(
            title='Inactive',
            message='Test',
            created_by=self.admin_user,
            is_active=False
        )
        
        self.client.force_authenticate(user=self.hr_user)
        
        # Filter by active
        response = self.client.get('/api/announcements/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_can_get_announcement_detail(self):
        """Test HR can get individual announcement details."""
        self.client.force_authenticate(user=self.hr_user)
        
        announcement = Announcement.objects.first()
        response = self.client.get(f'/api/announcements/{announcement.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], announcement.id)

    def test_hr_can_create_announcement_with_expiry(self):
        """Test HR can create announcement with expiration date."""
        from datetime import datetime, timedelta
        
        self.client.force_authenticate(user=self.hr_user)
        
        expiry_date = (datetime.now() + timedelta(days=30)).isoformat()
        response = self.client.post('/api/announcements/', {
            'title': 'Expiring Announcement',
            'message': 'This will expire',
            'priority': 'medium',
            'expires_at': expiry_date
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data.get('expires_at'))

    def test_hr_can_update_announcement_priority(self):
        """Test HR can update announcement priority."""
        announcement = Announcement.objects.create(
            title='Test',
            message='Test',
            created_by=self.admin_user,
            priority='low'
        )
        
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.patch(f'/api/announcements/{announcement.id}/', {
            'priority': 'high'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        announcement.refresh_from_db()
        self.assertEqual(announcement.priority, 'high')


class HRAnnouncementTargetingTest(TestCase):
    """Tests for announcement role targeting."""

    def setUp(self):
        self.client = APIClient()
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_target',
            email='hr_target@test.com',
            password='testpass123',
            role='hr'
        )
        
        # Create users of different roles
        self.manager = User.objects.create_user(
            username='manager_target',
            email='manager_target@test.com',
            password='testpass123',
            role='manager'
        )
        
        self.employee = User.objects.create_user(
            username='employee_target',
            email='employee_target@test.com',
            password='testpass123',
            role='employee'
        )

    def test_hr_can_create_announcement_for_all_roles(self):
        """Test HR can create announcement targeting all roles."""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.post('/api/announcements/', {
            'title': 'All Roles',
            'message': 'For everyone',
            'priority': 'medium'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_hr_can_create_announcement_without_targeting(self):
        """Test HR can create announcement without specific targeting."""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.post('/api/announcements/', {
            'title': 'General Announcement',
            'message': 'For all',
            'priority': 'low'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_hr_can_assign_announcement_to_specific_employees(self):
        """Test HR can assign announcement to specific employees."""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.post('/api/announcements/', {
            'title': 'Specific Employees',
            'message': 'For specific people',
            'priority': 'high',
            'assigned_employees': [self.employee.id, self.manager.id]
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
