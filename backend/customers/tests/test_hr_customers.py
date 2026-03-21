"""
Tests for HR access restrictions to customers module.

This test suite verifies that HR users are properly blocked from accessing
the customers module with 403 Forbidden responses.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from customers.models import Customer

User = get_user_model()


class HRCustomerAccessTestCase(TestCase):
    """Test HR users cannot access customers module"""
    
    def setUp(self):
        """Set up test data"""
        # Create test company
        self.company = Company.objects.create(
            name="HR Test Company",
            code="HRTEST",
            is_active=True
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User',
            company=self.company
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User',
            company=self.company
        )
        
        # Create employee user
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            company=self.company
        )
        
        # Create a test customer
        self.customer = Customer.objects.create(
            name='Test Customer',
            phone='1234567890',
            call_status='pending',
            assigned_to=self.employee_user,
            created_by=self.admin_user
        )
        
        self.client = APIClient()
    
    def test_hr_cannot_list_customers(self):
        """Test HR user gets 403 when listing customers"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_retrieve_customer(self):
        """Test HR user gets 403 when retrieving a customer"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/customers/{self.customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_create_customer(self):
        """Test HR user gets 403 when creating a customer"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'New Customer',
            'phone': '9876543210',
            'call_status': 'pending'
        }
        response = self.client.post('/api/customers/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_update_customer(self):
        """Test HR user gets 403 when updating a customer"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'name': 'Updated Customer',
            'phone': '1234567890',
            'call_status': 'contacted'
        }
        response = self.client.put(f'/api/customers/{self.customer.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_delete_customer(self):
        """Test HR user gets 403 when deleting a customer"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.delete(f'/api/customers/{self.customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_bulk_import_customers(self):
        """Test HR user gets 403 when bulk importing customers"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'customers': [
                {
                    'name': 'Bulk Customer 1',
                    'phone': '1111111111',
                    'call_status': 'pending'
                }
            ]
        }
        response = self.client.post('/api/customers/bulk_import/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_convert_customer_to_lead(self):
        """Test HR user gets 403 when converting customer to lead"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.post(f'/api/customers/{self.customer.id}/convert_to_lead/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_bulk_assign_customers(self):
        """Test HR user gets 403 when bulk assigning customers"""
        self.client.force_authenticate(user=self.hr_user)
        data = {
            'customer_ids': [self.customer.id],
            'employee_id': self.employee_user.id
        }
        response = self.client.post('/api/customers/bulk_assign/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_admin_can_access_customers(self):
        """Test admin user can access customers (sanity check)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_employee_can_access_customers(self):
        """Test employee user can access customers (sanity check)"""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)



class HRCallAllocationAccessTestCase(TestCase):
    """Test HR users cannot access call allocations module"""
    
    def setUp(self):
        """Set up test data"""
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_test_ca',
            email='hr_ca@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test_ca',
            email='admin_ca@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create employee user
        self.employee_user = User.objects.create_user(
            username='employee_test_ca',
            email='employee_ca@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User'
        )
        
        # Create a test call allocation
        from customers.models import CallAllocation
        from datetime import date
        self.call_allocation = CallAllocation.objects.create(
            employee=self.employee_user,
            date=date.today(),
            total_allocated=100,
            completed=0,
            pending=100,
            created_by=self.admin_user
        )
        
        self.client = APIClient()
    
    def test_hr_cannot_list_call_allocations(self):
        """Test HR user gets 403 when listing call allocations"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/allocations/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_retrieve_call_allocation(self):
        """Test HR user gets 403 when retrieving a call allocation"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(f'/api/allocations/{self.call_allocation.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_create_call_allocation(self):
        """Test HR user gets 403 when creating a call allocation"""
        self.client.force_authenticate(user=self.hr_user)
        from datetime import date
        data = {
            'employee': self.employee_user.id,
            'date': date.today().isoformat(),
            'total_allocated': 50,
            'completed': 0,
            'pending': 50
        }
        response = self.client.post('/api/allocations/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_update_call_allocation(self):
        """Test HR user gets 403 when updating a call allocation"""
        self.client.force_authenticate(user=self.hr_user)
        from datetime import date
        data = {
            'employee': self.employee_user.id,
            'date': date.today().isoformat(),
            'total_allocated': 150,
            'completed': 50,
            'pending': 100
        }
        response = self.client.put(f'/api/allocations/{self.call_allocation.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_hr_cannot_delete_call_allocation(self):
        """Test HR user gets 403 when deleting a call allocation"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.delete(f'/api/allocations/{self.call_allocation.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access denied. HR users do not have permission to access this module.', str(response.data))
    
    def test_admin_can_access_call_allocations(self):
        """Test admin user can access call allocations (sanity check)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/allocations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
