"""
Property-Based Tests for Automatic Company Assignment on Creation

**Validates: Requirements 3.2, 4.6, 4.7**

Property 7: Automatic Company Assignment on Creation
For any user creating a business entity through a ViewSet using CompanyFilterMixin:
- Manager and Employee users: Entity automatically gets assigned their company
- Admin and HR users: Must explicitly specify company in request data
- Admin and HR users: Get validation error if company is not specified

This test validates that the CompanyFilterMixin.perform_create() method correctly
enforces automatic company assignment based on user role.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Company
from utils.mixins import CompanyFilterMixin
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework import viewsets, serializers
from rest_framework.exceptions import ValidationError
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
from datetime import datetime

User = get_user_model()


# Mock model for testing
class MockBusinessEntity:
    """Mock business entity model"""
    
    def __init__(self, id=None, company=None, name=None):
        self.id = id
        self.company = company
        self.name = name


# Mock serializer for testing
class MockSerializer(serializers.Serializer):
    """Mock serializer for testing company assignment"""
    
    name = serializers.CharField()
    company = serializers.IntegerField(required=False)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._validated_data = {}
        self.saved_instance = None
        self.save_kwargs = {}
    
    @property
    def validated_data(self):
        """Return validated data"""
        return self._validated_data
    
    @validated_data.setter
    def validated_data(self, value):
        """Set validated data"""
        self._validated_data = value
    
    def save(self, **kwargs):
        """Mock save method that captures kwargs"""
        self.save_kwargs = kwargs
        # Create mock instance with company from kwargs or validated_data
        company = kwargs.get('company') or self._validated_data.get('company')
        self.saved_instance = MockBusinessEntity(
            id=1,
            company=company,
            name=self._validated_data.get('name', 'Test Entity')
        )
        return self.saved_instance


# Mock ViewSet for testing
class MockBusinessViewSet(CompanyFilterMixin, viewsets.GenericViewSet):
    """Mock ViewSet for testing automatic company assignment"""
    
    serializer_class = MockSerializer
    
    def get_queryset(self):
        """Override to prevent actual database queries"""
        return []


class AutomaticCompanyAssignmentTest(TestCase):
    """
    Unit tests for automatic company assignment on entity creation.
    
    Tests that CompanyFilterMixin.perform_create() correctly assigns company
    based on user role.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Create two companies
        self.company1 = Company.objects.create(
            name='Company One',
            code='COMP1',
            is_active=True
        )
        
        self.company2 = Company.objects.create(
            name='Company Two',
            code='COMP2',
            is_active=True
        )
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company1
        )
        
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@example.com',
            first_name='HR',
            last_name='User',
            role='hr',
            company=self.company1
        )
        
        self.manager_user = User.objects.create_user(
            username='manager_user',
            email='manager@example.com',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=self.company1
        )
        
        self.employee_user = User.objects.create_user(
            username='employee_user',
            email='employee@example.com',
            first_name='Employee',
            last_name='User',
            role='employee',
            company=self.company1
        )
        
        self.manager_company2 = User.objects.create_user(
            username='manager_c2',
            email='manager2@example.com',
            first_name='Manager',
            last_name='Two',
            role='manager',
            company=self.company2
        )
        
        # Create API request factory
        self.factory = APIRequestFactory()
    
    def _create_request(self, user, data=None):
        """Helper method to create a DRF Request with user and data"""
        if data:
            wsgi_request = self.factory.post('/test/', data)
        else:
            wsgi_request = self.factory.post('/test/')
        request = Request(wsgi_request)
        request.user = user
        return request
    
    def test_manager_auto_assigns_own_company(self):
        """
        Test that manager users automatically get their company assigned to created entities.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Create request without company in data
        request = self._create_request(self.manager_user, {'name': 'Test Entity'})
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (no company specified)
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create
        viewset.perform_create(serializer)
        
        # Verify company was auto-assigned
        self.assertIn('company', serializer.save_kwargs, "Company should be in save kwargs")
        self.assertEqual(
            serializer.save_kwargs['company'],
            self.company1,
            "Manager's company should be auto-assigned"
        )
        self.assertEqual(
            serializer.saved_instance.company,
            self.company1,
            "Saved instance should have manager's company"
        )
    
    def test_employee_auto_assigns_own_company(self):
        """
        Test that employee users automatically get their company assigned to created entities.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Create request without company in data
        request = self._create_request(self.employee_user, {'name': 'Test Entity'})
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (no company specified)
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create
        viewset.perform_create(serializer)
        
        # Verify company was auto-assigned
        self.assertIn('company', serializer.save_kwargs, "Company should be in save kwargs")
        self.assertEqual(
            serializer.save_kwargs['company'],
            self.company1,
            "Employee's company should be auto-assigned"
        )
        self.assertEqual(
            serializer.saved_instance.company,
            self.company1,
            "Saved instance should have employee's company"
        )
    
    def test_admin_requires_explicit_company(self):
        """
        Test that admin users must explicitly specify company when creating entities.
        
        **Validates: Requirements 4.7**
        """
        # Create request without company in data
        request = self._create_request(self.admin_user, {'name': 'Test Entity'})
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (no company specified)
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            viewset.perform_create(serializer)
        
        # Verify error message
        self.assertIn('company', context.exception.detail)
        # Check if the message contains the expected text
        self.assertIn(
            'This field is required for admin/hr users',
            str(context.exception.detail['company'])
        )
    
    def test_hr_requires_explicit_company(self):
        """
        Test that HR users must explicitly specify company when creating entities.
        
        **Validates: Requirements 4.7**
        """
        # Create request without company in data
        request = self._create_request(self.hr_user, {'name': 'Test Entity'})
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (no company specified)
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            viewset.perform_create(serializer)
        
        # Verify error message
        self.assertIn('company', context.exception.detail)
        # Check if the message contains the expected text
        self.assertIn(
            'This field is required for admin/hr users',
            str(context.exception.detail['company'])
        )
    
    def test_admin_can_specify_company_explicitly(self):
        """
        Test that admin users can create entities with explicitly specified company.
        
        **Validates: Requirements 4.7**
        """
        # Create request with company in data
        request = self._create_request(self.admin_user, {
            'name': 'Test Entity',
            'company': self.company2.id
        })
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (company specified)
        serializer = MockSerializer()
        serializer.validated_data = {
            'name': 'Test Entity',
            'company': self.company2
        }
        
        # Call perform_create - should succeed
        viewset.perform_create(serializer)
        
        # Verify company was used from validated_data
        self.assertEqual(
            serializer.saved_instance.company,
            self.company2,
            "Admin should be able to specify company explicitly"
        )
    
    def test_hr_can_specify_company_explicitly(self):
        """
        Test that HR users can create entities with explicitly specified company.
        
        **Validates: Requirements 4.7**
        """
        # Create request with company in data
        request = self._create_request(self.hr_user, {
            'name': 'Test Entity',
            'company': self.company2.id
        })
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (company specified)
        serializer = MockSerializer()
        serializer.validated_data = {
            'name': 'Test Entity',
            'company': self.company2
        }
        
        # Call perform_create - should succeed
        viewset.perform_create(serializer)
        
        # Verify company was used from validated_data
        self.assertEqual(
            serializer.saved_instance.company,
            self.company2,
            "HR should be able to specify company explicitly"
        )
    
    def test_different_managers_auto_assign_different_companies(self):
        """
        Test that managers from different companies auto-assign their respective companies.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Test manager from company1
        request1 = self._create_request(self.manager_user, {'name': 'Entity 1'})
        viewset1 = MockBusinessViewSet()
        viewset1.request = request1
        serializer1 = MockSerializer()
        serializer1.validated_data = {'name': 'Entity 1'}
        
        viewset1.perform_create(serializer1)
        
        # Test manager from company2
        request2 = self._create_request(self.manager_company2, {'name': 'Entity 2'})
        viewset2 = MockBusinessViewSet()
        viewset2.request = request2
        serializer2 = MockSerializer()
        serializer2.validated_data = {'name': 'Entity 2'}
        
        viewset2.perform_create(serializer2)
        
        # Verify different companies were assigned
        self.assertEqual(
            serializer1.saved_instance.company,
            self.company1,
            "Manager 1 should auto-assign company1"
        )
        self.assertEqual(
            serializer2.saved_instance.company,
            self.company2,
            "Manager 2 should auto-assign company2"
        )
        self.assertNotEqual(
            serializer1.saved_instance.company,
            serializer2.saved_instance.company,
            "Different managers should assign different companies"
        )
    
    def test_manager_cannot_override_company_assignment(self):
        """
        Test that manager users cannot override automatic company assignment.
        Even if company is in validated_data, their own company should be used.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Create request with different company in data
        request = self._create_request(self.manager_user, {
            'name': 'Test Entity',
            'company': self.company2.id
        })
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with validated data (company specified as company2)
        serializer = MockSerializer()
        serializer.validated_data = {
            'name': 'Test Entity',
            'company': self.company2  # Manager tries to specify different company
        }
        
        # Call perform_create
        viewset.perform_create(serializer)
        
        # Verify manager's own company was used (company1), not the specified one (company2)
        self.assertEqual(
            serializer.save_kwargs['company'],
            self.company1,
            "Manager's own company should be used, ignoring specified company"
        )
        self.assertEqual(
            serializer.saved_instance.company,
            self.company1,
            "Saved instance should have manager's company, not specified company"
        )


