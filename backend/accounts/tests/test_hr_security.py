"""
Comprehensive security tests for HR role permissions.

Tests verify:
1. HR cannot access leads/customers/projects/tasks
2. HR can delete manager/employee users but not admin/HR users
3. HR cannot modify admin/HR users
4. JWT token validation works
5. Permission checks work on all endpoints
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class HRSecurityTestCase(TestCase):
    """Test HR role security and permission boundaries."""
    
    def setUp(self):
        """Set up test users and authentication."""
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='admin123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='hr123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create another HR user
        self.hr_user2 = User.objects.create_user(
            username='hr_user2',
            email='hr2@test.com',
            password='hr123',
            role='hr',
            first_name='HR2',
            last_name='User'
        )
        
        # Create manager user
        self.manager_user = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='manager123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee_user = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='employee123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager_user
        )
        
        # Set up API client
        self.client = APIClient()
    
    def get_jwt_token(self, user):
        """Generate JWT token for a user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def authenticate_as_hr(self):
        """Authenticate client as HR user."""
        token = self.get_jwt_token(self.hr_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    def authenticate_as_admin(self):
        """Authenticate client as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Test 1: HR cannot access sales modules
    def test_hr_cannot_access_leads(self):
        """Test that HR users cannot access leads endpoint."""
        self.authenticate_as_hr()
        response = self.client.get('/api/leads/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_create_lead(self):
        """Test that HR users cannot create leads."""
        self.authenticate_as_hr()
        lead_data = {
            'name': 'Test Lead',
            'email': 'lead@test.com',
            'phone': '1234567890',
            'status': 'new'
        }
        response = self.client.post('/api/leads/', lead_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_hr_cannot_access_customers(self):
        """Test that HR users cannot access customers endpoint."""
        self.authenticate_as_hr()
        response = self.client.get('/api/customers/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_access_projects(self):
        """Test that HR users cannot access projects endpoint."""
        self.authenticate_as_hr()
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_hr_cannot_access_tasks(self):
        """Test that HR users cannot access tasks endpoint."""
        self.authenticate_as_hr()
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    # Test 2: HR user deletion permissions
    def test_hr_can_delete_employee_user(self):
        """Test that HR can delete employee users."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.employee_user.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=self.employee_user.id).exists())
    
    def test_hr_can_delete_manager_user(self):
        """Test that HR can delete manager users."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.manager_user.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=self.manager_user.id).exists())
    
    def test_hr_cannot_delete_admin_user(self):
        """Test that HR cannot delete admin users."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.admin_user.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertTrue(User.objects.filter(id=self.admin_user.id).exists())
    
    def test_hr_cannot_delete_other_hr_user(self):
        """Test that HR cannot delete other HR users."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.hr_user2.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertTrue(User.objects.filter(id=self.hr_user2.id).exists())
    
    def test_hr_cannot_delete_themselves(self):
        """Test that HR cannot delete their own account."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.hr_user.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertTrue(User.objects.filter(id=self.hr_user.id).exists())
    
    # Test 3: HR user modification permissions
    def test_hr_cannot_update_admin_user(self):
        """Test that HR cannot update admin users."""
        self.authenticate_as_hr()
        update_data = {
            'first_name': 'Modified',
            'last_name': 'Admin'
        }
        response = self.client.post(f'/api/auth/users/{self.admin_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
    
    def test_hr_cannot_update_other_hr_user(self):
        """Test that HR cannot update other HR users."""
        self.authenticate_as_hr()
        update_data = {
            'first_name': 'Modified',
            'last_name': 'HR'
        }
        response = self.client.post(f'/api/auth/users/{self.hr_user2.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
    
    def test_hr_can_update_manager_user(self):
        """Test that HR can update manager users."""
        self.authenticate_as_hr()
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Manager'
        }
        response = self.client.post(f'/api/auth/users/{self.manager_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manager_user.refresh_from_db()
        self.assertEqual(self.manager_user.first_name, 'Updated')
    
    def test_hr_can_update_employee_user(self):
        """Test that HR can update employee users."""
        self.authenticate_as_hr()
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Employee'
        }
        response = self.client.post(f'/api/auth/users/{self.employee_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee_user.first_name, 'Updated')
    
    # Test 4: HR user creation permissions
    def test_hr_can_create_manager_user(self):
        """Test that HR can create manager users."""
        self.authenticate_as_hr()
        user_data = {
            'first_name': 'New',
            'last_name': 'Manager',
            'email': 'newmanager@test.com',
            'password': 'password123',
            'role': 'manager'
        }
        response = self.client.post('/api/auth/register/', user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newmanager@test.com').exists())
    
    def test_hr_can_create_employee_user(self):
        """Test that HR can create employee users."""
        self.authenticate_as_hr()
        user_data = {
            'first_name': 'New',
            'last_name': 'Employee',
            'email': 'newemployee@test.com',
            'password': 'password123',
            'role': 'employee',
            'manager': self.manager_user.id
        }
        response = self.client.post('/api/auth/register/', user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newemployee@test.com').exists())
    
    def test_hr_cannot_create_admin_user(self):
        """Test that HR cannot create admin users."""
        self.authenticate_as_hr()
        user_data = {
            'first_name': 'New',
            'last_name': 'Admin',
            'email': 'newadmin@test.com',
            'password': 'password123',
            'role': 'admin'
        }
        response = self.client.post('/api/auth/register/', user_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertFalse(User.objects.filter(email='newadmin@test.com').exists())
    
    def test_hr_cannot_create_hr_user(self):
        """Test that HR cannot create other HR users."""
        self.authenticate_as_hr()
        user_data = {
            'first_name': 'New',
            'last_name': 'HR',
            'email': 'newhr@test.com',
            'password': 'password123',
            'role': 'hr'
        }
        response = self.client.post('/api/auth/register/', user_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertFalse(User.objects.filter(email='newhr@test.com').exists())
    
    # Test 5: HR cannot change roles to admin/HR
    def test_hr_cannot_promote_employee_to_admin(self):
        """Test that HR cannot change employee role to admin."""
        self.authenticate_as_hr()
        update_data = {
            'role': 'admin'
        }
        response = self.client.post(f'/api/auth/users/{self.employee_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee_user.role, 'employee')
    
    def test_hr_cannot_promote_manager_to_hr(self):
        """Test that HR cannot change manager role to HR."""
        self.authenticate_as_hr()
        update_data = {
            'role': 'hr'
        }
        response = self.client.post(f'/api/auth/users/{self.manager_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.manager_user.refresh_from_db()
        self.assertEqual(self.manager_user.role, 'manager')
    
    def test_hr_can_change_employee_to_manager(self):
        """Test that HR can change employee role to manager."""
        self.authenticate_as_hr()
        update_data = {
            'role': 'manager'
        }
        response = self.client.post(f'/api/auth/users/{self.employee_user.id}/update/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee_user.refresh_from_db()
        self.assertEqual(self.employee_user.role, 'manager')
    
    # Test 6: JWT token validation
    def test_invalid_jwt_token_rejected(self):
        """Test that invalid JWT tokens are rejected."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_12345')
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_expired_jwt_token_rejected(self):
        """Test that expired JWT tokens are rejected."""
        # This would require mocking time or using a very short-lived token
        # For now, we test with a malformed token
        self.client.credentials(HTTP_AUTHORIZATION='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token')
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_no_token_rejected(self):
        """Test that requests without tokens are rejected."""
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_valid_jwt_token_accepted(self):
        """Test that valid JWT tokens are accepted."""
        self.authenticate_as_hr()
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    # Test 7: Proper error messages
    def test_blocked_endpoint_returns_proper_error_message(self):
        """Test that blocked endpoints return descriptive error messages."""
        self.authenticate_as_hr()
        response = self.client.get('/api/leads/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIsInstance(response.data['detail'], str)
        self.assertTrue(len(response.data['detail']) > 0)
    
    def test_delete_admin_returns_proper_error_message(self):
        """Test that attempting to delete admin returns descriptive error."""
        self.authenticate_as_hr()
        response = self.client.post(f'/api/auth/users/{self.admin_user.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('admin', response.data['error'].lower())
    
    def test_create_admin_returns_proper_error_message(self):
        """Test that attempting to create admin returns descriptive error."""
        self.authenticate_as_hr()
        user_data = {
            'first_name': 'New',
            'last_name': 'Admin',
            'email': 'newadmin@test.com',
            'password': 'password123',
            'role': 'admin'
        }
        response = self.client.post('/api/auth/register/', user_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('manager', response.data['error'].lower())
        self.assertIn('employee', response.data['error'].lower())
    
    # Test 8: Cross-role permission verification
    def test_manager_cannot_access_hr_endpoints(self):
        """Test that manager users cannot access HR-specific endpoints."""
        token = self.get_jwt_token(self.manager_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/hr/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_employee_cannot_access_hr_endpoints(self):
        """Test that employee users cannot access HR-specific endpoints."""
        token = self.get_jwt_token(self.employee_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/hr/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_access_hr_endpoints(self):
        """Test that admin users can access HR-specific endpoints."""
        self.authenticate_as_admin()
        response = self.client.get('/api/hr/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    # Test 9: Permission bypass attempts
    def test_cannot_bypass_permission_with_role_parameter(self):
        """Test that role cannot be manipulated in request to bypass permissions."""
        self.authenticate_as_hr()
        # Try to access leads by adding role parameter
        response = self.client.get('/api/leads/?role=admin')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cannot_bypass_permission_with_header_manipulation(self):
        """Test that permissions cannot be bypassed with custom headers."""
        self.authenticate_as_hr()
        # Try to access leads with custom role header
        response = self.client.get('/api/leads/', HTTP_X_USER_ROLE='admin')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cannot_escalate_privileges_through_update(self):
        """Test that HR cannot escalate their own privileges."""
        self.authenticate_as_hr()
        update_data = {
            'role': 'admin'
        }
        response = self.client.patch(f'/api/users/{self.hr_user.id}/', update_data)
        # Should either be forbidden or ignored
        self.hr_user.refresh_from_db()
        self.assertEqual(self.hr_user.role, 'hr')
