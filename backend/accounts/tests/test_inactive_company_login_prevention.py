"""
Property-Based Test: Inactive Company Login Prevention (Property 9)

This test validates Requirement 2.6:
- Users with inactive companies cannot authenticate

Property Statement:
∀ user ∈ Users, company ∈ Companies:
  company.is_active = False ∧ user.company = company
  ⟹ authenticate(user) = FORBIDDEN

This property ensures that the system enforces company activation status
during authentication, preventing access when a company is deactivated.
"""
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company

User = get_user_model()


# Strategy for generating valid user roles
user_roles = st.sampled_from(['admin', 'hr', 'manager', 'employee'])

# Strategy for generating valid email addresses
emails = st.emails()

# Strategy for generating valid usernames
usernames = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd'), whitelist_characters='_'),
    min_size=3,
    max_size=20
).filter(lambda x: x[0].isalpha())

# Strategy for generating valid names
names = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu')),
    min_size=2,
    max_size=30
)

# Strategy for generating valid company codes
company_codes = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Nd'), whitelist_characters='_'),
    min_size=2,
    max_size=20
)

# Strategy for generating valid company names
company_names = st.text(
    alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd'), whitelist_characters=' '),
    min_size=3,
    max_size=50
).filter(lambda x: x.strip() != '')


class InactiveCompanyLoginPreventionPropertyTest(TestCase):
    """
    Property 9: Inactive Company Login Prevention
    
    Tests the universal property that users belonging to inactive companies
    cannot authenticate, regardless of their role or credentials.
    """
    
    @given(
        role=user_roles,
        username=usernames,
        email=emails,
        first_name=names,
        last_name=names,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples for fast execution
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_inactive_company_prevents_login(
        self,
        role,
        username,
        email,
        first_name,
        last_name,
        company_name,
        company_code
    ):
        """
        Property: Users with inactive companies cannot authenticate
        
        For any user with any role, if their company is inactive,
        authentication must fail with 403 FORBIDDEN.
        
        Validates: Requirement 2.6
        """
        # Create inactive company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=False  # INACTIVE
        )
        
        # Create user in inactive company
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            company=company
        )
        
        # Attempt to authenticate
        client = APIClient()
        response = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        # Property assertion: Login must be rejected
        assert response.status_code == status.HTTP_403_FORBIDDEN, (
            f"Expected 403 FORBIDDEN for user in inactive company, "
            f"got {response.status_code}. "
            f"User: {username}, Role: {role}, Company: {company_name} (inactive)"
        )
        
        # Verify error message mentions inactive company
        assert 'error' in response.data, (
            "Response should contain 'error' field"
        )
        assert 'inactive' in response.data['error'].lower(), (
            f"Error message should mention 'inactive', got: {response.data['error']}"
        )
        
        # Verify no authentication tokens are provided
        assert 'access' not in response.data, (
            "No access token should be provided for inactive company user"
        )
        assert 'refresh' not in response.data, (
            "No refresh token should be provided for inactive company user"
        )
    
    @given(
        role=user_roles,
        username=usernames,
        email=emails,
        first_name=names,
        last_name=names,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_active_company_allows_login(
        self,
        role,
        username,
        email,
        first_name,
        last_name,
        company_name,
        company_code
    ):
        """
        Property: Users with active companies can authenticate
        
        This is the inverse property - for any user with any role,
        if their company is active, authentication must succeed.
        
        Validates: Requirement 2.6 (inverse case)
        """
        # Create active company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=True  # ACTIVE
        )
        
        # Create user in active company
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            company=company
        )
        
        # Attempt to authenticate
        client = APIClient()
        response = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        # Property assertion: Login must succeed
        assert response.status_code == status.HTTP_200_OK, (
            f"Expected 200 OK for user in active company, "
            f"got {response.status_code}. "
            f"User: {username}, Role: {role}, Company: {company_name} (active)"
        )
        
        # Verify authentication tokens are provided
        assert 'access' in response.data, (
            "Access token should be provided for active company user"
        )
        assert 'refresh' in response.data, (
            "Refresh token should be provided for active company user"
        )
        
        # Verify company information is included
        assert 'company' in response.data, (
            "Company information should be included in response"
        )
        assert response.data['company']['id'] == company.id, (
            "Company ID should match user's company"
        )
    
    @given(
        role=user_roles,
        username=usernames,
        email=emails,
        first_name=names,
        last_name=names,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples for state transition test
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_company_deactivation_prevents_subsequent_login(
        self,
        role,
        username,
        email,
        first_name,
        last_name,
        company_name,
        company_code
    ):
        """
        Property: Company deactivation prevents subsequent logins
        
        For any user, if they can login initially (company active),
        then company is deactivated, subsequent login attempts must fail.
        
        This tests the state transition property:
        active → inactive ⟹ login_allowed → login_denied
        
        Validates: Requirement 2.6 (state transition)
        """
        # Create active company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=True
        )
        
        # Create user
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            company=company
        )
        
        client = APIClient()
        
        # First login - should succeed
        response1 = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        assert response1.status_code == status.HTTP_200_OK, (
            f"Initial login should succeed for active company"
        )
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Second login attempt - should fail
        response2 = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        assert response2.status_code == status.HTTP_403_FORBIDDEN, (
            f"Login should fail after company deactivation. "
            f"User: {username}, Role: {role}, Company: {company_name}"
        )
        
        assert 'error' in response2.data, (
            "Response should contain error message"
        )
        assert 'inactive' in response2.data['error'].lower(), (
            "Error should mention inactive company"
        )
    
    @given(
        role=user_roles,
        username=usernames,
        email=emails,
        first_name=names,
        last_name=names,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples for reactivation test
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_company_reactivation_allows_login(
        self,
        role,
        username,
        email,
        first_name,
        last_name,
        company_name,
        company_code
    ):
        """
        Property: Company reactivation allows login again
        
        For any user in an inactive company, if the company is reactivated,
        the user should be able to login again.
        
        This tests the reversibility property:
        inactive → active ⟹ login_denied → login_allowed
        
        Validates: Requirement 2.6 (reversibility)
        """
        # Create inactive company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=False
        )
        
        # Create user
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            company=company
        )
        
        client = APIClient()
        
        # First login attempt - should fail
        response1 = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        assert response1.status_code == status.HTTP_403_FORBIDDEN, (
            f"Login should fail for inactive company"
        )
        
        # Reactivate company
        company.is_active = True
        company.save()
        
        # Second login attempt - should succeed
        response2 = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        assert response2.status_code == status.HTTP_200_OK, (
            f"Login should succeed after company reactivation. "
            f"User: {username}, Role: {role}, Company: {company_name}"
        )
        
        assert 'access' in response2.data, (
            "Access token should be provided after reactivation"
        )
        assert 'company' in response2.data, (
            "Company information should be included"
        )