class AutomaticCompanyAssignmentPropertyTest(HypothesisTestCase):
    """
    Property-based tests for automatic company assignment on entity creation.
    
    These tests use hypothesis to generate random data and verify that
    the company assignment logic works correctly across all scenarios.
    """
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        restricted_role=st.sampled_from(['manager', 'employee'])
    )
    def test_property_restricted_roles_auto_assign_company(self, restricted_role):
        """
        Property: For any restricted role (manager, employee), entities created
        automatically get assigned the user's company.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Create company
        company = Company.objects.create(
            name=f'Company {datetime.now().timestamp()}',
            code=f'COMP{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create user with restricted role
        user = User.objects.create_user(
            username=f'{restricted_role}_{datetime.now().timestamp()}',
            email=f'{restricted_role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=restricted_role,
            company=company
        )
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.post('/test/', {'name': 'Test Entity'})
        request = Request(wsgi_request)
        request.user = user
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer without company
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create
        viewset.perform_create(serializer)
        
        # Verify company was auto-assigned
        self.assertIn(
            'company',
            serializer.save_kwargs,
            f"{restricted_role} should have company auto-assigned"
        )
        self.assertEqual(
            serializer.save_kwargs['company'],
            company,
            f"{restricted_role}'s company should be auto-assigned"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        cross_company_role=st.sampled_from(['admin', 'hr'])
    )
    def test_property_cross_company_roles_require_explicit_company(self, cross_company_role):
        """
        Property: For any cross-company role (admin, hr), creating entities without
        explicit company specification raises ValidationError.
        
        **Validates: Requirements 4.7**
        """
        # Create company
        company = Company.objects.create(
            name=f'Company {datetime.now().timestamp()}',
            code=f'COMP{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create user with cross-company role
        user = User.objects.create_user(
            username=f'{cross_company_role}_{datetime.now().timestamp()}',
            email=f'{cross_company_role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=cross_company_role,
            company=company
        )
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.post('/test/', {'name': 'Test Entity'})
        request = Request(wsgi_request)
        request.user = user
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer without company
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            viewset.perform_create(serializer)
        
        # Verify error message
        self.assertIn('company', context.exception.detail)
        # Check if the message contains the expected text
        self.assertIn(
            'This field is required for admin/hr users',
            str(context.exception.detail['company']),
            f"{cross_company_role} should require explicit company"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        user_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_manager_always_assigns_own_company(self, company_count, user_company_index):
        """
        Property: For any number of companies, managers always auto-assign their
        own company to created entities, regardless of what's in the request.
        
        **Validates: Requirements 3.2, 4.6**
        """
        # Ensure index is within bounds
        assume(user_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create manager in specific company
        user_company = companies[user_company_index]
        manager = User.objects.create_user(
            username=f'manager_{datetime.now().timestamp()}',
            email=f'manager_{datetime.now().timestamp()}@example.com',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=user_company
        )
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.post('/test/', {'name': 'Test Entity'})
        request = Request(wsgi_request)
        request.user = manager
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer without company
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Call perform_create
        viewset.perform_create(serializer)
        
        # Verify manager's company was assigned
        self.assertEqual(
            serializer.save_kwargs['company'],
            user_company,
            "Manager should always assign their own company"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        admin_company_index=st.integers(min_value=0, max_value=4),
        target_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_admin_can_specify_any_company(self, company_count, 
                                                     admin_company_index, 
                                                     target_company_index):
        """
        Property: For any number of companies, admin users can explicitly specify
        any company when creating entities (not restricted to their own company).
        
        **Validates: Requirements 4.7**
        """
        # Ensure indices are within bounds
        assume(admin_company_index < company_count)
        assume(target_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create admin in specific company
        admin_company = companies[admin_company_index]
        admin = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=admin_company
        )
        
        # Target company for entity creation
        target_company = companies[target_company_index]
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.post('/test/', {
            'name': 'Test Entity',
            'company': target_company.id
        })
        request = Request(wsgi_request)
        request.user = admin
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer with explicit company
        serializer = MockSerializer()
        serializer.validated_data = {
            'name': 'Test Entity',
            'company': target_company
        }
        
        # Call perform_create - should succeed
        viewset.perform_create(serializer)
        
        # Verify target company was used
        self.assertEqual(
            serializer.saved_instance.company,
            target_company,
            f"Admin should be able to specify any company (company {target_company_index})"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee'])
    )
    def test_property_role_based_company_assignment_consistency(self, role):
        """
        Property: For any role, the company assignment behavior is consistent:
        - admin/hr: Require explicit company (ValidationError if missing)
        - manager/employee: Auto-assign their company
        
        **Validates: Requirements 3.2, 4.6, 4.7**
        """
        # Create company
        company = Company.objects.create(
            name=f'Company {datetime.now().timestamp()}',
            code=f'COMP{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create user with specified role
        user = User.objects.create_user(
            username=f'user_{role}_{datetime.now().timestamp()}',
            email=f'user_{role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=role,
            company=company
        )
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.post('/test/', {'name': 'Test Entity'})
        request = Request(wsgi_request)
        request.user = user
        
        # Create viewset
        viewset = MockBusinessViewSet()
        viewset.request = request
        
        # Create serializer without company
        serializer = MockSerializer()
        serializer.validated_data = {'name': 'Test Entity'}
        
        # Test based on role
        if role in ['admin', 'hr']:
            # Should raise ValidationError
            with self.assertRaises(ValidationError) as context:
                viewset.perform_create(serializer)
            
            self.assertIn('company', context.exception.detail)
            # Check if the message contains the expected text
            self.assertIn(
                'This field is required for admin/hr users',
                str(context.exception.detail['company']),
                f"{role} should require explicit company"
            )
        else:  # manager or employee
            # Should auto-assign company
            viewset.perform_create(serializer)
            
            self.assertIn(
                'company',
                serializer.save_kwargs,
                f"{role} should have company auto-assigned"
            )
            self.assertEqual(
                serializer.save_kwargs['company'],
                company,
                f"{role}'s company should be auto-assigned"
            )
