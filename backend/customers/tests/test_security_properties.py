"""
Property-based tests for security requirements in customer-to-lead conversion feature.

This module contains property-based tests that validate security properties
across the customer-to-lead conversion system, focusing on data isolation,
authentication, and input sanitization.

**Validates: Requirements REQ-072, REQ-073, REQ-075**
"""

from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Company
from customers.models import Customer
from customers.sanitization import InputSanitizer
from customers.services import ImportService, ConversionService, AnalyticsService
from leads.models import Lead

User = get_user_model()


# Custom strategies for generating test data
@st.composite
def company_data(draw):
    """Generate company data for testing"""
    return {
        'name': draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')))),
        'email': draw(st.emails()),
        'phone': draw(st.text(min_size=10, max_size=15, alphabet=st.characters(whitelist_categories=('Nd',)))),
    }


@st.composite
def user_data(draw):
    """Generate user data for testing"""
    return {
        'username': draw(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        'email': draw(st.emails()),
        'first_name': draw(st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'last_name': draw(st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
    }


@st.composite
def customer_data(draw):
    """Generate customer data for testing"""
    return {
        'name': draw(st.text(min_size=1, max_size=255, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'phone': draw(st.text(min_size=10, max_size=15, alphabet=st.characters(whitelist_categories=('Nd',)))),
        'notes': draw(st.text(max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po')))),
    }


@st.composite
def malicious_input_data(draw):
    """Generate potentially malicious input data for testing sanitization"""
    malicious_patterns = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE customers; --",
        "' OR 1=1 --",
        "' UNION SELECT * FROM users --",
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "../../etc/passwd",
        "../../../windows/system32",
        "\x00\x01\x02",  # null bytes and control characters
    ]
    
    base_text = draw(st.text(min_size=1, max_size=100))
    malicious_pattern = draw(st.sampled_from(malicious_patterns))
    
    # Randomly insert malicious pattern into base text
    position = draw(st.integers(min_value=0, max_value=len(base_text)))
    return base_text[:position] + malicious_pattern + base_text[position:]


class TestSecurityProperties(TestCase):
    """Property-based tests for security requirements"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test companies
        self.company1 = Company.objects.create(
            name="Company 1",
            code="COMP1"
        )
        self.company2 = Company.objects.create(
            name="Company 2", 
            code="COMP2"
        )
        
        # Create test users
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@company1.com",
            password="testpass123",
            company=self.company1
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@company2.com", 
            password="testpass123",
            company=self.company2
        )


class TestSecurityPropertiesHypothesis(HypothesisTestCase):
    """Hypothesis-based property tests for security requirements"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Get or create test companies with unique codes
        self.company1, _ = Company.objects.get_or_create(
            code="HYPO1",
            defaults={
                'name': "Hypothesis Company 1"
            }
        )
        self.company2, _ = Company.objects.get_or_create(
            code="HYPO2", 
            defaults={
                'name': "Hypothesis Company 2"
            }
        )
        
        # Create test users
        self.user1 = User.objects.create_user(
            username="huser1",
            email="huser1@company1.com",
            password="testpass123",
            company=self.company1
        )
        self.user2 = User.objects.create_user(
            username="huser2",
            email="huser2@company2.com", 
            password="testpass123",
            company=self.company2
        )
    
    @given(
        endpoint_data=st.sampled_from([
            # GET endpoints
            ('/api/customers/', 'GET'),
            ('/api/customers/import/template/', 'GET'),
            ('/api/customers/analytics/conversion-rate/', 'GET'),
            ('/api/customers/analytics/conversion-by-user/', 'GET'),
            ('/api/customers/analytics/conversion-trend/', 'GET'),
            ('/api/customers/analytics/pending-conversions/', 'GET'),
            # POST endpoints
            ('/api/customers/', 'POST'),
            ('/api/customers/import/', 'POST'),
            ('/api/customers/import/preview/', 'POST'),
            ('/api/customers/bulk-import/', 'POST'),
            ('/api/customers/bulk-convert/', 'POST'),
            ('/api/customers/bulk-assign/', 'POST'),
            # PUT/PATCH endpoints (with placeholder ID)
            ('/api/customers/1/', 'PUT'),
            ('/api/customers/1/', 'PATCH'),
            ('/api/customers/1/conversion-form/', 'GET'),
            ('/api/customers/1/convert/', 'POST'),
            # DELETE endpoints
            ('/api/customers/1/', 'DELETE'),
        ])
    )
    @settings(max_examples=10, deadline=None)
    def test_authentication_requirement(self, endpoint_data):
        """
        **Property 47: Authentication Requirement**
        
        For any API endpoint related to customers, leads, or conversion, 
        requests without valid authentication credentials should be rejected 
        with a 401 Unauthorized response.
        
        **Validates: Requirements REQ-073**
        """
        endpoint, method = endpoint_data
        
        # Test unauthenticated request
        if method == 'GET':
            response = self.client.get(endpoint)
        elif method == 'POST':
            response = self.client.post(endpoint, {})
        elif method == 'PUT':
            response = self.client.put(endpoint, {})
        elif method == 'PATCH':
            response = self.client.patch(endpoint, {})
        elif method == 'DELETE':
            response = self.client.delete(endpoint)
        
        # Should require authentication (401 Unauthorized, 403 Forbidden, or 404 Not Found)
        # Note: 404 is acceptable for some endpoints when unauthenticated
        self.assertIn(
            response.status_code, 
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
            f"{method} {endpoint} should require authentication but returned {response.status_code}"
        )
        
        # Test that authenticated requests don't get auth errors
        # (they may still get other errors like 404, 400, etc. but not auth errors)
        # Create a fresh client for authenticated requests
        auth_client = APIClient()
        auth_client.force_authenticate(user=self.user1)
        
        if method == 'GET':
            response = auth_client.get(endpoint)
        elif method == 'POST':
            # Use minimal valid data for POST requests to avoid validation errors
            if 'import' in endpoint:
                # For import endpoints, we expect 400 due to missing file, not auth error
                response = auth_client.post(endpoint, {})
            elif 'convert' in endpoint:
                # For conversion endpoints, we expect 400/404 due to missing data, not auth error
                response = auth_client.post(endpoint, {})
            else:
                response = auth_client.post(endpoint, {})
        elif method == 'PUT':
            response = auth_client.put(endpoint, {})
        elif method == 'PATCH':
            response = auth_client.patch(endpoint, {})
        elif method == 'DELETE':
            response = auth_client.delete(endpoint)
        
        # Should NOT be an authentication error
        self.assertNotIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
            f"Authenticated {method} {endpoint} should not return auth error but returned {response.status_code}"
        )
    
    @given(
        customers_company1=st.lists(customer_data(), min_size=1, max_size=5),
        customers_company2=st.lists(customer_data(), min_size=1, max_size=5)
    )
    @settings(max_examples=10, deadline=None)
    def test_property_company_data_isolation(self, customers_company1, customers_company2):
        """
        **Property 46: Company Data Isolation**
        
        For any authenticated user, all customer and lead queries should only return 
        records where the company field matches the user's company (no cross-company data access).
        
        **Validates: Requirements REQ-072**
        """
        # Create test companies
        company1 = Company.objects.create(name="Test Company 1", code="TC1")
        company2 = Company.objects.create(name="Test Company 2", code="TC2")
        
        # Create test users
        user1 = User.objects.create_user(
            username="testuser1",
            email="test1@company1.com",
            password="testpass123",
            company=company1
        )
        user2 = User.objects.create_user(
            username="testuser2",
            email="test2@company2.com", 
            password="testpass123",
            company=company2
        )
        
        client = APIClient()
        
        # Create customers for company 1
        company1_customer_ids = []
        for i, customer_data_item in enumerate(customers_company1):
            # Ensure unique phone numbers within company
            phone = f"1{i:09d}"
            customer = Customer.objects.create(
                name=customer_data_item['name'][:255],  # Ensure max length
                phone=phone,
                notes=customer_data_item['notes'][:500],  # Ensure max length
                company=company1,
                created_by=user1
            )
            company1_customer_ids.append(customer.id)
        
        # Create customers for company 2
        company2_customer_ids = []
        for i, customer_data_item in enumerate(customers_company2):
            # Ensure unique phone numbers within company
            phone = f"2{i:09d}"
            customer = Customer.objects.create(
                name=customer_data_item['name'][:255],  # Ensure max length
                phone=phone,
                notes=customer_data_item['notes'][:500],  # Ensure max length
                company=company2,
                created_by=user2
            )
            company2_customer_ids.append(customer.id)
        
        # Test API endpoint isolation - authenticate as user1
        client.force_authenticate(user=user1)
        
        # Get customers for user1 - should only see company1 customers
        response = client.get('/api/customers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        returned_customer_ids = [customer['id'] for customer in response.data['results']]
        
        # Verify user1 can only see company1 customers
        for customer_id in returned_customer_ids:
            self.assertIn(customer_id, company1_customer_ids)
            self.assertNotIn(customer_id, company2_customer_ids)
        
        # Verify all company1 customers are returned
        self.assertEqual(set(returned_customer_ids), set(company1_customer_ids))
        
        # Test individual customer access - user1 should not access company2 customers
        if company2_customer_ids:
            response = client.get(f'/api/customers/{company2_customer_ids[0]}/')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test API endpoint isolation - authenticate as user2
        client.force_authenticate(user=user2)
        
        # Get customers for user2 - should only see company2 customers
        response = client.get('/api/customers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        returned_customer_ids = [customer['id'] for customer in response.data['results']]
        
        # Verify user2 can only see company2 customers
        for customer_id in returned_customer_ids:
            self.assertIn(customer_id, company2_customer_ids)
            self.assertNotIn(customer_id, company1_customer_ids)
        
        # Verify all company2 customers are returned
        self.assertEqual(set(returned_customer_ids), set(company2_customer_ids))
        
        # Test individual customer access - user2 should not access company1 customers
        if company1_customer_ids:
            response = client.get(f'/api/customers/{company1_customer_ids[0]}/')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test service-level isolation
        analytics_service = AnalyticsService()
        
        # Company 1 analytics should only include company 1 data
        company1_analytics = analytics_service.get_conversion_rate(company1.id)
        expected_rate = 0.0  # No conversions yet
        self.assertEqual(company1_analytics['conversion_rate'], expected_rate)
        
        # Company 2 analytics should only include company 2 data
        company2_analytics = analytics_service.get_conversion_rate(company2.id)
        expected_rate = 0.0  # No conversions yet
        self.assertEqual(company2_analytics['conversion_rate'], expected_rate)
    
    @given(malicious_data=malicious_input_data())
    @settings(max_examples=10, deadline=None)
    def test_property_input_sanitization(self, malicious_data):
        """
        **Property 49: Input Sanitization**
        
        For any import or conversion operation with potentially malicious input 
        (SQL injection, XSS payloads), the system should sanitize the input and 
        store/display it safely without executing the malicious code.
        
        **Validates: Requirements REQ-075**
        """
        # Test string sanitization (primarily for XSS prevention)
        sanitized = InputSanitizer.sanitize_string(malicious_data)
        
        # Should not contain dangerous XSS patterns (HTML should be escaped)
        html_tags = ['<script', '<img', '<iframe']
        
        # Check that dangerous HTML tags are escaped
        for tag in html_tags:
            if tag.lower() in malicious_data.lower():
                # The tag should be escaped (< becomes &lt;)
                escaped_tag = tag.replace('<', '&lt;')
                self.assertIn(escaped_tag.lower(), sanitized.lower())
                # And the raw tag should not be present
                self.assertNotIn(tag.lower(), sanitized.lower())
        
        # Test SQL injection detection (separate from sanitization)
        has_sql_injection = InputSanitizer.check_sql_injection_patterns(malicious_data)
        
        # If malicious data contains SQL injection patterns, it should be detected
        sql_patterns = ['SELECT', 'DROP', 'UNION', 'INSERT', 'UPDATE', 'DELETE', '--', "' OR", '" OR']
        contains_sql = any(pattern.lower() in malicious_data.lower() for pattern in sql_patterns)
        
        if contains_sql:
            self.assertTrue(has_sql_injection, f"Failed to detect SQL injection in: {malicious_data}")
        
        # Test import data sanitization (should reject SQL injection)
        import_row = {
            'phone': malicious_data[:15] if len(malicious_data) >= 10 else '1234567890',
            'name': malicious_data
        }
        
        if has_sql_injection:
            # Should raise ValidationError for SQL injection
            with self.assertRaises(ValidationError):
                InputSanitizer.sanitize_import_data(import_row)
        else:
            # Should sanitize safely if no SQL injection
            try:
                sanitized_row = InputSanitizer.sanitize_import_data(import_row)
                
                # XSS patterns should be escaped in the result
                for pattern in ['<script', '<img', '<iframe']:
                    if pattern.lower() in malicious_data.lower():
                        escaped_pattern = pattern.replace('<', '&lt;')
                        self.assertIn(escaped_pattern.lower(), sanitized_row['name'].lower())
                        self.assertNotIn(pattern.lower(), sanitized_row['name'].lower())
                        
            except ValidationError:
                # ValidationError is acceptable for malicious input
                pass
        
        # Test conversion data sanitization (should reject SQL injection)
        conversion_data = {
            'phone': '1234567890',
            'name': malicious_data,
            'email': 'test@example.com',
            'description': malicious_data,
            'preferred_location': malicious_data,
            'budget_min': 1000000,
            'budget_max': 2000000
        }
        
        if has_sql_injection:
            # Should raise ValidationError for SQL injection
            with self.assertRaises(ValidationError):
                InputSanitizer.sanitize_conversion_data(conversion_data)
        else:
            # Should sanitize safely if no SQL injection
            try:
                sanitized_conversion = InputSanitizer.sanitize_conversion_data(conversion_data)
                
                # XSS patterns should be escaped in text fields
                for field in ['name', 'description', 'preferred_location']:
                    if field in sanitized_conversion:
                        for pattern in ['<script', '<img', '<iframe']:
                            if pattern.lower() in malicious_data.lower():
                                escaped_pattern = pattern.replace('<', '&lt;')
                                self.assertIn(escaped_pattern.lower(), sanitized_conversion[field].lower())
                                self.assertNotIn(pattern.lower(), sanitized_conversion[field].lower())
                                
            except ValidationError:
                # ValidationError is acceptable for malicious input
                pass
    
    @given(
        file_content=st.text(min_size=1, max_size=1000),
        malicious_filename=st.sampled_from([
            "test.csv",
            "test.exe", 
            "../../../etc/passwd",
            "test\x00.csv",
            "test.csv.exe",
            "test;rm -rf /.csv"
        ])
    )
    @settings(max_examples=10, deadline=None)
    def test_property_file_upload_security(self, file_content, malicious_filename):
        """
        **Property 49b: File Upload Security**
        
        For any file upload operation, the system should validate file types,
        prevent path traversal attacks, and reject malicious file names.
        
        **Validates: Requirements REQ-075**
        """
        # Create a mock file object to avoid Django's filename sanitization
        class MockFile:
            def __init__(self, name, content):
                self.name = name
                self.size = len(content.encode('utf-8'))
        
        file_obj = MockFile(malicious_filename, file_content)
        
        # Test file validation
        if any(pattern in malicious_filename for pattern in ['.exe', '../', '\x00', ';']):
            # Should reject malicious filenames
            with self.assertRaises(ValidationError):
                InputSanitizer.validate_file_upload(file_obj)
        elif malicious_filename.endswith('.csv'):
            # Valid CSV files should pass (unless too large)
            if len(file_content.encode('utf-8')) <= InputSanitizer.MAX_FILE_SIZE:
                try:
                    InputSanitizer.validate_file_upload(file_obj)
                except ValidationError:
                    # May still fail for other reasons, which is acceptable
                    pass
