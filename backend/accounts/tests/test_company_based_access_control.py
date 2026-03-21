"""
Property-Based Tests for Company-Based Access Control

**Validates: Requirements 4.3, 4.4, 12.3**

Property 6: Company-Based Access Control
For any user attempting to access an object with a company attribute:
- Admin and HR users can access objects from any company (returns True)
- Manager and Employee users can only access objects from their own company
- Manager and Employee users attempting to access another company's objects get 403 Forbidden (returns False)

This test validates that the CompanyAccessPermission class correctly enforces
company-based access control at the object level.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Company
from accounts.permissions import CompanyAccessPermission
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
from datetime import datetime

User = get_user_model()


class MockObject:
    """Mock object with company attribute for testing"""
    
    def __init__(self, company, company_id=None):
        self.company = company
        self.company_id = company_id if company_id is not None else company.id


class MockView:
    """Mock view for testing permissions"""
    pass


class CompanyBasedAccessControlTest(TestCase):
    """
    Unit tests for company-based access control.
    
    Tests that CompanyAccessPermission correctly enforces access control
    based on user role and company assignments.
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
        
        self.manager_company1 = User.objects.create_user(
            username='manager_c1',
            email='manager1@example.com',
            first_name='Manager',
            last_name='One',
            role='manager',
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
        
        self.employee_company1 = User.objects.create_user(
            username='employee_c1',
            email='employee1@example.com',
            first_name='Employee',
            last_name='One',
            role='employee',
            company=self.company1
        )
        
        self.employee_company2 = User.objects.create_user(
            username='employee_c2',
            email='employee2@example.com',
            first_name='Employee',
            last_name='Two',
            role='employee',
            company=self.company2
        )
        
        # Create permission instance
        self.permission = CompanyAccessPermission()
        
        # Create mock view
        self.view = MockView()
        
        # Create API request factory
        self.factory = APIRequestFactory()
    
    def _create_request(self, user):
        """Helper method to create a DRF Request with user"""
        wsgi_request = self.factory.get('/test/')
        request = Request(wsgi_request)
        request.user = user
        return request
    
    def test_admin_can_access_any_company_object(self):
        """
        Test that admin users can access objects from any company.
        
        **Validates: Requirement 4.3**
        """
        # Create objects from both companies
        obj_company1 = MockObject(self.company1)
        obj_company2 = MockObject(self.company2)
        
        # Create request
        request = self._create_request(self.admin_user)
        
        # Admin should have access to both companies
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company1),
            "Admin should have access to company1 object"
        )
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company2),
            "Admin should have access to company2 object"
        )
    
    def test_hr_can_access_any_company_object(self):
        """
        Test that HR users can access objects from any company.
        
        **Validates: Requirement 4.3**
        """
        # Create objects from both companies
        obj_company1 = MockObject(self.company1)
        obj_company2 = MockObject(self.company2)
        
        # Create request
        request = self._create_request(self.hr_user)
        
        # HR should have access to both companies
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company1),
            "HR should have access to company1 object"
        )
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company2),
            "HR should have access to company2 object"
        )
    
    def test_manager_can_access_own_company_object(self):
        """
        Test that manager users can access objects from their own company.
        
        **Validates: Requirement 4.4**
        """
        # Create object from manager's company
        obj_company1 = MockObject(self.company1)
        
        # Create request
        request = self._create_request(self.manager_company1)
        
        # Manager should have access to their company's object
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company1),
            "Manager should have access to their company's object"
        )
    
    def test_manager_cannot_access_other_company_object(self):
        """
        Test that manager users cannot access objects from other companies (returns False for 403).
        
        **Validates: Requirements 4.4, 12.3**
        """
        # Create object from different company
        obj_company2 = MockObject(self.company2)
        
        # Create request
        request = self._create_request(self.manager_company1)
        
        # Manager should NOT have access to other company's object
        self.assertFalse(
            self.permission.has_object_permission(request, self.view, obj_company2),
            "Manager should NOT have access to other company's object (403 Forbidden)"
        )
    
    def test_employee_can_access_own_company_object(self):
        """
        Test that employee users can access objects from their own company.
        
        **Validates: Requirement 4.4**
        """
        # Create object from employee's company
        obj_company1 = MockObject(self.company1)
        
        # Create request
        request = self._create_request(self.employee_company1)
        
        # Employee should have access to their company's object
        self.assertTrue(
            self.permission.has_object_permission(request, self.view, obj_company1),
            "Employee should have access to their company's object"
        )
    
    def test_employee_cannot_access_other_company_object(self):
        """
        Test that employee users cannot access objects from other companies (returns False for 403).
        
        **Validates: Requirements 4.4, 12.3**
        """
        # Create object from different company
        obj_company2 = MockObject(self.company2)
        
        # Create request
        request = self._create_request(self.employee_company1)
        
        # Employee should NOT have access to other company's object
        self.assertFalse(
            self.permission.has_object_permission(request, self.view, obj_company2),
            "Employee should NOT have access to other company's object (403 Forbidden)"
        )
    
    def test_permission_allows_objects_without_company_attribute(self):
        """
        Test that objects without company attribute are accessible to all users.
        
        **Validates: Requirement 4.4**
        """
        # Create object without company attribute
        class ObjectWithoutCompany:
            pass
        
        obj = ObjectWithoutCompany()
        
        # Test with different roles
        for user in [self.admin_user, self.hr_user, self.manager_company1, self.employee_company1]:
            request = self._create_request(user)
            self.assertTrue(
                self.permission.has_object_permission(request, self.view, obj),
                f"{user.role} should have access to object without company attribute"
            )
    
    def test_cross_company_access_denied_for_all_restricted_roles(self):
        """
        Test that all restricted roles (manager, employee) are denied cross-company access.
        
        **Validates: Requirements 4.4, 12.3**
        """
        # Create object from company2
        obj_company2 = MockObject(self.company2)
        
        # Test manager from company1
        request_manager = self._create_request(self.manager_company1)
        self.assertFalse(
            self.permission.has_object_permission(request_manager, self.view, obj_company2),
            "Manager from company1 should NOT access company2 object"
        )
        
        # Test employee from company1
        request_employee = self._create_request(self.employee_company1)
        self.assertFalse(
            self.permission.has_object_permission(request_employee, self.view, obj_company2),
            "Employee from company1 should NOT access company2 object"
        )


