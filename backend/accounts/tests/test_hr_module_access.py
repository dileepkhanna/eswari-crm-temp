"""
Test HR module access restrictions

This test verifies that HR users are properly blocked from accessing
sales-related modules (leads, customers, projects, tasks).
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class HRModuleAccessTest(TestCase):
    """Test that HR users cannot access sales modules"""
    
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
        
        # Create admin user for comparison
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        self.client = APIClient()
    
    def test_hr_cannot_access_leads(self):
        """Test that HR users get 403 when accessing leads"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/leads/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied', str(response.data))
    
    def test_hr_cannot_access_customers(self):
        """Test that HR users get 403 when accessing customers"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied', str(response.data))
    
    def test_hr_cannot_access_projects(self):
        """Test that HR users get 403 when accessing projects"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied', str(response.data))
    
    def test_hr_cannot_access_tasks(self):
        """Test that HR users get 403 when accessing tasks"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/tasks/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied', str(response.data))
    
    def test_admin_can_access_all_modules(self):
        """Test that admin users can still access all modules"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Admin should be able to access all modules
        leads_response = self.client.get('/api/leads/')
        customers_response = self.client.get('/api/customers/')
        projects_response = self.client.get('/api/projects/')
        tasks_response = self.client.get('/api/tasks/')
        
        # All should return 200 OK (not 403)
        self.assertEqual(leads_response.status_code, status.HTTP_200_OK)
        self.assertEqual(customers_response.status_code, status.HTTP_200_OK)
        self.assertEqual(projects_response.status_code, status.HTTP_200_OK)
        self.assertEqual(tasks_response.status_code, status.HTTP_200_OK)
    
    def test_hr_cannot_create_lead(self):
        """Test that HR users cannot create leads"""
        self.client.force_authenticate(user=self.hr_user)
        
        lead_data = {
            'name': 'Test Lead',
            'email': 'test@example.com',
            'phone': '1234567890',
            'status': 'new'
        }
        
        response = self.client.post('/api/leads/', lead_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_hr_cannot_create_customer(self):
        """Test that HR users cannot create customers"""
        self.client.force_authenticate(user=self.hr_user)
        
        customer_data = {
            'name': 'Test Customer',
            'phone': '1234567890',
            'call_status': 'pending'
        }
        
        response = self.client.post('/api/customers/', customer_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_hr_cannot_create_project(self):
        """Test that HR users cannot create projects"""
        self.client.force_authenticate(user=self.hr_user)
        
        project_data = {
            'name': 'Test Project',
            'description': 'Test Description',
            'status': 'planning'
        }
        
        response = self.client.post('/api/projects/', project_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_hr_cannot_create_task(self):
        """Test that HR users cannot create tasks"""
        self.client.force_authenticate(user=self.hr_user)
        
        task_data = {
            'title': 'Test Task',
            'description': 'Test Description',
            'status': 'pending',
            'priority': 'medium'
        }
        
        response = self.client.post('/api/tasks/', task_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
