"""
Unit Tests for Company API

**Validates: Requirements 1.4, 1.5**

Tests CRUD operations, admin-only access restrictions, and active companies endpoint
for the CompanyViewSet.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company
from io import BytesIO
from PIL import Image
import tempfile

User = get_user_model()


class CompanyAPITest(TestCase):
    """
    Unit tests for Company API endpoints.
    
    Tests CRUD operations, role-based access control, and the active companies endpoint.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Clear any existing companies (including default from migration)
        Company.objects.all().delete()
        
        # Create test company
        self.company1 = Company.objects.create(
            name='Test Company 1',
            code='TEST1',
            is_active=True
        )
        
        self.company2 = Company.objects.create(
            name='Test Company 2',
            code='TEST2',
            is_active=True
        )
        
        self.inactive_company = Company.objects.create(
            name='Inactive Company',
            code='INACTIVE',
            is_active=False
        )
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company1
        )
        
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            first_name='HR',
            last_name='User',
            role='hr',
            company=self.company1
        )
        
        self.manager_user = User.objects.create_user(
            username='manager_test',
            email='manager@test.com',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=self.company1
        )
        
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            first_name='Employee',
            last_name='User',
            role='employee',
            company=self.company1
        )
        
        # Create API client
        self.client = APIClient()
    
    def _generate_test_image(self):
        """Helper method to generate a test image file"""
        file = BytesIO()
        image = Image.new('RGB', (100, 100), color='red')
        image.save(file, 'png')
        file.name = 'test.png'
        file.seek(0)
        return file
    
    # ========== CREATE Tests ==========
    
    def test_admin_can_create_company(self):
        """
        Test that admin users can create companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'New Company',
            'code': 'NEWCO',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Company')
        self.assertEqual(response.data['code'], 'NEWCO')
        self.assertTrue(response.data['is_active'])
        
        # Verify company was created in database
        self.assertTrue(Company.objects.filter(code='NEWCO').exists())
    
    def test_hr_cannot_create_company(self):
        """
        Test that HR users cannot create companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'name': 'HR Company',
            'code': 'HRCO',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Company.objects.filter(code='HRCO').exists())
    
    def test_manager_cannot_create_company(self):
        """
        Test that manager users cannot create companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.manager_user)
        
        data = {
            'name': 'Manager Company',
            'code': 'MGRCO',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Company.objects.filter(code='MGRCO').exists())
    
    def test_employee_cannot_create_company(self):
        """
        Test that employee users cannot create companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.employee_user)
        
        data = {
            'name': 'Employee Company',
            'code': 'EMPCO',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Company.objects.filter(code='EMPCO').exists())
    
    def test_unauthenticated_cannot_create_company(self):
        """
        Test that unauthenticated users cannot create companies.
        
        **Validates: Requirement 1.4**
        """
        data = {
            'name': 'Unauth Company',
            'code': 'UNAUTH',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Company.objects.filter(code='UNAUTH').exists())
    
    # ========== READ Tests ==========
    
    def test_admin_can_list_all_companies(self):
        """
        Test that admin users can list all companies (active and inactive).
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/auth/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if isinstance(response.data, dict) and 'results' in response.data:
            companies = response.data['results']
        else:
            companies = response.data
        
        # Should see all companies (2 active + 1 inactive from setUp)
        # Note: May include additional companies from migrations
        self.assertGreaterEqual(len(companies), 3)
        
        # Verify inactive company is included
        codes = [company['code'] for company in companies]
        self.assertIn('INACTIVE', codes)
    
    def test_hr_can_list_only_active_companies(self):
        """
        Test that HR users can only list active companies.
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get('/api/auth/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if isinstance(response.data, dict) and 'results' in response.data:
            companies = response.data['results']
        else:
            companies = response.data
        
        # Should see only active companies (at least 2 from setUp)
        self.assertGreaterEqual(len(companies), 2)
        
        # Verify inactive company is NOT included
        codes = [company['code'] for company in companies]
        self.assertNotIn('INACTIVE', codes)
    
    def test_manager_can_list_only_active_companies(self):
        """
        Test that manager users can only list active companies.
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.manager_user)
        
        response = self.client.get('/api/auth/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if isinstance(response.data, dict) and 'results' in response.data:
            companies = response.data['results']
        else:
            companies = response.data
        
        # Should see only active companies (at least 2 from setUp)
        self.assertGreaterEqual(len(companies), 2)
        
        # Verify inactive company is NOT included
        codes = [company['code'] for company in companies]
        self.assertNotIn('INACTIVE', codes)
    
    def test_employee_can_list_only_active_companies(self):
        """
        Test that employee users can only list active companies.
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.employee_user)
        
        response = self.client.get('/api/auth/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if isinstance(response.data, dict) and 'results' in response.data:
            companies = response.data['results']
        else:
            companies = response.data
        
        # Should see only active companies (at least 2 from setUp)
        self.assertGreaterEqual(len(companies), 2)
        
        # Verify inactive company is NOT included
        codes = [company['code'] for company in companies]
        self.assertNotIn('INACTIVE', codes)
    
    def test_admin_can_retrieve_any_company(self):
        """
        Test that admin users can retrieve any company (active or inactive).
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Retrieve active company
        response = self.client.get(f'/api/auth/companies/{self.company1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'TEST1')
        
        # Retrieve inactive company
        response = self.client.get(f'/api/auth/companies/{self.inactive_company.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'INACTIVE')
    
    def test_non_admin_can_retrieve_active_company(self):
        """
        Test that non-admin users can retrieve active companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get(f'/api/auth/companies/{self.company1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'TEST1')
    
    def test_non_admin_cannot_retrieve_inactive_company(self):
        """
        Test that non-admin users cannot retrieve inactive companies.
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.get(f'/api/auth/companies/{self.inactive_company.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    # ========== UPDATE Tests ==========
    
    def test_admin_can_update_company(self):
        """
        Test that admin users can update companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Updated Company Name',
            'code': 'TEST1',
            'is_active': True
        }
        
        response = self.client.put(
            f'/api/auth/companies/{self.company1.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Company Name')
        
        # Verify update in database
        self.company1.refresh_from_db()
        self.assertEqual(self.company1.name, 'Updated Company Name')
    
    def test_admin_can_partial_update_company(self):
        """
        Test that admin users can partially update companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {'is_active': False}
        
        response = self.client.patch(
            f'/api/auth/companies/{self.company1.id}/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        # Verify update in database
        self.company1.refresh_from_db()
        self.assertFalse(self.company1.is_active)
    
    def test_hr_cannot_update_company(self):
        """
        Test that HR users cannot update companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'name': 'HR Updated Name',
            'code': 'TEST1',
            'is_active': True
        }
        
        response = self.client.put(
            f'/api/auth/companies/{self.company1.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify no update in database
        self.company1.refresh_from_db()
        self.assertEqual(self.company1.name, 'Test Company 1')
    
    def test_manager_cannot_update_company(self):
        """
        Test that manager users cannot update companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.manager_user)
        
        data = {'is_active': False}
        
        response = self.client.patch(
            f'/api/auth/companies/{self.company1.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify no update in database
        self.company1.refresh_from_db()
        self.assertTrue(self.company1.is_active)
    
    def test_employee_cannot_update_company(self):
        """
        Test that employee users cannot update companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.employee_user)
        
        data = {'is_active': False}
        
        response = self.client.patch(
            f'/api/auth/companies/{self.company1.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify no update in database
        self.company1.refresh_from_db()
        self.assertTrue(self.company1.is_active)
    
    # ========== DELETE Tests ==========
    
    def test_admin_can_delete_company(self):
        """
        Test that admin users can delete companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Create a company to delete
        company_to_delete = Company.objects.create(
            name='Delete Me',
            code='DELETE',
            is_active=True
        )
        
        response = self.client.delete(f'/api/auth/companies/{company_to_delete.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify deletion in database
        self.assertFalse(Company.objects.filter(id=company_to_delete.id).exists())
    
    def test_hr_cannot_delete_company(self):
        """
        Test that HR users cannot delete companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/auth/companies/{self.company2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=self.company2.id).exists())
    
    def test_manager_cannot_delete_company(self):
        """
        Test that manager users cannot delete companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.manager_user)
        
        response = self.client.delete(f'/api/auth/companies/{self.company2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=self.company2.id).exists())
    
    def test_employee_cannot_delete_company(self):
        """
        Test that employee users cannot delete companies.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.employee_user)
        
        response = self.client.delete(f'/api/auth/companies/{self.company2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=self.company2.id).exists())
    
    # ========== Active Companies Endpoint Tests ==========
    
    def test_active_endpoint_returns_only_active_companies(self):
        """
        Test that the /active/ endpoint returns only active companies.
        
        **Validates: Requirement 1.5**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/auth/companies/active/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see only 2 active companies
        self.assertEqual(len(response.data), 2)
        
        # Verify all returned companies are active
        for company in response.data:
            self.assertNotEqual(company['code'], 'INACTIVE')
    
    def test_active_endpoint_accessible_by_all_authenticated_users(self):
        """
        Test that all authenticated users can access the /active/ endpoint.
        
        **Validates: Requirement 1.5**
        """
        for user in [self.admin_user, self.hr_user, self.manager_user, self.employee_user]:
            self.client.force_authenticate(user=user)
            
            response = self.client.get('/api/auth/companies/active/')
            
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"{user.role} should be able to access /active/ endpoint"
            )
            self.assertEqual(len(response.data), 2)
    
    def test_active_endpoint_not_accessible_by_unauthenticated(self):
        """
        Test that unauthenticated users cannot access the /active/ endpoint.
        
        **Validates: Requirement 1.5**
        """
        response = self.client.get('/api/auth/companies/active/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    # ========== Response Structure Tests ==========
    
    def test_company_list_response_structure(self):
        """
        Test that company list responses have the correct structure.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/auth/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle both paginated and non-paginated responses
        if isinstance(response.data, dict) and 'results' in response.data:
            companies = response.data['results']
        else:
            companies = response.data
        
        self.assertGreater(len(companies), 0, "Should have at least one company")
        
        # Check first company has expected fields (lightweight serializer)
        company = companies[0]
        self.assertIn('id', company)
        self.assertIn('name', company)
        self.assertIn('code', company)
        self.assertIn('logo_url', company)
        
        # Should NOT have timestamps in list view
        self.assertNotIn('created_at', company)
        self.assertNotIn('updated_at', company)
    
    def test_company_detail_response_structure(self):
        """
        Test that company detail responses have the correct structure.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(f'/api/auth/companies/{self.company1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response has all expected fields (full serializer)
        self.assertIn('id', response.data)
        self.assertIn('name', response.data)
        self.assertIn('code', response.data)
        self.assertIn('logo', response.data)
        self.assertIn('logo_url', response.data)
        self.assertIn('is_active', response.data)
        self.assertIn('created_at', response.data)
        self.assertIn('updated_at', response.data)
    
    # ========== Edge Cases ==========
    
    def test_create_company_with_duplicate_name(self):
        """
        Test that creating a company with duplicate name fails.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Test Company 1',  # Duplicate name
            'code': 'UNIQUE',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_create_company_with_duplicate_code(self):
        """
        Test that creating a company with duplicate code fails.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Unique Company',
            'code': 'TEST1',  # Duplicate code
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
    
    def test_company_code_is_uppercased(self):
        """
        Test that company codes are automatically uppercased.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Lowercase Code Company',
            'code': 'lowercase',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'LOWERCASE')
    
    def test_company_code_spaces_replaced_with_underscores(self):
        """
        Test that spaces in company codes are replaced with underscores.
        
        **Validates: Requirement 1.4**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Spaced Code Company',
            'code': 'SPACE CODE',
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'SPACE_CODE')