class InactiveCompanyLoginEdgeCasesPropertyTest(TestCase):
    """
    Edge cases for inactive company login prevention
    """
    
    @given(
        username=usernames,
        email=emails,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples for edge case tests
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_username_login_also_checks_company_status(
        self,
        username,
        email,
        company_name,
        company_code
    ):
        """
        Property: Company status check applies to username-based login
        
        Users can login with either email or username. The company
        activation check must apply to both authentication methods.
        
        Validates: Requirement 2.6 (authentication method independence)
        """
        # Create inactive company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=False
        )
        
        # Create user
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Test',
            last_name='User',
            role='employee',
            company=company
        )
        
        client = APIClient()
        
        # Try login with username
        response = client.post('/api/auth/login/', {
            'email': username,  # API accepts username in email field
            'password': password
        })
        
        # Property assertion: Login must be rejected regardless of auth method
        assert response.status_code == status.HTTP_403_FORBIDDEN, (
            f"Username-based login should also check company status. "
            f"Username: {username}, Company: {company_name} (inactive)"
        )
        
        assert 'inactive' in response.data.get('error', '').lower(), (
            "Error should mention inactive company"
        )
    
    @given(
        role=st.sampled_from(['admin', 'hr']),  # Cross-company roles
        username=usernames,
        email=emails,
        company_name=company_names,
        company_code=company_codes
    )
    @settings(
        max_examples=2,  # Minimal examples for role-specific test
        deadline=5000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_admin_hr_also_blocked_by_inactive_company(
        self,
        role,
        username,
        email,
        company_name,
        company_code
    ):
        """
        Property: Even admin/hr users are blocked by inactive company
        
        Admin and HR users have cross-company access, but they still
        belong to a company. If their company is inactive, they should
        also be blocked from logging in.
        
        Validates: Requirement 2.6 (applies to all roles)
        """
        # Create inactive company
        company = Company.objects.create(
            name=company_name,
            code=company_code,
            is_active=False
        )
        
        # Create admin/hr user in inactive company
        password = 'TestPass123!'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Admin',
            last_name='User',
            role=role,
            company=company
        )
        
        client = APIClient()
        response = client.post('/api/auth/login/', {
            'email': email,
            'password': password
        })
        
        # Property assertion: Even privileged roles are blocked
        assert response.status_code == status.HTTP_403_FORBIDDEN, (
            f"Even {role} users should be blocked by inactive company. "
            f"User: {username}, Role: {role}, Company: {company_name}"
        )
        
        assert 'inactive' in response.data.get('error', '').lower(), (
            "Error should mention inactive company"
        )
