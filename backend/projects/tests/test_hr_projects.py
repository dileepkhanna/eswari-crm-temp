"""
Tests for HR access restrictions to projects module.
Verifies that HR users receive 403 Forbidden when accessing projects.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project

User = get_user_model()


class HRProjectAccessTest(TestCase):
    """Test that HR users cannot access projects module"""
    
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
        
        # Create a test project
        self.project = Project.objects.create(
            name='Test Project',
            description='Test Description',
            status='active',
            manager=self.admin_user
        )
    
    def test_hr_cannot_list_projects(self):
        """Test that HR users get 403 when listing projects"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIn('Access denied. HR users do not have permission to access this module.', response.data['detail'])
    
    def test_hr_cannot_retrieve_project(self):
        """Test that HR users get 403 when retrieving a project"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/projects/{self.project.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_create_project(self):
        """Test that HR users get 403 when creating a project"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'New Project',
            'description': 'New Description',
            'status': 'active',
            'manager': self.admin_user.id
        }
        response = self.client.post('/api/projects/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_update_project(self):
        """Test that HR users get 403 when updating a project"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'Updated Project',
            'description': 'Updated Description',
            'status': 'completed'
        }
        response = self.client.put(f'/api/projects/{self.project.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_partial_update_project(self):
        """Test that HR users get 403 when partially updating a project"""
        self.client.force_authenticate(user=self.hr_user)
        data = {'name': 'Patched Project'}
        response = self.client.patch(f'/api/projects/{self.project.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_delete_project(self):
        """Test that HR users get 403 when deleting a project"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.delete(f'/api/projects/{self.project.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_upload_cover_image(self):
        """Test that HR users get 403 when uploading cover image"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.post('/api/projects/upload_cover_image/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_upload_blueprint_image(self):
        """Test that HR users get 403 when uploading blueprint image"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.post('/api/projects/upload_blueprint_image/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_admin_can_access_projects(self):
        """Test that admin users can still access projects (sanity check)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
