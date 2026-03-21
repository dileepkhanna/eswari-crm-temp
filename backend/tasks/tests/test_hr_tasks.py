"""
Tests for HR access restrictions to tasks module.
Verifies that HR users receive 403 Forbidden when accessing tasks.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tasks.models import Task

User = get_user_model()


class HRTaskAccessTest(TestCase):
    """Test that HR users cannot access tasks module"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
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
        
        # Create a test task
        self.task = Task.objects.create(
            title='Test Task',
            description='Test Description',
            status='pending',
            priority='medium',
            assigned_to=self.admin_user,
            created_by=self.admin_user
        )
    
    def test_hr_cannot_list_tasks(self):
        """Test that HR users get 403 when listing tasks"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/tasks/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIn('Access denied. HR users do not have permission to access this module.', response.data['detail'])
    
    def test_hr_cannot_retrieve_task(self):
        """Test that HR users get 403 when retrieving a task"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/tasks/{self.task.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_create_task(self):
        """Test that HR users get 403 when creating a task"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'title': 'New Task',
            'description': 'New Description',
            'status': 'pending',
            'priority': 'high',
            'assigned_to': self.admin_user.id
        }
        response = self.client.post('/api/tasks/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_update_task(self):
        """Test that HR users get 403 when updating a task"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'title': 'Updated Task',
            'description': 'Updated Description',
            'status': 'completed',
            'priority': 'low'
        }
        response = self.client.put(f'/api/tasks/{self.task.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_partial_update_task(self):
        """Test that HR users get 403 when partially updating a task"""
        self.client.force_authenticate(user=self.hr_user)
        data = {'title': 'Patched Task'}
        response = self.client.patch(f'/api/tasks/{self.task.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_delete_task(self):
        """Test that HR users get 403 when deleting a task"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.delete(f'/api/tasks/{self.task.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_admin_can_access_tasks(self):
        """Test that admin users can still access tasks (sanity check)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/tasks/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
