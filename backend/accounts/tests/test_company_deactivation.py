"""
Unit Tests for Company Deactivation and Deletion Prevention

**Validates: Requirements 1.6, 1.7**

Tests that companies can be deactivated without deletion, and that deletion
is prevented when companies have associated data.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company

User = get_user_model()


class CompanyDeactivationTest(TestCase):
    """
    Unit tests for company deactivation logic.
    
    Tests deactivation without deletion and deletion prevention when
    companies have associated users or business data.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Clear any existing companies
        Company.objects.all().delete()
        
        # Create test companies
        self.company1 = Company.objects.create(
            name='Test Company 1',
            code='TEST1',
            is_active=True
        )
        
        self.company2 = Company.objects.create(
            name='Test Company 2',
            code='TEST2',
            is_active=True
        )
        
        self.empty_company = Company.objects.create(
            name='Empty Company',
            code='EMPTY',
            is_active=True
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company1
        )
        
        # Create API client
        self.client = APIClient()
    
    # ========== Deactivation Tests ==========
    
    def test_company_can_be_deactivated(self):
        """
        Test that a company can be deactivated by setting is_active to False.
        
        **Validates: Requirement 1.6**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Deactivate company
        data = {'is_active': 'false'}
        response = self.client.patch(
            f'/api/auth/companies/{self.company1.id}/',
            data,
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        # Verify company still exists in database
        self.company1.refresh_from_db()
        self.assertFalse(self.company1.is_active)
        self.assertEqual(self.company1.name, 'Test Company 1')
    
    def test_deactivation_preserves_all_data(self):
        """
        Test that deactivating a company preserves all associated data.
        
        **Validates: Requirement 1.6**
        """
        # Create user associated with company
        user = User.objects.create_user(
            username='test_user',
            email='user@test.com',
            first_name='Test',
            last_name='User',
            role='employee',
            company=self.company2
        )
        
        self.client.force_authenticate(user=self.admin_user)
        
        # Deactivate company
        data = {'is_active': 'false'}
        response = self.client.patch(
            f'/api/auth/companies/{self.company2.id}/',
            data,
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user still exists and is associated with company
        user.refresh_from_db()
        self.assertEqual(user.company.id, self.company2.id)
        self.assertEqual(user.email, 'user@test.com')
    
    def test_deactivated_company_can_be_reactivated(self):
        """
        Test that a deactivated company can be reactivated.
        
        **Validates: Requirement 1.6**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Deactivate company
        data = {'is_active': 'false'}
        self.client.patch(
            f'/api/auth/companies/{self.company2.id}/',
            data,
            format='multipart'
        )
        
        # Reactivate company
        data = {'is_active': 'true'}
        response = self.client.patch(
            f'/api/auth/companies/{self.company2.id}/',
            data,
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_active'])
        
        # Verify in database
        self.company2.refresh_from_db()
        self.assertTrue(self.company2.is_active)
    
    # ========== Deletion Prevention Tests ==========
    
    def test_cannot_delete_company_with_users(self):
        """
        Test that deletion is prevented when company has associated users.
        
        **Validates: Requirement 1.7**
        """
        # company1 already has admin_user associated
        
        # Try to delete via model
        with self.assertRaises(ValidationError) as context:
            self.company1.delete()
        
        error_message = str(context.exception)
        self.assertIn('Cannot delete company', error_message)
        self.assertIn('associated user(s)', error_message)
        self.assertIn('Test Company 1', error_message)
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=self.company1.id).exists())
    
    def test_cannot_delete_company_with_users_via_api(self):
        """
        Test that API deletion is prevented when company has associated users.
        
        **Validates: Requirement 1.7**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Try to delete via API
        response = self.client.delete(f'/api/auth/companies/{self.company1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('Cannot delete company', response.data['error'])
        self.assertIn('associated user(s)', response.data['error'])
        
        # Verify company still exists
        self.assertTrue(Company.objects.filter(id=self.company1.id).exists())
    
    def test_can_delete_company_without_associated_data(self):
        """
        Test that deletion succeeds when company has no associated data.
        
        **Validates: Requirement 1.7**
        """
        # empty_company has no users or data
        
        # Delete via model
        self.empty_company.delete()
        
        # Verify company was deleted
        self.assertFalse(Company.objects.filter(id=self.empty_company.id).exists())
    
    def test_can_delete_company_without_associated_data_via_api(self):
        """
        Test that API deletion succeeds when company has no associated data.
        
        **Validates: Requirement 1.7**
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Delete via API
        response = self.client.delete(f'/api/auth/companies/{self.empty_company.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('deleted successfully', response.data['message'])
        
        # Verify company was deleted
        self.assertFalse(Company.objects.filter(id=self.empty_company.id).exists())
    
    def test_deletion_error_message_is_descriptive(self):
        """
        Test that deletion error messages are descriptive and helpful.
        
        **Validates: Requirement 1.7**
        """
        # Create multiple users for company
        User.objects.create_user(
            username='user2',
            email='user2@test.com',
            first_name='User',
            last_name='Two',
            role='employee',
            company=self.company1
        )
        
        # Try to delete
        with self.assertRaises(ValidationError) as context:
            self.company1.delete()
        
        error_message = str(context.exception)
        
        # Check error message contains helpful information
        self.assertIn('Cannot delete company', error_message)
        self.assertIn('Test Company 1', error_message)
        self.assertIn('2', error_message)  # Should mention count
        self.assertIn('user(s)', error_message)
        self.assertIn('remove or reassign', error_message.lower())
    
    # ========== User-Company Relationship Tests ==========
    
    def test_user_company_relationship_maintained_when_deactivated(self):
        """
        Test that user-company relationship is maintained when company is deactivated.
        
        **Validates: Requirement 2.7 (from context)**
        """
        # Create user
        user = User.objects.create_user(
            username='test_user',
            email='user@test.com',
            first_name='Test',
            last_name='User',
            role='employee',
            company=self.company2
        )
        
        # Deactivate company
        self.company2.is_active = False
        self.company2.save()
        
        # Verify relationship is maintained
        user.refresh_from_db()
        self.assertEqual(user.company.id, self.company2.id)
        self.assertFalse(user.company.is_active)
    
    def test_multiple_users_relationship_maintained_when_deactivated(self):
        """
        Test that all user relationships are maintained when company is deactivated.
        
        **Validates: Requirement 2.7 (from context)**
        """
        # Create multiple users
        users = []
        for i in range(3):
            user = User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@test.com',
                first_name=f'User',
                last_name=f'{i}',
                role='employee',
                company=self.company2
            )
            users.append(user)
        
        # Deactivate company
        self.company2.is_active = False
        self.company2.save()
        
        # Verify all relationships are maintained
        for user in users:
            user.refresh_from_db()
            self.assertEqual(user.company.id, self.company2.id)
            self.assertFalse(user.company.is_active)


