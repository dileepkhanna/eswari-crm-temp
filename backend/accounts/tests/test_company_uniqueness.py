"""
Property-Based Tests for Company Uniqueness

**Property 1: Company Uniqueness and Creation**
**Validates: Requirements 1.1, 1.2, 1.3, 12.4**

Tests that duplicate names/codes are rejected with proper error messages using
property-based testing with Hypothesis.
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase, TransactionTestCase as HypothesisTransactionTestCase
import string

User = get_user_model()


# Custom strategies for generating company data
@st.composite
def company_name_strategy(draw):
    """Generate valid company names"""
    # Generate names between 3 and 100 characters
    # Use printable characters excluding control characters
    name = draw(st.text(
        alphabet=string.ascii_letters + string.digits + ' .-&',
        min_size=3,
        max_size=100
    ))
    # Ensure name is not just whitespace
    assume(name.strip())
    return name.strip()


@st.composite
def company_code_strategy(draw):
    """Generate valid company codes"""
    # Generate codes between 2 and 20 characters
    # Use uppercase letters, digits, and underscores
    code = draw(st.text(
        alphabet=string.ascii_uppercase + string.digits + '_',
        min_size=2,
        max_size=20
    ))
    # Ensure code is not just underscores
    assume(any(c.isalnum() for c in code))
    return code


class CompanyUniquenessPropertyTest(HypothesisTransactionTestCase):
    """
    Property-based tests for company uniqueness constraints.
    
    Tests universal properties that should hold for all possible inputs:
    - Duplicate names are always rejected
    - Duplicate codes are always rejected
    - Error messages are descriptive
    - Uniqueness is case-insensitive for practical purposes
    """
    
    def setUp(self):
        """Set up test environment"""
        # Delete users first, then companies (due to PROTECT constraint)
        User.objects.all().delete()
        Company.objects.all().delete()
        
        # Create a test company for the admin user FIRST
        self.test_company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        # Create admin user for API tests with company assigned
        self.admin_user = User.objects.create_user(
            username='admin_prop_test',
            email='admin@proptest.com',
            first_name='Admin',
            last_name='PropTest',
            role='admin',
            company=self.test_company
        )
        
        # Create API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)
    
    def tearDown(self):
        """Clean up after each test"""
        # Delete users first, then companies
        User.objects.exclude(id=self.admin_user.id).delete()
        Company.objects.exclude(id=self.test_company.id).delete()
    
    def _ensure_authenticated(self):
        """Ensure client is authenticated - call at start of each property test"""
        # Hypothesis may reset the client between examples, so always re-authenticate
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)
    
    @given(
        name1=company_name_strategy(),
        name2=company_name_strategy(),
        code1=company_code_strategy(),
        code2=company_code_strategy()
    )
    @settings(max_examples=5, deadline=3000)
    def test_property_duplicate_names_rejected(self, name1, name2, code1, code2):
        """
        Property: Creating two companies with the same name should always fail.
        
        **Validates: Requirements 1.1, 1.2, 12.4**
        
        For all possible company names:
        - First company with unique name should succeed
        - Second company with duplicate name should fail with 400
        - Error message should mention 'name'
        """
        # Re-authenticate for this example (Hypothesis may reset client)
        self._ensure_authenticated()
        
        # Ensure codes are different to isolate name uniqueness test
        assume(code1 != code2)
        # Ensure names don't conflict with test company
        assume(name1 != 'Test Company')
        assume(name2 != 'Test Company')
        assume(code1 != 'TEST')
        assume(code2 != 'TEST')
        
        # Skip if these names/codes already exist
        assume(not Company.objects.filter(name=name1).exists())
        assume(not Company.objects.filter(name=name2).exists())
        assume(not Company.objects.filter(code=code1).exists())
        assume(not Company.objects.filter(code=code2).exists())
        
        # Create first company
        company1_data = {
            'name': name1,
            'code': code1,
            'is_active': True
        }
        
        response1 = self.client.post('/api/auth/companies/', company1_data)
        
        # First company should be created successfully
        self.assertEqual(
            response1.status_code,
            status.HTTP_201_CREATED,
            f"First company creation should succeed for name='{name1}', code='{code1}'"
        )
        
        # Try to create second company with duplicate name but different code
        company2_data = {
            'name': name1,  # DUPLICATE NAME
            'code': code2,  # Different code
            'is_active': True
        }
        
        response2 = self.client.post('/api/auth/companies/', company2_data)
        
        # Second company should fail due to duplicate name
        self.assertEqual(
            response2.status_code,
            status.HTTP_400_BAD_REQUEST,
            f"Duplicate name '{name1}' should be rejected"
        )
        
        # Error response should mention 'name' field
        self.assertIn(
            'name',
            response2.data,
            f"Error response should indicate 'name' field issue for duplicate name '{name1}'"
        )
        
        # Verify only one company exists with this name
        self.assertEqual(
            Company.objects.filter(name=name1).count(),
            1,
            f"Only one company should exist with name '{name1}'"
        )
    
    @given(
        name1=company_name_strategy(),
        name2=company_name_strategy(),
        code1=company_code_strategy(),
        code2=company_code_strategy()
    )
    @settings(max_examples=5, deadline=3000)
    def test_property_duplicate_codes_rejected(self, name1, name2, code1, code2):
        """
        Property: Creating two companies with the same code should always fail.
        
        **Validates: Requirements 1.1, 1.2, 12.4**
        
        For all possible company codes:
        - First company with unique code should succeed
        - Second company with duplicate code should fail with 400
        - Error message should mention 'code'
        """
        # Re-authenticate for this example
        self._ensure_authenticated()
        
        # Ensure names are different to isolate code uniqueness test
        assume(name1 != name2)
        # Ensure names/codes don't conflict with test company
        assume(name1 != 'Test Company')
        assume(name2 != 'Test Company')
        assume(code1 != 'TEST')
        assume(code2 != 'TEST')
        
        # Skip if these names/codes already exist
        assume(not Company.objects.filter(name=name1).exists())
        assume(not Company.objects.filter(name=name2).exists())
        assume(not Company.objects.filter(code=code1).exists())
        assume(not Company.objects.filter(code=code2).exists())
        
        # Create first company
        company1_data = {
            'name': name1,
            'code': code1,
            'is_active': True
        }
        
        response1 = self.client.post('/api/auth/companies/', company1_data)
        
        # First company should be created successfully
        self.assertEqual(
            response1.status_code,
            status.HTTP_201_CREATED,
            f"First company creation should succeed for name='{name1}', code='{code1}'"
        )
        
        # Try to create second company with duplicate code but different name
        company2_data = {
            'name': name2,  # Different name
            'code': code1,  # DUPLICATE CODE
            'is_active': True
        }
        
        response2 = self.client.post('/api/auth/companies/', company2_data)
        
        # Second company should fail due to duplicate code
        self.assertEqual(
            response2.status_code,
            status.HTTP_400_BAD_REQUEST,
            f"Duplicate code '{code1}' should be rejected"
        )
        
        # Error response should mention 'code' field
        self.assertIn(
            'code',
            response2.data,
            f"Error response should indicate 'code' field issue for duplicate code '{code1}'"
        )
        
        # Verify only one company exists with this code
        self.assertEqual(
            Company.objects.filter(code=code1).count(),
            1,
            f"Only one company should exist with code '{code1}'"
        )
    
    @given(
        name=company_name_strategy(),
        code=company_code_strategy()
    )
    @settings(max_examples=5, deadline=3000)
    def test_property_unique_company_creation_succeeds(self, name, code):
        """
        Property: Creating a company with unique name and code should always succeed.
        
        **Validates: Requirements 1.1, 1.2, 1.3**
        
        For all possible valid company names and codes:
        - If name and code are unique, creation should succeed
        - Response should include all expected fields
        - Company should be active by default
        """
        # Re-authenticate for this example
        self._ensure_authenticated()
        
        # Ensure name/code don't conflict with test company
        assume(name != 'Test Company')
        assume(code != 'TEST')
        
        # Skip if this name/code already exists
        assume(not Company.objects.filter(name=name).exists())
        assume(not Company.objects.filter(code=code).exists())
        
        company_data = {
            'name': name,
            'code': code,
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', company_data)
        
        # Creation should succeed
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f"Company creation should succeed for unique name='{name}', code='{code}'"
        )
        
        # Response should include expected fields
        self.assertIn('id', response.data)
        self.assertIn('name', response.data)
        self.assertIn('code', response.data)
        self.assertIn('is_active', response.data)
        
        # Verify data matches input (code may be normalized)
        self.assertEqual(response.data['name'], name)
        # Code should be uppercase and spaces replaced with underscores
        expected_code = code.upper().replace(' ', '_')
        self.assertEqual(response.data['code'], expected_code)
        self.assertTrue(response.data['is_active'])
        
        # Verify company exists in database
        self.assertTrue(
            Company.objects.filter(name=name).exists(),
            f"Company with name '{name}' should exist in database"
        )
    
    @given(
        name=company_name_strategy(),
        code=st.text(
            alphabet=string.ascii_lowercase + ' ',
            min_size=2,
            max_size=20
        )
    )
    @settings(max_examples=5, deadline=3000)
    def test_property_code_normalization(self, name, code):
        """
        Property: Company codes should be normalized (uppercase, spaces to underscores).
        
        **Validates: Requirements 1.2**
        
        For all possible code inputs:
        - Lowercase letters should be converted to uppercase
        - Spaces should be replaced with underscores
        - Normalized code should be stored and returned
        """
        # Re-authenticate for this example
        self._ensure_authenticated()
        
        # Ensure code has at least one alphanumeric character
        assume(any(c.isalnum() for c in code))
        # Ensure name/code don't conflict with test company
        assume(name != 'Test Company')
        normalized_code = code.upper().replace(' ', '_')
        assume(normalized_code != 'TEST')
        
        # Skip if these already exist
        assume(not Company.objects.filter(code=normalized_code).exists())
        assume(not Company.objects.filter(name=name).exists())
        
        company_data = {
            'name': name,
            'code': code,  # Lowercase with spaces
            'is_active': True
        }
        
        response = self.client.post('/api/auth/companies/', company_data)
        
        # Creation should succeed
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f"Company creation should succeed with code='{code}'"
        )
        
        # Code should be normalized in response
        expected_code = code.upper().replace(' ', '_')
        self.assertEqual(
            response.data['code'],
            expected_code,
            f"Code '{code}' should be normalized to '{expected_code}'"
        )
        
        # Verify normalized code in database
        company = Company.objects.get(id=response.data['id'])
        self.assertEqual(
            company.code,
            expected_code,
            f"Database should store normalized code '{expected_code}'"
        )
    
    @given(
        name=company_name_strategy(),
        code=company_code_strategy()
    )
    @settings(max_examples=5, deadline=3000)
    def test_property_error_messages_are_descriptive(self, name, code):
        """
        Property: Error messages for duplicate names/codes should be descriptive.
        
        **Validates: Requirement 12.4**
        
        For all possible duplicate scenarios:
        - Error response should be 400 Bad Request
        - Error should specify which field (name or code) is duplicate
        - Error message should be user-friendly
        """
        # Re-authenticate for this example
        self._ensure_authenticated()
        
        # Ensure name/code don't conflict with test company
        assume(name != 'Test Company')
        assume(code != 'TEST')
        
        # Skip if these already exist
        assume(not Company.objects.filter(name=name).exists())
        assume(not Company.objects.filter(code=code).exists())
        
        company1_data = {
            'name': name,
            'code': code,
            'is_active': True
        }
        
        response1 = self.client.post('/api/auth/companies/', company1_data)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Try to create duplicate (same name and code)
        response2 = self.client.post('/api/auth/companies/', company1_data)
        
        # Should fail with 400
        self.assertEqual(
            response2.status_code,
            status.HTTP_400_BAD_REQUEST,
            "Duplicate company should return 400 Bad Request"
        )
        
        # Should have error for at least one field (name or code)
        has_name_error = 'name' in response2.data
        has_code_error = 'code' in response2.data
        
        self.assertTrue(
            has_name_error or has_code_error,
            "Error response should indicate which field is duplicate"
        )
        
        # Error messages should be non-empty strings or lists
        if has_name_error:
            name_error = response2.data['name']
            self.assertTrue(
                name_error,
                "Name error message should not be empty"
            )
            # Should be a list or string
            self.assertTrue(
                isinstance(name_error, (list, str)),
                "Name error should be a string or list"
            )
        
        if has_code_error:
            code_error = response2.data['code']
            self.assertTrue(
                code_error,
                "Code error message should not be empty"
            )
            # Should be a list or string
            self.assertTrue(
                isinstance(code_error, (list, str)),
                "Code error should be a string or list"
            )


class CompanyUniquenessEdgeCaseTest(TestCase):
    """
    Edge case tests for company uniqueness.
    
    Tests specific edge cases that complement the property-based tests.
    """
    
    def setUp(self):
        """Set up test environment"""
        Company.objects.all().delete()
        
        # Create admin user
        self.test_company = Company.objects.create(
            name='Admin Company',
            code='ADMIN',
            is_active=True
        )
        
        self.admin_user = User.objects.create_user(
            username='admin_edge_test',
            email='admin@edgetest.com',
            first_name='Admin',
            last_name='EdgeTest',
            role='admin',
            company=self.test_company
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)
    
    def test_case_sensitive_name_uniqueness(self):
        """
        Test that company names are case-sensitive for uniqueness.
        
        **Validates: Requirement 1.1**
        """
        # Create first company
        company1_data = {
            'name': 'Test Company',
            'code': 'TEST1',
            'is_active': True
        }
        response1 = self.client.post('/api/auth/companies/', company1_data)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Try to create with different case
        company2_data = {
            'name': 'test company',  # Different case
            'code': 'TEST2',
            'is_active': True
        }
        response2 = self.client.post('/api/auth/companies/', company2_data)
        
        # Django's unique constraint is case-sensitive by default
        # This should succeed (different case = different name)
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
    
    def test_whitespace_in_names(self):
        """
        Test that leading/trailing whitespace is trimmed.
        
        **Validates: Requirement 1.1**
        """
        # Create company with whitespace
        company1_data = {
            'name': '  Whitespace Company  ',
            'code': 'WHITE1',
            'is_active': True
        }
        response1 = self.client.post('/api/auth/companies/', company1_data)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Name should be trimmed (DRF serializer trims by default)
        company = Company.objects.get(id=response1.data['id'])
        self.assertEqual(company.name, 'Whitespace Company')
    
    def test_empty_name_rejected(self):
        """
        Test that empty company names are rejected.
        
        **Validates: Requirement 1.1**
        """
        company_data = {
            'name': '',
            'code': 'EMPTY',
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_empty_code_rejected(self):
        """
        Test that empty company codes are rejected.
        
        **Validates: Requirement 1.2**
        """
        company_data = {
            'name': 'Empty Code Company',
            'code': '',
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
    
    def test_special_characters_in_code_rejected(self):
        """
        Test that special characters in codes are rejected.
        
        **Validates: Requirement 1.2**
        """
        company_data = {
            'name': 'Special Char Company',
            'code': 'TEST@#$',
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
    
    def test_very_long_name_within_limit(self):
        """
        Test that names up to 200 characters are accepted.
        
        **Validates: Requirement 1.1**
        """
        long_name = 'A' * 200  # Max length
        company_data = {
            'name': long_name,
            'code': 'LONG',
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], long_name)
    
    def test_very_long_name_exceeds_limit(self):
        """
        Test that names exceeding 200 characters are rejected.
        
        **Validates: Requirement 1.1**
        """
        long_name = 'A' * 201  # Exceeds max length
        company_data = {
            'name': long_name,
            'code': 'TOOLONG',
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_very_long_code_within_limit(self):
        """
        Test that codes up to 50 characters are accepted.
        
        **Validates: Requirement 1.2**
        """
        long_code = 'A' * 50  # Max length
        company_data = {
            'name': 'Long Code Company',
            'code': long_code,
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], long_code)
    
    def test_very_long_code_exceeds_limit(self):
        """
        Test that codes exceeding 50 characters are rejected.
        
        **Validates: Requirement 1.2**
        """
        long_code = 'A' * 51  # Exceeds max length
        company_data = {
            'name': 'Too Long Code Company',
            'code': long_code,
            'is_active': True
        }
        response = self.client.post('/api/auth/companies/', company_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
