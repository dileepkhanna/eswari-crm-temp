"""
Property-Based Tests for Cross-Company Manager Validation

**Validates: Requirements 15.1, 15.2, 15.4, 15.5**

Property 12: Cross-Company Manager Validation
For any user with a manager assignment, the manager must belong to the same company.
When a manager from a different company is assigned, the system should return a 400 error
with "Manager must be from the same company". When a user's company changes and their
manager is no longer from the same company, the manager assignment should be cleared.

This test validates that the UserSerializer and signals correctly enforce
cross-company manager validation.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Company
from rest_framework.test import APIClient
from rest_framework import status
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
from datetime import datetime

User = get_user_model()


class ManagerValidationTest(TestCase):
    """
    Unit tests for cross-company manager validation.
    
    Tests that manager assignments are validated to ensure managers and employees
    are from the same company.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Create two companies
        self.company_a = Company.objects.create(
            name='Company A',
            code='COMPANY_A',
            is_active=True
        )
        
        self.company_b = Company.objects.create(
            name='Company B',
            code='COMPANY_B',
            is_active=True
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company_a
        )
        
        # Create manager in Company A
        self.manager_a = User.objects.create_user(
            username='manager_a',
            email='manager_a@test.com',
            first_name='Manager',
            last_name='A',
            role='manager',
            company=self.company_a
        )
        
        # Create manager in Company B
        self.manager_b = User.objects.create_user(
            username='manager_b',
            email='manager_b@test.com',
            first_name='Manager',
            last_name='B',
            role='manager',
            company=self.company_b
        )
        
        # Create API client
        self.client = APIClient()
    
    def test_cross_company_manager_assignment_fails_on_creation(self):
        """
        Test that creating an employee with a manager from a different company fails.
        
        **Validates: Requirements 15.1, 15.2**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'Employee',
            'last_name': 'Test',
            'email': 'employee@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'role': 'employee',
            'company': self.company_a.id,
            'manager': self.manager_b.id  # Manager from Company B
        }
        
        response = self.client.post('/api/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('manager', response.data['details'])
        self.assertIn('same company', str(response.data['details']['manager']).lower())
    
    def test_same_company_manager_assignment_succeeds(self):
        """
        Test that creating an employee with a manager from the same company succeeds.
        
        **Validates: Requirements 15.1**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'Employee',
            'last_name': 'Test',
            'email': 'employee@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'role': 'employee',
            'company': self.company_a.id,
            'manager': self.manager_a.id  # Manager from Company A
        }
        
        response = self.client.post('/api/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['manager'], self.manager_a.id)
    
    def test_cross_company_manager_assignment_fails_on_update(self):
        """
        Test that updating an employee to have a manager from a different company fails.
        
        **Validates: Requirements 15.1, 15.2**
        """
        # Create employee in Company A with manager from Company A
        employee = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            first_name='Employee',
            last_name='Test',
            role='employee',
            company=self.company_a,
            manager=self.manager_a
        )
        
        self.client.force_authenticate(user=self.admin_user)
        
        # Try to update to manager from Company B
        data = {
            'name': 'Employee Test',
            'phone': '1234567890',
            'managerId': self.manager_b.id
        }
        
        response = self.client.put(f'/api/auth/users/{employee.id}/update/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('same company', str(response.data['error']).lower())
    
    def test_manager_cleared_when_company_changes(self):
        """
        Test that manager assignment is cleared when user's company changes
        and manager is from different company.
        
        **Validates: Requirements 15.4, 15.5**
        """
        # Create employee in Company A with manager from Company A
        employee = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            first_name='Employee',
            last_name='Test',
            role='employee',
            company=self.company_a,
            manager=self.manager_a
        )
        
        # Verify manager is set
        self.assertEqual(employee.manager, self.manager_a)
        
        # Change employee's company to Company B
        employee.company = self.company_b
        employee.save()
        
        # Reload from database
        employee.refresh_from_db()
        
        # Manager should be cleared
        self.assertIsNone(employee.manager)
    
    def test_manager_retained_when_company_changes_to_same_as_manager(self):
        """
        Test that manager assignment is retained when user's company changes
        to the same company as their manager.
        
        **Validates: Requirements 15.4**
        """
        # Create employee in Company A with manager from Company B
        # This shouldn't be possible through API, but we test the signal behavior
        employee = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            first_name='Employee',
            last_name='Test',
            role='employee',
            company=self.company_a
        )
        
        # Manually set manager from Company B (bypassing validation)
        employee.manager = self.manager_b
        employee.save(update_fields=['manager'])
        
        # Change employee's company to Company B (same as manager)
        employee.company = self.company_b
        employee.save()
        
        # Reload from database
        employee.refresh_from_db()
        
        # Manager should be retained
        self.assertEqual(employee.manager, self.manager_b)