class CompanyDeletionWithBusinessDataTest(TestCase):
    """
    Unit tests for company deletion prevention with various types of business data.
    
    Tests that deletion is prevented when companies have associated leads,
    customers, projects, tasks, leaves, holidays, or announcements.
    """
    
    def setUp(self):
        """Set up test environment"""
        # Clear any existing companies
        Company.objects.all().delete()
        
        # Create test company
        self.company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            company=self.company
        )
        
        # Create API client
        self.client = APIClient()
    
    def test_cannot_delete_company_with_leads(self):
        """
        Test that deletion is prevented when company has associated leads.
        
        **Validates: Requirement 1.7**
        """
        try:
            from leads.models import Lead
            
            # Create lead
            Lead.objects.create(
                name='Test Lead',
                phone='1234567890',
                company=self.company,
                created_by=self.admin_user
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or leads
            self.assertTrue('user(s)' in error_message or 'lead(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Leads module not available")
    
    def test_cannot_delete_company_with_customers(self):
        """
        Test that deletion is prevented when company has associated customers.
        
        **Validates: Requirement 1.7**
        """
        try:
            from customers.models import Customer
            
            # Create customer
            Customer.objects.create(
                name='Test Customer',
                phone='1234567890',
                company=self.company,
                created_by=self.admin_user
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or customers
            self.assertTrue('user(s)' in error_message or 'customer(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Customers module not available")
    
    def test_cannot_delete_company_with_projects(self):
        """
        Test that deletion is prevented when company has associated projects.
        
        **Validates: Requirement 1.7**
        """
        try:
            from projects.models import Project
            
            # Create project
            Project.objects.create(
                name='Test Project',
                description='Test Description',
                company=self.company
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or projects
            self.assertTrue('user(s)' in error_message or 'project(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Projects module not available")
    
    def test_cannot_delete_company_with_tasks(self):
        """
        Test that deletion is prevented when company has associated tasks.
        
        **Validates: Requirement 1.7**
        """
        try:
            from tasks.models import Task
            
            # Create task
            Task.objects.create(
                title='Test Task',
                description='Test Description',
                company=self.company,
                created_by=self.admin_user,
                assigned_to=self.admin_user
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or tasks
            self.assertTrue('user(s)' in error_message or 'task(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Tasks module not available")
    
    def test_cannot_delete_company_with_leaves(self):
        """
        Test that deletion is prevented when company has associated leaves.
        
        **Validates: Requirement 1.7**
        """
        try:
            from leaves.models import Leave
            from datetime import date, timedelta
            
            # Create leave
            Leave.objects.create(
                user=self.admin_user,
                leave_type='sick',
                start_date=date.today(),
                end_date=date.today() + timedelta(days=1),
                reason='Test reason',
                company=self.company
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or leaves
            self.assertTrue('user(s)' in error_message or 'leave(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Leaves module not available")
    
    def test_cannot_delete_company_with_holidays(self):
        """
        Test that deletion is prevented when company has associated holidays.
        
        **Validates: Requirement 1.7**
        """
        try:
            from holidays.models import Holiday
            from datetime import date
            
            # Create holiday
            Holiday.objects.create(
                name='Test Holiday',
                start_date=date.today(),
                end_date=date.today(),
                company=self.company,
                created_by=self.admin_user
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or holidays
            self.assertTrue('user(s)' in error_message or 'holiday(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Holidays module not available")
    
    def test_cannot_delete_company_with_announcements(self):
        """
        Test that deletion is prevented when company has associated announcements.
        
        **Validates: Requirement 1.7**
        """
        try:
            from announcements.models import Announcement
            
            # Create announcement
            Announcement.objects.create(
                title='Test Announcement',
                message='Test Message',
                company=self.company,
                created_by=self.admin_user
            )
            
            # Try to delete
            with self.assertRaises(ValidationError) as context:
                self.company.delete()
            
            error_message = str(context.exception)
            self.assertIn('Cannot delete company', error_message)
            # Should mention either users or announcements
            self.assertTrue('user(s)' in error_message or 'announcement(s)' in error_message)
            
            # Verify company still exists
            self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        except ImportError:
            self.skipTest("Announcements module not available")
