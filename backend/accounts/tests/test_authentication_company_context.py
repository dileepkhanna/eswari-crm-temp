"""
Tests for authentication with company context (Task 10)

Tests cover:
- Subtask 10.1: Company information in login response
- Subtask 10.2: Inactive company login prevention
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company

User = get_user_model()


class AuthenticationCompanyContextTestCase(TestCase):
    """Test authentication includes company context"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Get or create active companies (migration may have created ESWARI already)
        self.company1, _ = Company.objects.get_or_create(
            code='ESWARI',
            defaults={'name': 'Eswari Group', 'is_active': True}
        )
        self.company2, _ = Company.objects.get_or_create(
            code='ASE',
            defaults={'name': 'ASE Technologies', 'is_active': True}
        )
        
        # Create inactive company
        self.inactive_company = Company.objects.create(
            name='Inactive Corp',
            code='INACTIVE',
            is_active=False
        )
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_01',
            email='admin@eswari.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company1
        )
        
        self.hr_user = User.objects.create_user(
            username='hr_01',
            email='hr@eswari.com',
            password='testpass123',
            first_name='HR',
            last_name='User',
            role='hr',
            company=self.company1
        )
        
        self.manager_user = User.objects.create_user(
            username='manager_01',
            email='manager@eswari.com',
            password='testpass123',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=self.company1
        )
        
        self.employee_user = User.objects.create_user(
            username='employee_01',
            email='employee@eswari.com',
            password='testpass123',
            first_name='Employee',
            last_name='User',
            role='employee',
            company=self.company2,
            manager=self.manager_user
        )
        
        # Create user in inactive company
        self.inactive_company_user = User.objects.create_user(
            username='inactive_01',
            email='user@inactive.com',
            password='testpass123',
            first_name='Inactive',
            last_name='User',
            role='employee',
            company=self.inactive_company
        )
    
    def test_admin_login_includes_all_active_companies(self):
        """
        Test that admin login response includes all active companies
        Validates: Requirement 14.1, 14.2, 14.3
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIn('user', response.data)
        self.assertIn('company', response.data)
        self.assertIn('companies', response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Check user's company information
        company_info = response.data['company']
        self.assertEqual(company_info['id'], self.company1.id)
        self.assertEqual(company_info['name'], 'Eswari Group')
        self.assertEqual(company_info['code'], 'ESWARI')
        self.assertIn('logo_url', company_info)
        
        # Check companies list includes all active companies
        companies = response.data['companies']
        self.assertEqual(len(companies), 2)  # Only active companies
        
        company_ids = [c['id'] for c in companies]
        self.assertIn(self.company1.id, company_ids)
        self.assertIn(self.company2.id, company_ids)
        self.assertNotIn(self.inactive_company.id, company_ids)
        
        # Verify each company has required fields
        for company in companies:
            self.assertIn('id', company)
            self.assertIn('name', company)
            self.assertIn('code', company)
            self.assertIn('logo_url', company)
    
    def test_hr_login_includes_all_active_companies(self):
        """
        Test that HR login response includes all active companies
        Validates: Requirement 14.1, 14.2, 14.3
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'hr@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check companies list includes all active companies
        companies = response.data['companies']
        self.assertEqual(len(companies), 2)  # Only active companies
        
        company_ids = [c['id'] for c in companies]
        self.assertIn(self.company1.id, company_ids)
        self.assertIn(self.company2.id, company_ids)
    
    def test_manager_login_includes_only_assigned_company(self):
        """
        Test that manager login response includes only their assigned company
        Validates: Requirement 14.1, 14.2, 14.4
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'manager@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check company information
        company_info = response.data['company']
        self.assertEqual(company_info['id'], self.company1.id)
        self.assertEqual(company_info['name'], 'Eswari Group')
        
        # Check companies list includes only assigned company
        companies = response.data['companies']
        self.assertEqual(len(companies), 1)
        self.assertEqual(companies[0]['id'], self.company1.id)
        self.assertEqual(companies[0]['name'], 'Eswari Group')
    
    def test_employee_login_includes_only_assigned_company(self):
        """
        Test that employee login response includes only their assigned company
        Validates: Requirement 14.1, 14.2, 14.4
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check company information
        company_info = response.data['company']
        self.assertEqual(company_info['id'], self.company2.id)
        self.assertEqual(company_info['name'], 'ASE Technologies')
        
        # Check companies list includes only assigned company
        companies = response.data['companies']
        self.assertEqual(len(companies), 1)
        self.assertEqual(companies[0]['id'], self.company2.id)
    
    def test_inactive_company_login_rejected(self):
        """
        Test that users from inactive companies cannot login
        Validates: Requirement 2.6
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'user@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_login_with_username_includes_company_context(self):
        """
        Test that login with username also includes company context
        Validates: Requirement 14.1, 14.2
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin_01',  # Using username
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('company', response.data)
        self.assertIn('companies', response.data)
    
    def test_company_info_includes_logo_url(self):
        """
        Test that company information includes logo URL field
        Validates: Requirement 14.1
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check company info has logo_url
        company_info = response.data['company']
        self.assertIn('logo_url', company_info)
        
        # Check all companies in list have logo_url
        for company in response.data['companies']:
            self.assertIn('logo_url', company)
    
    def test_user_role_included_in_response(self):
        """
        Test that user's role is included in authentication response
        Validates: Requirement 14.2
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'manager@eswari.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertIn('role', response.data['user'])
        self.assertEqual(response.data['user']['role'], 'manager')
    
    def test_invalid_credentials_returns_401(self):
        """
        Test that invalid credentials return 401 without company info
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@eswari.com',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
        self.assertNotIn('company', response.data)
        self.assertNotIn('companies', response.data)
    
    def test_missing_credentials_returns_400(self):
        """
        Test that missing credentials return 400
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@eswari.com'
            # Missing password
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class CompanyActivationTestCase(TestCase):
    """Test company activation/deactivation affects login"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        self.company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='employee',
            company=self.company
        )
    
    def test_user_can_login_when_company_active(self):
        """
        Test that user can login when their company is active
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'test@test.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_user_cannot_login_when_company_deactivated(self):
        """
        Test that user cannot login after their company is deactivated
        Validates: Requirement 2.6
        """
        # Deactivate the company
        self.company.is_active = False
        self.company.save()
        
        response = self.client.post('/api/auth/login/', {
            'email': 'test@test.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_company_reactivation_allows_login(self):
        """
        Test that user can login again after company is reactivated
        """
        # Deactivate company
        self.company.is_active = False
        self.company.save()
        
        # Try to login - should fail
        response = self.client.post('/api/auth/login/', {
            'email': 'test@test.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Reactivate company
        self.company.is_active = True
        self.company.save()
        
        # Try to login again - should succeed
        response = self.client.post('/api/auth/login/', {
            'email': 'test@test.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