class CompanyBasedAccessControlPropertyTest(HypothesisTestCase):
    """
    Property-based tests for company-based access control.
    
    These tests use hypothesis to generate random data and verify that
    the access control logic works correctly across all scenarios.
    """
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        role=st.sampled_from(['admin', 'hr', 'manager', 'employee']),
        same_company=st.booleans()
    )
    def test_property_access_control_by_role_and_company(self, role, same_company):
        """
        Property: For any role and company combination:
        - admin/hr can access any company's objects (always returns True)
        - manager/employee can access their own company's objects (returns True)
        - manager/employee cannot access other company's objects (returns False for 403)
        
        **Validates: Requirements 4.3, 4.4, 12.3**
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
        
        # Create user with specified role in company1
        user = User.objects.create_user(
            username=f'user_{role}_{datetime.now().timestamp()}',
            email=f'user_{role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=role,
            company=company1
        )
        
        # Create object from same or different company
        obj_company = company1 if same_company else company2
        obj = MockObject(obj_company)
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = user
        
        # Create permission and view
        permission = CompanyAccessPermission()
        view = MockView()
        
        # Check permission
        has_permission = permission.has_object_permission(request, view, obj)
        
        # Verify based on role and company
        if role in ['admin', 'hr']:
            # Admin and HR should always have access
            self.assertTrue(
                has_permission,
                f"{role} should have access to any company's object"
            )
        else:  # manager or employee
            if same_company:
                # Should have access to own company
                self.assertTrue(
                    has_permission,
                    f"{role} should have access to their own company's object"
                )
            else:
                # Should NOT have access to other company (403)
                self.assertFalse(
                    has_permission,
                    f"{role} should NOT have access to other company's object (403 Forbidden)"
                )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        user_company_index=st.integers(min_value=0, max_value=4),
        object_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_manager_cross_company_access_always_denied(self, company_count, 
                                                                  user_company_index, 
                                                                  object_company_index):
        """
        Property: For any number of companies, managers can only access objects
        from their own company. Cross-company access is always denied (returns False).
        
        **Validates: Requirements 4.4, 12.3**
        """
        # Ensure indices are within bounds
        assume(user_company_index < company_count)
        assume(object_company_index < company_count)
        
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
        
        # Create object in specific company
        obj_company = companies[object_company_index]
        obj = MockObject(obj_company)
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = manager
        
        # Create permission and view
        permission = CompanyAccessPermission()
        view = MockView()
        
        # Check permission
        has_permission = permission.has_object_permission(request, view, obj)
        
        # Verify based on company match
        if user_company_index == object_company_index:
            # Same company - should have access
            self.assertTrue(
                has_permission,
                "Manager should have access to their own company's object"
            )
        else:
            # Different company - should NOT have access (403)
            self.assertFalse(
                has_permission,
                "Manager should NOT have access to other company's object (403 Forbidden)"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        user_company_index=st.integers(min_value=0, max_value=4),
        object_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_employee_cross_company_access_always_denied(self, company_count, 
                                                                   user_company_index, 
                                                                   object_company_index):
        """
        Property: For any number of companies, employees can only access objects
        from their own company. Cross-company access is always denied (returns False).
        
        **Validates: Requirements 4.4, 12.3**
        """
        # Ensure indices are within bounds
        assume(user_company_index < company_count)
        assume(object_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create employee in specific company
        user_company = companies[user_company_index]
        employee = User.objects.create_user(
            username=f'employee_{datetime.now().timestamp()}',
            email=f'employee_{datetime.now().timestamp()}@example.com',
            first_name='Employee',
            last_name='User',
            role='employee',
            company=user_company
        )
        
        # Create object in specific company
        obj_company = companies[object_company_index]
        obj = MockObject(obj_company)
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = employee
        
        # Create permission and view
        permission = CompanyAccessPermission()
        view = MockView()
        
        # Check permission
        has_permission = permission.has_object_permission(request, view, obj)
        
        # Verify based on company match
        if user_company_index == object_company_index:
            # Same company - should have access
            self.assertTrue(
                has_permission,
                "Employee should have access to their own company's object"
            )
        else:
            # Different company - should NOT have access (403)
            self.assertFalse(
                has_permission,
                "Employee should NOT have access to other company's object (403 Forbidden)"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        object_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_admin_always_has_access(self, company_count, object_company_index):
        """
        Property: For any number of companies, admin users always have access
        to objects from any company (always returns True).
        
        **Validates: Requirement 4.3**
        """
        # Ensure index is within bounds
        assume(object_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create admin in first company
        admin = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=companies[0]
        )
        
        # Create object in specific company
        obj_company = companies[object_company_index]
        obj = MockObject(obj_company)
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = admin
        
        # Create permission and view
        permission = CompanyAccessPermission()
        view = MockView()
        
        # Check permission
        has_permission = permission.has_object_permission(request, view, obj)
        
        # Admin should always have access
        self.assertTrue(
            has_permission,
            f"Admin should have access to object from any company (company {object_company_index})"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        company_count=st.integers(min_value=2, max_value=5),
        object_company_index=st.integers(min_value=0, max_value=4)
    )
    def test_property_hr_always_has_access(self, company_count, object_company_index):
        """
        Property: For any number of companies, HR users always have access
        to objects from any company (always returns True).
        
        **Validates: Requirement 4.3**
        """
        # Ensure index is within bounds
        assume(object_company_index < company_count)
        
        # Create companies
        companies = []
        for i in range(company_count):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMP{i}{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create HR in first company
        hr = User.objects.create_user(
            username=f'hr_{datetime.now().timestamp()}',
            email=f'hr_{datetime.now().timestamp()}@example.com',
            first_name='HR',
            last_name='User',
            role='hr',
            company=companies[0]
        )
        
        # Create object in specific company
        obj_company = companies[object_company_index]
        obj = MockObject(obj_company)
        
        # Create request
        factory = APIRequestFactory()
        wsgi_request = factory.get('/test/')
        request = Request(wsgi_request)
        request.user = hr
        
        # Create permission and view
        permission = CompanyAccessPermission()
        view = MockView()
        
        # Check permission
        has_permission = permission.has_object_permission(request, view, obj)
        
        # HR should always have access
        self.assertTrue(
            has_permission,
            f"HR should have access to object from any company (company {object_company_index})"
        )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        restricted_role=st.sampled_from(['manager', 'employee']),
        company_count=st.integers(min_value=2, max_value=4)
    )
    def test_property_restricted_roles_403_on_cross_company(self, restricted_role, company_count):
        """
        Property: For any restricted role (manager, employee) and any number of companies,
        attempting to access an object from a different company always returns False (403).
        
        **Validates: Requirements 4.4, 12.3**
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
        
        # Create user in first company
        user = User.objects.create_user(
            username=f'{restricted_role}_{datetime.now().timestamp()}',
            email=f'{restricted_role}_{datetime.now().timestamp()}@example.com',
            first_name='Test',
            last_name='User',
            role=restricted_role,
            company=companies[0]
        )
        
        # Test access to all other companies (should all be denied)
        factory = APIRequestFactory()
        permission = CompanyAccessPermission()
        view = MockView()
        
        for i in range(1, company_count):
            obj = MockObject(companies[i])
            
            wsgi_request = factory.get('/test/')
            request = Request(wsgi_request)
            request.user = user
            
            has_permission = permission.has_object_permission(request, view, obj)
            
            # Should NOT have access (403)
            self.assertFalse(
                has_permission,
                f"{restricted_role} should NOT have access to company {i} object (403 Forbidden)"
            )
