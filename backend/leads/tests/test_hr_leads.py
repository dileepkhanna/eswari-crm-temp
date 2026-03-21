"""
Tests for HR access restrictions to leads module.
Verifies that HR users receive 403 Forbidden when accessing leads.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from leads.models import Lead

User = get_user_model()


class HRLeadAccessTest(TestCase):
    """Test that HR users cannot access leads module"""
    
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
        
        # Create a test lead
        self.lead = Lead.objects.create(
            name='Test Lead',
            email='lead@test.com',
            phone='1234567890',
            status='new',
            source='website',
            assigned_to=self.admin_user,
            created_by=self.admin_user
        )
    
    def test_hr_cannot_list_leads(self):
        """Test that HR users get 403 when listing leads"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/leads/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIn('Access denied. HR users do not have permission to access this module.', response.data['detail'])
    
    def test_hr_cannot_retrieve_lead(self):
        """Test that HR users get 403 when retrieving a lead"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/leads/{self.lead.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_create_lead(self):
        """Test that HR users get 403 when creating a lead"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'New Lead',
            'email': 'newlead@test.com',
            'phone': '9876543210',
            'status': 'new',
            'source': 'referral',
            'assigned_to': self.admin_user.id
        }
        response = self.client.post('/api/leads/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_update_lead(self):
        """Test that HR users get 403 when updating a lead"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'Updated Lead',
            'email': 'updated@test.com',
            'phone': '1111111111',
            'status': 'contacted'
        }
        response = self.client.put(f'/api/leads/{self.lead.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_partial_update_lead(self):
        """Test that HR users get 403 when partially updating a lead"""
        self.client.force_authenticate(user=self.hr_user)
        data = {'name': 'Patched Lead'}
        response = self.client.patch(f'/api/leads/{self.lead.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_delete_lead(self):
        """Test that HR users get 403 when deleting a lead"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.delete(f'/api/leads/{self.lead.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_bulk_delete_leads(self):
        """Test that HR users get 403 when bulk deleting leads"""
        self.client.force_authenticate(user=self.hr_user)
        data = {'lead_ids': [self.lead.id]}
        response = self.client.post('/api/leads/bulk_delete/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_admin_can_access_leads(self):
        """Test that admin users can still access leads (sanity check)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/leads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