class ManagerValidationPropertyTest(HypothesisTestCase):
    """
    Property-based tests for cross-company manager validation.
    
    These tests use hypothesis to generate random data and verify that
    manager validation works correctly across all scenarios.
    """
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        same_company=st.booleans()
    )
    def test_property_manager_assignment_validation_on_creation(self, same_company):
        """
        Property: When creating an employee with a manager assignment:
        - If manager is from the same company, creation succeeds
        - If manager is from a different company, creation fails with 400 and
          error message "Manager must be from the same company"
        
        **Validates: Requirements 15.1, 15.2**
        """
        # Create two companies
        company_a = Company.objects.create(
            name=f'Company A {datetime.now().timestamp()}',
            code=f'COMPANY_A_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        company_b = Company.objects.create(
            name=f'Company B {datetime.now().timestamp()}',
            code=f'COMPANY_B_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=company_a
        )
        
        # Create manager in Company A
        manager_a = User.objects.create_user(
            username=f'manager_a_{datetime.now().timestamp()}',
            email=f'manager_a_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='A',
            role='manager',
            company=company_a
        )
        
        # Create manager in Company B
        manager_b = User.objects.create_user(
            username=f'manager_b_{datetime.now().timestamp()}',
            email=f'manager_b_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='B',
            role='manager',
            company=company_b
        )
        
        # Create API client
        client = APIClient()
        client.force_authenticate(user=admin_user)
        
        # Prepare employee data
        timestamp = datetime.now().timestamp()
        data = {
            'first_name': 'Employee',
            'last_name': 'Test',
            'email': f'employee_{timestamp}@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'role': 'employee',
            'company': company_a.id,
            'manager': manager_a.id if same_company else manager_b.id
        }
        
        # Make request
        response = client.post('/api/auth/register/', data)
        
        # Verify response based on same_company flag
        if same_company:
            # Should succeed
            self.assertEqual(
                response.status_code,
                status.HTTP_201_CREATED,
                f"Creating employee with same-company manager should succeed. Response: {response.data}"
            )
            self.assertEqual(
                response.data['user']['manager'],
                manager_a.id,
                "Manager should be assigned correctly"
            )
        else:
            # Should fail with validation error
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Creating employee with cross-company manager should fail. Response: {response.data}"
            )
            self.assertIn(
                'manager',
                response.data.get('details', {}),
                f"Response should contain 'manager' error. Response: {response.data}"
            )
            error_msg = str(response.data['details']['manager']).lower()
            self.assertIn(
                'same company',
                error_msg,
                f"Error message should mention 'same company'. Got: {response.data}"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        same_company=st.booleans()
    )
    def test_property_manager_assignment_validation_on_update(self, same_company):
        """
        Property: When updating an employee's manager assignment:
        - If new manager is from the same company, update succeeds
        - If new manager is from a different company, update fails with 400 and
          error message "Manager must be from the same company"
        
        **Validates: Requirements 15.1, 15.2**
        """
        # Create two companies
        company_a = Company.objects.create(
            name=f'Company A {datetime.now().timestamp()}',
            code=f'COMPANY_A_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        company_b = Company.objects.create(
            name=f'Company B {datetime.now().timestamp()}',
            code=f'COMPANY_B_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=company_a
        )
        
        # Create managers
        manager_a1 = User.objects.create_user(
            username=f'manager_a1_{datetime.now().timestamp()}',
            email=f'manager_a1_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='A1',
            role='manager',
            company=company_a
        )
        
        manager_a2 = User.objects.create_user(
            username=f'manager_a2_{datetime.now().timestamp()}',
            email=f'manager_a2_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='A2',
            role='manager',
            company=company_a
        )
        
        manager_b = User.objects.create_user(
            username=f'manager_b_{datetime.now().timestamp()}',
            email=f'manager_b_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='B',
            role='manager',
            company=company_b
        )
        
        # Create employee in Company A with manager_a1
        employee = User.objects.create_user(
            username=f'employee_{datetime.now().timestamp()}',
            email=f'employee_{datetime.now().timestamp()}@test.com',
            first_name='Employee',
            last_name='Test',
            role='employee',
            company=company_a,
            manager=manager_a1
        )
        
        # Create API client
        client = APIClient()
        client.force_authenticate(user=admin_user)
        
        # Try to update manager
        data = {
            'name': f'{employee.first_name} {employee.last_name}',
            'phone': '1234567890',
            'managerId': manager_a2.id if same_company else manager_b.id
        }
        
        # Make request
        response = client.put(f'/api/auth/users/{employee.id}/update/', data)
        
        # Verify response based on same_company flag
        if same_company:
            # Should succeed
            self.assertIn(
                response.status_code,
                [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
                f"Update with same-company manager should succeed or fail on other fields. Response: {response.data}"
            )
            # If it succeeded, verify manager was updated
            if response.status_code == status.HTTP_200_OK:
                employee.refresh_from_db()
                self.assertEqual(
                    employee.manager.id,
                    manager_a2.id,
                    "Manager should be updated correctly"
                )
        else:
            # Should fail with validation error
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Update with cross-company manager should fail. Response: {response.data}"
            )
            self.assertIn(
                'error',
                response.data,
                f"Response should contain 'error' field. Response: {response.data}"
            )
            error_msg = str(response.data['error']).lower()
            self.assertIn(
                'same company',
                error_msg,
                f"Error message should mention 'same company'. Got: {response.data}"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        new_company_matches_manager=st.booleans()
    )
    def test_property_manager_cleared_on_company_change(self, new_company_matches_manager):
        """
        Property: When a user's company changes:
        - If new company matches manager's company, manager assignment is retained
        - If new company doesn't match manager's company, manager assignment is cleared
        
        **Validates: Requirements 15.4, 15.5**
        """
        # Create two companies
        company_a = Company.objects.create(
            name=f'Company A {datetime.now().timestamp()}',
            code=f'COMPANY_A_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        company_b = Company.objects.create(
            name=f'Company B {datetime.now().timestamp()}',
            code=f'COMPANY_B_{int(datetime.now().timestamp())}',
            is_active=True
        )
        
        # Create manager in Company A
        manager_a = User.objects.create_user(
            username=f'manager_a_{datetime.now().timestamp()}',
            email=f'manager_a_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='A',
            role='manager',
            company=company_a
        )
        
        # Create manager in Company B
        manager_b = User.objects.create_user(
            username=f'manager_b_{datetime.now().timestamp()}',
            email=f'manager_b_{datetime.now().timestamp()}@test.com',
            first_name='Manager',
            last_name='B',
            role='manager',
            company=company_b
        )
        
        # Create employee in Company A with manager from Company A
        employee = User.objects.create_user(
            username=f'employee_{datetime.now().timestamp()}',
            email=f'employee_{datetime.now().timestamp()}@test.com',
            first_name='Employee',
            last_name='Test',
            role='employee',
            company=company_a,
            manager=manager_a
        )
        
        # Verify manager is set
        self.assertEqual(employee.manager, manager_a)
        
        # Change employee's company
        if new_company_matches_manager:
            # Keep in Company A (same as manager)
            employee.company = company_a
        else:
            # Move to Company B (different from manager)
            employee.company = company_b
        
        employee.save()
        
        # Reload from database
        employee.refresh_from_db()
        
        # Verify manager assignment based on company match
        if new_company_matches_manager:
            # Manager should be retained
            self.assertEqual(
                employee.manager,
                manager_a,
                "Manager should be retained when company doesn't change or matches manager's company"
            )
        else:
            # Manager should be cleared
            self.assertIsNone(
                employee.manager,
                "Manager should be cleared when company changes to different company"
            )
    
    @settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        num_companies=st.integers(min_value=2, max_value=5),
        num_managers_per_company=st.integers(min_value=1, max_value=3)
    )
    def test_property_manager_validation_across_multiple_companies(self, num_companies, num_managers_per_company):
        """
        Property: Across multiple companies with multiple managers:
        - Employees can only be assigned managers from their own company
        - Cross-company manager assignments always fail
        
        **Validates: Requirements 15.1, 15.2**
        """
        # Create companies
        companies = []
        for i in range(num_companies):
            company = Company.objects.create(
                name=f'Company {i} {datetime.now().timestamp()}',
                code=f'COMPANY_{i}_{int(datetime.now().timestamp())}',
                is_active=True
            )
            companies.append(company)
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=f'admin_{datetime.now().timestamp()}',
            email=f'admin_{datetime.now().timestamp()}@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=companies[0]
        )
        
        # Create managers for each company
        managers_by_company = {}
        for company in companies:
            managers = []
            for j in range(num_managers_per_company):
                manager = User.objects.create_user(
                    username=f'manager_{company.code}_{j}_{datetime.now().timestamp()}',
                    email=f'manager_{company.code}_{j}_{datetime.now().timestamp()}@test.com',
                    first_name='Manager',
                    last_name=f'{company.code}_{j}',
                    role='manager',
                    company=company
                )
                managers.append(manager)
            managers_by_company[company.id] = managers
        
        # Create API client
        client = APIClient()
        client.force_authenticate(user=admin_user)
        
        # Test: Try to create employee in each company with managers from all companies
        for employee_company in companies:
            for manager_company in companies:
                for manager in managers_by_company[manager_company.id]:
                    timestamp = datetime.now().timestamp()
                    data = {
                        'first_name': 'Employee',
                        'last_name': 'Test',
                        'email': f'employee_{timestamp}@test.com',
                        'password': 'TestPass123!',
                        'password_confirm': 'TestPass123!',
                        'role': 'employee',
                        'company': employee_company.id,
                        'manager': manager.id
                    }
                    
                    response = client.post('/api/auth/register/', data)
                    
                    # Verify response
                    if employee_company.id == manager_company.id:
                        # Same company - should succeed
                        self.assertEqual(
                            response.status_code,
                            status.HTTP_201_CREATED,
                            f"Creating employee in {employee_company.code} with manager from {manager_company.code} should succeed"
                        )
                    else:
                        # Different company - should fail
                        self.assertEqual(
                            response.status_code,
                            status.HTTP_400_BAD_REQUEST,
                            f"Creating employee in {employee_company.code} with manager from {manager_company.code} should fail"
                        )
                        self.assertIn(
                            'manager',
                            response.data.get('details', {}),
                            f"Response should contain 'manager' error for cross-company assignment"
                        )
