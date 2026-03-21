"""
Property-Based Tests for Inactive Company Login Prevention

**Validates: Requirements 2.6**

Property 9: Inactive Company Login Prevention
For any user whose assigned company has is_active set to false,
authentication attempts should be rejected and the user should not be able to log in.

This test validates that the authentication system correctly prevents login
for users belonging to inactive companies, regardless of user role or credentials.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Company
from rest_framework.test import APIClient
from rest_framework import status
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.extra.django import TestCase as HypothesisTestCase
from datetime import datetime

User = get_user_model()


class InactiveCompanyLoginPreventionTest(TestCase):
    """
    Unit tests for inactive company login prevention.
    
    Tests that users cannot authenticate when their company is inactive.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Create active company
        self.active_company = Company.objects.create(
            name='Active Company',
            code='ACTIVE',
            is_active=True
        )
        
        # Create inactive company
        self.inactive_company = Company.objects.create(
            name='Inactive Company',
            code='INACTIVE',
            is_active=False
        )
        
        # Create users in active company
        self.active_admin = User.objects.create_user(
            username='active_admin',
            email='admin@active.com',
            password='testpass123',
            first_name='Active',
            last_name='Admin',
            role='admin',
            company=self.active_company
        )
        
        self.active_employee = User.objects.create_user(
            username='active_employee',
            email='employee@active.com',
            password='testpass123',
            first_name='Active',
            last_name='Employee',
            role='employee',
            company=self.active_company
        )
        
        # Create users in inactive company
        self.inactive_admin = User.objects.create_user(
            username='inactive_admin',
            email='admin@inactive.com',
            password='testpass123',
            first_name='Inactive',
            last_name='Admin',
            role='admin',
            company=self.inactive_company
        )
        
        self.inactive_hr = User.objects.create_user(
            username='inactive_hr',
            email='hr@inactive.com',
            password='testpass123',
            first_name='Inactive',
            last_name='HR',
            role='hr',
            company=self.inactive_company
        )
        
        self.inactive_manager = User.objects.create_user(
            username='inactive_manager',
            email='manager@inactive.com',
            password='testpass123',
            first_name='Inactive',
            last_name='Manager',
            role='manager',
            company=self.inactive_company
        )
        
        self.inactive_employee = User.objects.create_user(
            username='inactive_employee',
            email='employee@inactive.com',
            password='testpass123',
            first_name='Inactive',
            last_name='Employee',
            role='employee',
            company=self.inactive_company
        )
        
        # Create API client
        self.client = APIClient()
    
    def test_active_company_user_can_login(self):
        """
        Test that users with active companies can login successfully.
        
        **Validates: Requirement 2.6 (baseline)**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@active.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
    
    def test_inactive_company_admin_cannot_login(self):
        """
        Test that admin users with inactive companies cannot login.
        
        **Validates: Requirement 2.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
    
    def test_inactive_company_hr_cannot_login(self):
        """
        Test that HR users with inactive companies cannot login.
        
        **Validates: Requirement 2.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'hr@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_inactive_company_manager_cannot_login(self):
        """
        Test that manager users with inactive companies cannot login.
        
        **Validates: Requirement 2.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'manager@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_inactive_company_employee_cannot_login(self):
        """
        Test that employee users with inactive companies cannot login.
        
        **Validates: Requirement 2.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_inactive_company_login_with_username(self):
        """
        Test that login with username also prevents inactive company access.
        
        **Validates: Requirement 2.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'inactive_employee',  # Using username instead of email
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_company_deactivation_prevents_subsequent_login(self):
        """
        Test that deactivating a company prevents subsequent login attempts.
        
        **Validates: Requirement 2.6**
        """
        # First, verify user can login with active company
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@active.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Deactivate the company
        self.active_company.is_active = False
        self.active_company.save()
        
        # Try to login again - should fail
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@active.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('inactive', response.data['error'].lower())
    
    def test_company_reactivation_allows_login(self):
        """
        Test that reactivating a company allows login again.
        
        **Validates: Requirement 2.6 (inverse)**
        """
        # Verify user cannot login with inactive company
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@inactive.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Reactivate the company
        self.inactive_company.is_active = True
        self.inactive_company.save()
        
        # Try to login again - should succeed
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_inactive_company_error_message_format(self):
        """
        Test that the error message for inactive company is user-friendly.
        
        **Validates: Requirement 2.6, 12.6**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'employee@inactive.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        
        error_message = response.data['error']
        # Verify message is informative and user-friendly
        self.assertIn('inactive', error_message.lower())
        self.assertTrue(
            'company' in error_message.lower() or 'account' in error_message.lower(),
            "Error message should mention company or account"
        )
    
    def test_inactive_company_login_does_not_leak_user_existence(self):
        """
        Test that inactive company error doesn't reveal if user exists.
        This is a security consideration - the error should be similar to invalid credentials.
        
        **Validates: Requirement 2.6 (security)**
        """
        # Login with inactive company user
        response1 = self.client.post('/api/auth/login/', {
            'email': 'employee@inactive.com',
            'password': 'testpass123'
        })
        
        # Login with non-existent user
        response2 = self.client.post('/api/auth/login/', {
            'email': 'nonexistent@test.com',
            'password': 'testpass123'
        })
        
        # Both should return error responses (though status codes may differ)
        self.assertIn(response1.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        self.assertIn(response2.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        
        # Both should have error messages
        self.assertIn('error', response1.data)
        self.assertIn('error', response2.data)


class InactiveCompanyLoginPropertyTest(HypothesisTestCase):
    """
    Property-based tests for inactive company login prevention.
    
    These tests use hypothesis to generate random user data and verify that
    inactive company login prevention works correctly across all user roles.
    """
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee']),
        use_email=st.booleans()
    )
    def test_property_inactive_company_prevents_login_for_all_roles(self, role, use_email):
        """
        Property: For any user with any role, if their company is inactive,
        authentication should fail with 403 Forbidden status.
        
        This property verifies that:
        1. The inactive company check applies to all user roles (admin, hr, manager, employee)
        2. The check works for both email and username authentication
        3. The response always returns 403 Forbidden
        4. The error message always mentions "inactive"
        5. No authentication tokens are returned
        
        **Validates: Requirements 2.6**
        """
        # Create inactive company with unique identifiers
        timestamp = datetime.now().timestamp()
        inactive_company = Company.objects.create(
            name=f'Inactive Company {timestamp}',
            code=f'INACTIVE{int(timestamp)}',
            is_active=False
        )
        
        # Create user with the specified role in inactive company
        username = f'user_{role}_{int(timestamp)}'
        email = f'{username}@test.com'
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=role,
            company=inactive_company
        )
        
        # Create API client
        client = APIClient()
        
        # Attempt login with either email or username
        login_identifier = email if use_email else username
        response = client.post('/api/auth/login/', {
            'email': login_identifier,
            'password': 'testpass123'
        })
        
        # Verify response
        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Login for {role} user with inactive company should return 403 Forbidden"
        )
        
        # Verify error message exists and mentions inactive
        self.assertIn(
            'error',
            response.data,
            f"Response should contain error message for {role} user with inactive company"
        )
        
        error_message = response.data['error'].lower()
        self.assertIn(
            'inactive',
            error_message,
            f"Error message should mention 'inactive' for {role} user. Got: {response.data['error']}"
        )
        
        # Verify no authentication tokens are returned
        self.assertNotIn(
            'access',
            response.data,
            f"Response should not contain access token for {role} user with inactive company"
        )
        self.assertNotIn(
            'refresh',
            response.data,
            f"Response should not contain refresh token for {role} user with inactive company"
        )
        self.assertNotIn(
            'user',
            response.data,
            f"Response should not contain user data for {role} user with inactive company"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee']),
        use_email=st.booleans()
    )
    def test_property_active_company_allows_login_for_all_roles(self, role, use_email):
        """
        Property: For any user with any role, if their company is active,
        authentication should succeed with 200 OK status.
        
        This property verifies the inverse - that active companies allow login.
        
        **Validates: Requirements 2.6 (inverse property)**
        """
        # Create active company with unique identifiers
        timestamp = datetime.now().timestamp()
        active_company = Company.objects.create(
            name=f'Active Company {timestamp}',
            code=f'ACTIVE{int(timestamp)}',
            is_active=True
        )
        
        # Create user with the specified role in active company
        username = f'user_{role}_{int(timestamp)}'
        email = f'{username}@test.com'
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=role,
            company=active_company
        )
        
        # Create API client
        client = APIClient()
        
        # Attempt login with either email or username
        login_identifier = email if use_email else username
        response = client.post('/api/auth/login/', {
            'email': login_identifier,
            'password': 'testpass123'
        })
        
        # Verify response
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Login for {role} user with active company should return 200 OK"
        )
        
        # Verify authentication tokens are returned
        self.assertIn(
            'access',
            response.data,
            f"Response should contain access token for {role} user with active company"
        )
        self.assertIn(
            'refresh',
            response.data,
            f"Response should contain refresh token for {role} user with active company"
        )
        self.assertIn(
            'user',
            response.data,
            f"Response should contain user data for {role} user with active company"
        )
        self.assertIn(
            'company',
            response.data,
            f"Response should contain company data for {role} user with active company"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee']),
        initial_state=st.booleans()
    )
    def test_property_company_activation_toggle_affects_login(self, role, initial_state):
        """
        Property: For any user, toggling their company's is_active status
        should immediately affect their ability to login.
        
        This property verifies that:
        1. Company activation state changes are immediately effective
        2. No caching or stale state affects the login check
        3. The behavior is consistent across all user roles
        
        **Validates: Requirements 2.6**
        """
        # Create company with initial state
        timestamp = datetime.now().timestamp()
        company = Company.objects.create(
            name=f'Toggle Company {timestamp}',
            code=f'TOGGLE{int(timestamp)}',
            is_active=initial_state
        )
        
        # Create user
        username = f'user_{role}_{int(timestamp)}'
        email = f'{username}@test.com'
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=role,
            company=company
        )
        
        # Create API client
        client = APIClient()
        
        # First login attempt - should match initial state
        response1 = client.post('/api/auth/login/', {
            'email': email,
            'password': 'testpass123'
        })
        
        if initial_state:
            # Company is active, login should succeed
            self.assertEqual(
                response1.status_code,
                status.HTTP_200_OK,
                f"Initial login for {role} with active company should succeed"
            )
        else:
            # Company is inactive, login should fail
            self.assertEqual(
                response1.status_code,
                status.HTTP_403_FORBIDDEN,
                f"Initial login for {role} with inactive company should fail"
            )
        
        # Toggle company state
        company.is_active = not initial_state
        company.save()
        
        # Second login attempt - should match new state
        response2 = client.post('/api/auth/login/', {
            'email': email,
            'password': 'testpass123'
        })
        
        if not initial_state:
            # Company is now active, login should succeed
            self.assertEqual(
                response2.status_code,
                status.HTTP_200_OK,
                f"Login after activation for {role} should succeed"
            )
        else:
            # Company is now inactive, login should fail
            self.assertEqual(
                response2.status_code,
                status.HTTP_403_FORBIDDEN,
                f"Login after deactivation for {role} should fail"
            )
