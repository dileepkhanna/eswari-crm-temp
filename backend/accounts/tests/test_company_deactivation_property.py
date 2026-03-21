"""
Property-Based Tests for Company Deactivation

**Validates: Requirements 1.6, 1.7, 2.7, 3.6**

Property 2: Company Deactivation Preserves Data

For any company with associated users or business data, deactivating the company
should set is_active to false without deleting the company record or any associated
data, and attempting to delete the company should be rejected.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
from accounts.models import Company
from datetime import date, timedelta

User = get_user_model()


# Custom strategies for generating test data
@st.composite
def company_data(draw):
    """Generate random company data"""
    name = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' '
    )))
    code = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(
        whitelist_categories=('Lu', 'Nd')
    )))
    return {'name': name.strip(), 'code': code.strip()}


@st.composite
def user_data(draw, company):
    """Generate random user data for a company"""
    username = draw(st.text(min_size=3, max_size=20, alphabet=st.characters(
        whitelist_categories=('Ll', 'Nd')
    )))
    email = f"{username}@test.com"
    role = draw(st.sampled_from(['admin', 'manager', 'employee', 'hr']))
    first_name = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll')
    )))
    last_name = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll')
    )))
    
    return {
        'username': username.strip(),
        'email': email,
        'role': role,
        'first_name': first_name.strip(),
        'last_name': last_name.strip(),
        'company': company
    }


class CompanyDeactivationPropertyTest(HypothesisTestCase):
    """
    Property-based tests for company deactivation and data preservation.
    
    Tests that deactivation preserves all data and prevents deletion when
    companies have associated data.
    """
    
    def setUp(self):
        """Clean up before each test"""
        Company.objects.all().delete()
        User.objects.all().delete()
    
    @given(
        company_data=company_data(),
        num_users=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_users(self, company_data, num_users):
        """
        Property: Deactivating a company with users preserves all user records
        and maintains the user-company relationship.
        
        **Validates: Requirements 1.6, 2.7**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        # Create company
        company = Company.objects.create(**company_data)
        original_company_id = company.id
        original_company_name = company.name
        
        # Create users
        created_users = []
        for i in range(num_users):
            user_info = {
                'username': f"user_{company.code}_{i}",
                'email': f"user{i}@{company.code}.com",
                'role': 'employee',
                'first_name': f'User{i}',
                'last_name': 'Test',
                'company': company
            }
            user = User.objects.create_user(**user_info)
            created_users.append(user.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify company still exists
        company.refresh_from_db()
        self.assertEqual(company.id, original_company_id)
        self.assertEqual(company.name, original_company_name)
        self.assertFalse(company.is_active)
        
        # Verify all users still exist and maintain relationship
        for user_id in created_users:
            user = User.objects.get(id=user_id)
            self.assertEqual(user.company.id, original_company_id)
            self.assertFalse(user.company.is_active)
    
    @given(
        company_data=company_data(),
        num_users=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=5, deadline=None)
    def test_cannot_delete_company_with_users(self, company_data, num_users):
        """
        Property: Attempting to delete a company with associated users
        should raise ValidationError and preserve the company.
        
        **Validates: Requirement 1.7**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        # Create company
        company = Company.objects.create(**company_data)
        original_company_id = company.id
        
        # Create users
        for i in range(num_users):
            user_info = {
                'username': f"user_{company.code}_{i}",
                'email': f"user{i}@{company.code}.com",
                'role': 'employee',
                'first_name': f'User{i}',
                'last_name': 'Test',
                'company': company
            }
            User.objects.create_user(**user_info)
        
        # Attempt to delete should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            company.delete()
        
        # Verify error message mentions users
        error_message = str(context.exception)
        self.assertIn('Cannot delete company', error_message)
        self.assertIn('user(s)', error_message)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=original_company_id).exists())
        company.refresh_from_db()
        self.assertEqual(company.id, original_company_id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_leads(self, company_data):
        """
        Property: Deactivating a company with leads preserves all lead records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from leads.models import Lead
        except ImportError:
            self.skipTest("Leads module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create leads
        lead_ids = []
        for i in range(3):
            lead = Lead.objects.create(
                name=f'Lead {i}',
                phone=f'123456789{i}',
                company=company,
                created_by=user
            )
            lead_ids.append(lead.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all leads still exist
        for lead_id in lead_ids:
            lead = Lead.objects.get(id=lead_id)
            self.assertEqual(lead.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_customers(self, company_data):
        """
        Property: Deactivating a company with customers preserves all customer records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from customers.models import Customer
        except ImportError:
            self.skipTest("Customers module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create customers
        customer_ids = []
        for i in range(3):
            customer = Customer.objects.create(
                name=f'Customer {i}',
                phone=f'123456789{i}',
                company=company,
                created_by=user
            )
            customer_ids.append(customer.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all customers still exist
        for customer_id in customer_ids:
            customer = Customer.objects.get(id=customer_id)
            self.assertEqual(customer.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_projects(self, company_data):
        """
        Property: Deactivating a company with projects preserves all project records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from projects.models import Project
        except ImportError:
            self.skipTest("Projects module not available")
        
        # Create company
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create projects
        project_ids = []
        for i in range(3):
            project = Project.objects.create(
                name=f'Project {i}',
                description=f'Description {i}',
                company=company
            )
            project_ids.append(project.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all projects still exist
        for project_id in project_ids:
            project = Project.objects.get(id=project_id)
            self.assertEqual(project.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_tasks(self, company_data):
        """
        Property: Deactivating a company with tasks preserves all task records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from tasks.models import Task
        except ImportError:
            self.skipTest("Tasks module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create tasks
        task_ids = []
        for i in range(3):
            task = Task.objects.create(
                title=f'Task {i}',
                description=f'Description {i}',
                company=company,
                created_by=user,
                assigned_to=user
            )
            task_ids.append(task.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all tasks still exist
        for task_id in task_ids:
            task = Task.objects.get(id=task_id)
            self.assertEqual(task.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_leaves(self, company_data):
        """
        Property: Deactivating a company with leaves preserves all leave records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from leaves.models import Leave
        except ImportError:
            self.skipTest("Leaves module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create leaves
        leave_ids = []
        for i in range(3):
            leave = Leave.objects.create(
                user=user,
                leave_type='sick',
                start_date=date.today() + timedelta(days=i),
                end_date=date.today() + timedelta(days=i+1),
                reason=f'Reason {i}',
                company=company
            )
            leave_ids.append(leave.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all leaves still exist
        for leave_id in leave_ids:
            leave = Leave.objects.get(id=leave_id)
            self.assertEqual(leave.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_holidays(self, company_data):
        """
        Property: Deactivating a company with holidays preserves all holiday records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from holidays.models import Holiday
        except ImportError:
            self.skipTest("Holidays module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create holidays
        holiday_ids = []
        for i in range(3):
            holiday = Holiday.objects.create(
                name=f'Holiday {i}',
                start_date=date.today() + timedelta(days=i*7),
                end_date=date.today() + timedelta(days=i*7),
                company=company,
                created_by=user
            )
            holiday_ids.append(holiday.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all holidays still exist
        for holiday_id in holiday_ids:
            holiday = Holiday.objects.get(id=holiday_id)
            self.assertEqual(holiday.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_preserves_announcements(self, company_data):
        """
        Property: Deactivating a company with announcements preserves all announcement records.
        
        **Validates: Requirements 1.6, 3.6**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        try:
            from announcements.models import Announcement
        except ImportError:
            self.skipTest("Announcements module not available")
        
        # Create company and user
        company = Company.objects.create(**company_data)
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create announcements
        announcement_ids = []
        for i in range(3):
            announcement = Announcement.objects.create(
                title=f'Announcement {i}',
                message=f'Message {i}',
                company=company,
                created_by=user
            )
            announcement_ids.append(announcement.id)
        
        # Deactivate company
        company.is_active = False
        company.save()
        
        # Verify all announcements still exist
        for announcement_id in announcement_ids:
            announcement = Announcement.objects.get(id=announcement_id)
            self.assertEqual(announcement.company.id, company.id)
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_cannot_delete_company_with_mixed_data(self, company_data):
        """
        Property: Attempting to delete a company with any combination of
        associated data should raise ValidationError.
        
        **Validates: Requirement 1.7**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        # Create company and user
        company = Company.objects.create(**company_data)
        original_company_id = company.id
        user = User.objects.create_user(
            username=f"user_{company.code}",
            email=f"user@{company.code}.com",
            role='admin',
            first_name='Admin',
            last_name='User',
            company=company
        )
        
        # Create various types of data
        data_created = []
        
        # Try to create leads
        try:
            from leads.models import Lead
            Lead.objects.create(
                name='Test Lead',
                phone='1234567890',
                company=company,
                created_by=user
            )
            data_created.append('leads')
        except ImportError:
            pass
        
        # Try to create customers
        try:
            from customers.models import Customer
            Customer.objects.create(
                name='Test Customer',
                phone='1234567890',
                company=company,
                created_by=user
            )
            data_created.append('customers')
        except ImportError:
            pass
        
        # Try to create projects
        try:
            from projects.models import Project
            Project.objects.create(
                name='Test Project',
                description='Test Description',
                company=company
            )
            data_created.append('projects')
        except ImportError:
            pass
        
        # Attempt to delete should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            company.delete()
        
        # Verify error message
        error_message = str(context.exception)
        self.assertIn('Cannot delete company', error_message)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=original_company_id).exists())
    
    @given(
        company_data=company_data()
    )
    @settings(max_examples=5, deadline=None)
    def test_can_delete_empty_company(self, company_data):
        """
        Property: A company with no associated data can be deleted successfully.
        
        **Validates: Requirement 1.7**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        # Create company with no associated data
        company = Company.objects.create(**company_data)
        company_id = company.id
        
        # Delete should succeed
        company.delete()
        
        # Verify company was deleted
        self.assertFalse(Company.objects.filter(id=company_id).exists())
    
    @given(
        company_data=company_data(),
        num_users=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=5, deadline=None)
    def test_deactivation_is_reversible(self, company_data, num_users):
        """
        Property: Deactivating and then reactivating a company preserves
        all data and relationships.
        
        **Validates: Requirements 1.6, 2.7**
        """
        # Skip if company data is invalid
        assume(len(company_data['name']) > 0 and len(company_data['code']) > 0)
        
        # Create company and users
        company = Company.objects.create(**company_data)
        user_ids = []
        for i in range(num_users):
            user = User.objects.create_user(
                username=f"user_{company.code}_{i}",
                email=f"user{i}@{company.code}.com",
                role='employee',
                first_name=f'User{i}',
                last_name='Test',
                company=company
            )
            user_ids.append(user.id)
        
        # Deactivate
        company.is_active = False
        company.save()
        
        # Reactivate
        company.is_active = True
        company.save()
        
        # Verify company is active
        company.refresh_from_db()
        self.assertTrue(company.is_active)
        
        # Verify all users still exist and maintain relationship
        for user_id in user_ids:
            user = User.objects.get(id=user_id)
            self.assertEqual(user.company.id, company.id)
            self.assertTrue(user.company.is_active)
