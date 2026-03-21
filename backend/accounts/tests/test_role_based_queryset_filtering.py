"""
Property-Based Tests for Role-Based Queryset Filtering

**Validates: Requirements 4.1, 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.7**

Property 5: Role-Based Queryset Filtering
For any user with a specific role (admin, hr, manager, employee), when they request
data through a ViewSet using CompanyFilterMixin:
- Admin and HR users should see data from all companies (or filtered by company parameter)
- Manager and Employee users should see only data from their assigned company
- Admin and HR users can filter by company parameter
- Manager and Employee users cannot bypass company restrictions with filter parameters

This test validates that the CompanyFilterMixin correctly enforces role-based
company access control at the queryset level.
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from accounts.models import Company
from utils.mixins import CompanyFilterMixin
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework import viewsets
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
import string
from datetime import datetime

User = get_user_model()


# Create a mock ViewSet for testing the mixin
class MockModel:
    """Mock model for testing"""
    objects = None
    
    def __init__(self, id, company):
        self.id = id
        self.company = company


class MockQuerySet:
    """Mock queryset that simulates Django QuerySet behavior"""
    
    def __init__(self, items=None):
        self.items = items or []
        self._filters = {}
    
    def filter(self, **kwargs):
        """Simulate filter operation"""
        filtered_items = self.items.copy()
        
        # Handle company filter
        if 'company' in kwargs:
            company = kwargs['company']
            filtered_items = [item for item in filtered_items if item.company == company]
        
        # Handle company_id filter
        if 'company_id' in kwargs:
            company_id = kwargs['company_id']
            # Convert to int if it's a string
            if isinstance(company_id, str):
                company_id = int(company_id)
            filtered_items = [item for item in filtered_items if item.company.id == company_id]
        
        result = MockQuerySet(filtered_items)
        result._filters = {**self._filters, **kwargs}
        return result
    
    def all(self):
        """Return all items"""
        return MockQuerySet(self.items)
    
    def count(self):
        """Return count of items"""
        return len(self.items)
    
    def __iter__(self):
        """Make queryset iterable"""
        return iter(self.items)
    
    def __len__(self):
        """Return length"""
        return len(self.items)


class MockViewSet(CompanyFilterMixin, viewsets.GenericViewSet):
    """Mock ViewSet for testing CompanyFilterMixin"""
    
    queryset = MockQuerySet()  # Default queryset attribute
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._test_queryset = None
    
    def get_queryset(self):
        """Override to use mock queryset"""
        # Return test queryset if set, otherwise use the mixin's filtering logic
        if self._test_queryset is not None:
            # Temporarily set queryset attribute for the mixin to work with
            self.queryset = self._test_queryset
        return super().get_queryset()
    
    def set_queryset(self, queryset):
        """Set the base queryset for testing"""
        self._test_queryset = queryset
        self.queryset = queryset


class RoleBasedQuerysetFilteringTest(TestCase):
    """
    Unit tests for role-based queryset filtering.
    
    Tests that CompanyFilterMixin correctly filters querysets based on user role
    and company assignments.
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
        
        self.manager_user_company2 = User.objects.create_user(
            username='manager_user_c2',
            email='manager2@example.com',
            first_name='Manager',
            last_name='Two',
            role='manager',
            company=self.company2
        )
        
        # Create mock data items
        self.items_company1 = [
            MockModel(id=1, company=self.company1),
            MockModel(id=2, company=self.company1),
            MockModel(id=3, company=self.company1),
        ]
        
        self.items_company2 = [
            MockModel(id=4, company=self.company2),
            MockModel(id=5, company=self.company2),
        ]
        
        self.all_items = self.items_company1 + self.items_company2
        
        # Create API request factory
        self.factory = APIRequestFactory()
    
    def _create_request(self, user, query_params=None):
        """Helper method to create a DRF Request with user and query params"""
        if query_params:
            wsgi_request = self.factory.get('/test/', query_params)
        else:
            wsgi_request = self.factory.get('/test/')
        request = Request(wsgi_request)
        request.user = user
        return request
    
    def test_admin_sees_all_companies(self):
        """
        Test that admin users see data from all companies.
        
        **Validates: Requirements 4.1, 5.1**
        """
        # Create request
        request = self._create_request(self.admin_user)
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Admin should see all items
        self.assertEqual(len(queryset), 5, "Admin should see all 5 items from both companies")
    
    def test_hr_sees_all_companies(self):
        """
        Test that HR users see data from all companies.
        
        **Validates: Requirements 4.1, 5.1**
        """
        # Create request
        request = self._create_request(self.hr_user)
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # HR should see all items
        self.assertEqual(len(queryset), 5, "HR should see all 5 items from both companies")
    
    def test_manager_sees_only_own_company(self):
        """
        Test that manager users see only their company's data.
        
        **Validates: Requirements 4.2, 5.2**
        """
        # Create request
        request = self._create_request(self.manager_user)
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Manager should see only company1 items
        self.assertEqual(len(queryset), 3, "Manager should see only 3 items from their company")
        
        # Verify all items are from company1
        for item in queryset:
            self.assertEqual(item.company, self.company1, "All items should be from company1")
    
    def test_employee_sees_only_own_company(self):
        """
        Test that employee users see only their company's data.
        
        **Validates: Requirements 4.2, 5.2**
        """
        # Create request
        request = self._create_request(self.employee_user)
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Employee should see only company1 items
        self.assertEqual(len(queryset), 3, "Employee should see only 3 items from their company")
        
        # Verify all items are from company1
        for item in queryset:
            self.assertEqual(item.company, self.company1, "All items should be from company1")
    
    def test_admin_can_filter_by_company(self):
        """
        Test that admin users can filter by company parameter.
        
        **Validates: Requirements 4.5, 5.3**
        """
        # Create request with company filter
        request = self._create_request(self.admin_user, {'company': str(self.company2.id)})
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Admin should see only company2 items
        self.assertEqual(len(queryset), 2, "Admin should see only 2 items from company2")
        
        # Verify all items are from company2
        for item in queryset:
            self.assertEqual(item.company, self.company2, "All items should be from company2")
    
    def test_hr_can_filter_by_company(self):
        """
        Test that HR users can filter by company parameter.
        
        **Validates: Requirements 4.5, 5.3**
        """
        # Create request with company filter
        request = self._create_request(self.hr_user, {'company': str(self.company2.id)})
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # HR should see only company2 items
        self.assertEqual(len(queryset), 2, "HR should see only 2 items from company2")
        
        # Verify all items are from company2
        for item in queryset:
            self.assertEqual(item.company, self.company2, "All items should be from company2")
    
    def test_manager_cannot_bypass_with_company_filter(self):
        """
        Test that manager users cannot bypass company restrictions with filter parameter.
        
        **Validates: Requirements 5.4, 5.7**
        """
        # Create request with company filter for different company
        request = self._create_request(self.manager_user, {'company': str(self.company2.id)})
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Manager should still see only their company's items (company1)
        # The company filter parameter should be ignored for restricted roles
        self.assertEqual(len(queryset), 3, "Manager should see only their company's items")
        
        # Verify all items are from company1 (not company2)
        for item in queryset:
            self.assertEqual(item.company, self.company1, "All items should be from manager's company")
    
    def test_employee_cannot_bypass_with_company_filter(self):
        """
        Test that employee users cannot bypass company restrictions with filter parameter.
        
        **Validates: Requirements 5.4, 5.7**
        """
        # Create request with company filter for different company
        request = self._create_request(self.employee_user, {'company': str(self.company2.id)})
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(self.all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Employee should still see only their company's items (company1)
        # The company filter parameter should be ignored for restricted roles
        self.assertEqual(len(queryset), 3, "Employee should see only their company's items")
        
        # Verify all items are from company1 (not company2)
        for item in queryset:
            self.assertEqual(item.company, self.company1, "All items should be from employee's company")
    
    def test_different_managers_see_different_companies(self):
        """
        Test that managers from different companies see different data.
        
        **Validates: Requirements 4.2, 5.2**
        """
        # Test manager from company1
        request1 = self._create_request(self.manager_user)
        
        viewset1 = MockViewSet()
        viewset1.request = request1
        viewset1.set_queryset(MockQuerySet(self.all_items))
        
        queryset1 = viewset1.get_queryset()
        
        # Test manager from company2
        request2 = self._create_request(self.manager_user_company2)
        
        viewset2 = MockViewSet()
        viewset2.request = request2
        viewset2.set_queryset(MockQuerySet(self.all_items))
        
        queryset2 = viewset2.get_queryset()
        
        # Verify different counts
        self.assertEqual(len(queryset1), 3, "Manager 1 should see 3 items from company1")
        self.assertEqual(len(queryset2), 2, "Manager 2 should see 2 items from company2")
        
        # Verify no overlap
        items1_ids = {item.id for item in queryset1}
        items2_ids = {item.id for item in queryset2}
        self.assertEqual(len(items1_ids & items2_ids), 0, "Managers should see different items")


class RoleBasedQuerysetFilteringPropertyTest(HypothesisTestCase):
    """
    Property-based tests for role-based queryset filtering.
    
    These tests use hypothesis to generate random data and verify that
    the filtering logic works correctly across all scenarios.
    """
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        items_per_company=st.integers(min_value=1, max_value=10)
    )
    def test_property_admin_sees_all_companies(self, company_count, items_per_company):
        """
        Property: For any number of companies and items, admin users should see
        all items from all companies.
        
        **Validates: Requirements 4.1, 5.1**
        """
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=companies[0]
        )
        
        # Create items for each company
        all_items = []
        item_id = 1
        for company in companies:
            for j in range(items_per_company):
                item = MockModel(id=item_id, company=company)
                all_items.append(item)
                item_id += 1
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = admin_user
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Admin should see all items
        expected_count = company_count * items_per_company
        self.assertEqual(
            len(queryset),
            expected_count,
            f"Admin should see all {expected_count} items from {company_count} companies"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        items_per_company=st.integers(min_value=1, max_value=10),
        user_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_manager_sees_only_own_company(self, company_count, items_per_company, user_company_index):
        """
        Property: For any number of companies and items, manager users should see
        only items from their assigned company.
        
        **Validates: Requirements 4.2, 5.2**
        """
        # Ensure user_company_index is within bounds
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
        
        # Create manager user assigned to specific company
        user_company = companies[user_company_index]
        manager_user = User.objects.create_user(
            username=f'manager_{datetime.now().timestamp()}',
            email=f'manager_{datetime.now().timestamp()}@example.com',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=user_company
        )
        
        # Create items for each company
        all_items = []
        item_id = 1
        for company in companies:
            for j in range(items_per_company):
                item = MockModel(id=item_id, company=company)
                all_items.append(item)
                item_id += 1
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = manager_user
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Manager should see only items from their company
        self.assertEqual(
            len(queryset),
            items_per_company,
            f"Manager should see only {items_per_company} items from their company"
        )
        
        # Verify all items are from manager's company
        for item in queryset:
            self.assertEqual(
                item.company,
                user_company,
                "All items should be from manager's company"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        items_per_company=st.integers(min_value=1, max_value=10),
        filter_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_admin_can_filter_by_company(self, company_count, items_per_company, filter_company_index):
        """
        Property: For any number of companies and items, admin users should be able
        to filter by company parameter and see only items from that company.
        
        **Validates: Requirements 4.5, 5.3**
        """
        # Ensure filter_company_index is within bounds
        assume(filter_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=companies[0]
        )
        
        # Create items for each company
        all_items = []
        item_id = 1
        for company in companies:
            for j in range(items_per_company):
                item = MockModel(id=item_id, company=company)
                all_items.append(item)
                item_id += 1
        
        # Create request with company filter
        filter_company = companies[filter_company_index]
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/', {'company': str(filter_company.id)})
        request = Request(wsgi_request)
        request.user = admin_user
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Admin should see only items from filtered company
        self.assertEqual(
            len(queryset),
            items_per_company,
            f"Admin should see only {items_per_company} items from filtered company"
        )
        
        # Verify all items are from filtered company
        for item in queryset:
            self.assertEqual(
                item.company,
                filter_company,
                "All items should be from filtered company"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        items_per_company=st.integers(min_value=1, max_value=10),
        user_company_index=st.integers(min_value=0, max_value=4),
        filter_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_manager_cannot_bypass_with_filter(self, company_count, items_per_company, 
                                                        user_company_index, filter_company_index):
        """
        Property: For any number of companies and items, manager users should not be
        able to bypass company restrictions using the company filter parameter.
        They should always see only their company's data.
        
        **Validates: Requirements 5.4, 5.7**
        """
        # Ensure indices are within bounds
        assume(user_company_index < company_count)
        assume(filter_company_index < company_count)
        # Ensure we're trying to filter for a different company
        assume(user_company_index != filter_company_index)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create manager user assigned to specific company
        user_company = companies[user_company_index]
        manager_user = User.objects.create_user(
            username=f'manager_{datetime.now().timestamp()}',
            email=f'manager_{datetime.now().timestamp()}@example.com',
            first_name='Manager',
            last_name='User',
            role='manager',
            company=user_company
        )
        
        # Create items for each company
        all_items = []
        item_id = 1
        for company in companies:
            for j in range(items_per_company):
                item = MockModel(id=item_id, company=company)
                all_items.append(item)
                item_id += 1
        
        # Create request with company filter for DIFFERENT company
        filter_company = companies[filter_company_index]
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/', {'company': str(filter_company.id)})
        request = Request(wsgi_request)
        request.user = manager_user
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Manager should still see only items from their company (not filtered company)
        self.assertEqual(
            len(queryset),
            items_per_company,
            f"Manager should see only {items_per_company} items from their company"
        )
        
        # Verify all items are from manager's company (not filtered company)
        for item in queryset:
            self.assertEqual(
                item.company,
                user_company,
                "All items should be from manager's company, not filtered company"
            )
            self.assertNotEqual(
                item.company,
                filter_company,
                "Items should NOT be from the filtered company"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee'])
    )
    def test_property_role_based_filtering_consistency(self, role):
        """
        Property: For any role, the filtering behavior should be consistent:
        - admin/hr always see all companies (unless filtered)
        - manager/employee always see only their company
        
        **Validates: Requirements 4.1, 4.2, 5.1, 5.2**
        """
        # Create two companies
        company1 = Company.objects.create(
            name=f'Company 1 {datetime.now().timestamp()}',
            code=f'COMP1{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        company2 = Company.objects.create(
            name=f'Company 2 {datetime.now().timestamp()}',
            code=f'COMP2{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create user with specified role
        user = User.objects.create_user(
            username=f'user_{role}_{datetime.now().timestamp()}',
            email=f'user_{role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=role,
            company=company1
        )
        
        # Create items
        items_company1 = [MockModel(id=1, company=company1), MockModel(id=2, company=company1)]
        items_company2 = [MockModel(id=3, company=company2), MockModel(id=4, company=company2)]
        all_items = items_company1 + items_company2
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = user
        
        # Create viewset and set queryset
        viewset = MockViewSet()
        viewset.request = request
        viewset.set_queryset(MockQuerySet(all_items))
        
        # Get filtered queryset
        queryset = viewset.get_queryset()
        
        # Verify based on role
        if role in ['admin', 'hr']:
            # Should see all items
            self.assertEqual(
                len(queryset),
                4,
                f"{role} should see all 4 items from both companies"
            )
        else:  # manager or employee
            # Should see only company1 items
            self.assertEqual(
                len(queryset),
                2,
                f"{role} should see only 2 items from their company"
            )
            
            # Verify all items are from company1
            for item in queryset:
                self.assertEqual(
                    item.company,
                    company1,
                    f"All items for {role} should be from their company"
                )
