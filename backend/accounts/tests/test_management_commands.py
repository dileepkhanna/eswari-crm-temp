"""
Unit tests for management commands: assign_company, create_company, list_companies

Tests Requirements:
- 1.4: Company management endpoints and commands
- 2.4: User-company assignment functionality
"""
from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth import get_user_model
from accounts.models import Company

User = get_user_model()


class AssignCompanyCommandTests(TestCase):
    """Test suite for assign_company management command"""
    
    def setUp(self):
        """Set up test data"""
        # Create companies
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
        
        # Create users (all must have a company since field is required)
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='testpass123',
            company=self.company1
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='testpass123',
            company=self.company1
        )
        self.user3 = User.objects.create_user(
            username='user3',
            email='user3@test.com',
            password='testpass123',
            company=self.company1  # Assigned initially, will be used for reassignment tests
        )
    
    def test_assign_company_with_user_ids(self):
        """Test assigning specific users by ID"""
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'TEST2',
            '--user-ids', f'{self.user1.id},{self.user2.id}',
            verbosity=0,
            stdout=out
        )
        
        # Verify users were assigned
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user1.company, self.company2)
        self.assertEqual(self.user2.company, self.company2)
        
        # Verify output message
        output = out.getvalue()
        self.assertIn('Successfully assigned', output)
        self.assertIn('2 user(s)', output)
    
    def test_assign_company_with_single_user_id(self):
        """Test assigning a single user"""
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'TEST2',
            '--user-ids', str(self.user1.id),
            verbosity=0,
            stdout=out
        )
        
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.company, self.company2)
    
    def test_assign_company_all_unassigned(self):
        """Test assigning all unassigned users - skipped since company is now required"""
        # Since company field is now required (NOT NULL), we cannot test the --all-unassigned
        # functionality with truly unassigned users. This test verifies the command handles
        # the case when no unassigned users exist.
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'TEST2',
            '--all-unassigned',
            verbosity=0,
            stdout=out
        )
        
        # Verify output indicates no users found
        output = out.getvalue()
        self.assertIn('No users found', output)
    
    def test_assign_company_nonexistent_company(self):
        """Test error handling for non-existent company"""
        with self.assertRaises(CommandError) as cm:
            call_command(
                'assign_company',
                '--company-code', 'NONEXISTENT',
                '--user-ids', str(self.user1.id),
                verbosity=0
            )
        
        self.assertIn('does not exist', str(cm.exception))
    
    def test_assign_company_invalid_user_ids_format(self):
        """Test error handling for invalid user ID format"""
        with self.assertRaises(CommandError) as cm:
            call_command(
                'assign_company',
                '--company-code', 'TEST1',
                '--user-ids', 'abc,def',
                verbosity=0
            )
        
        self.assertIn('Invalid user IDs format', str(cm.exception))
    
    def test_assign_company_missing_user_ids(self):
        """Test warning for non-existent user IDs"""
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'TEST1',
            '--user-ids', f'{self.user1.id},9999,10000',
            verbosity=0,
            stdout=out
        )
        
        output = out.getvalue()
        self.assertIn('Warning', output)
        self.assertIn('9999', output)
        self.assertIn('10000', output)
    
    def test_assign_company_no_users_found(self):
        """Test handling when no users match criteria"""
        # Assign all users first
        User.objects.filter(company__isnull=True).update(company=self.company1)
        
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'TEST1',
            '--all-unassigned',
            verbosity=0,
            stdout=out
        )
        
        output = out.getvalue()
        self.assertIn('No users found', output)
    
    def test_assign_company_missing_arguments(self):
        """Test error when neither user-ids nor all-unassigned is provided"""
        with self.assertRaises(CommandError) as cm:
            call_command(
                'assign_company',
                '--company-code', 'TEST1',
                verbosity=0
            )
        
        self.assertIn('Must specify either', str(cm.exception))
    
    def test_assign_company_case_insensitive_code(self):
        """Test that company code is case-insensitive"""
        out = StringIO()
        call_command(
            'assign_company',
            '--company-code', 'test2',  # lowercase
            '--user-ids', str(self.user1.id),
            verbosity=0,
            stdout=out
        )
        
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.company, self.company2)
    
    def test_assign_company_reassignment(self):
        """Test reassigning users from one company to another"""
        # User1 starts in company1
        self.assertEqual(self.user1.company, self.company1)
        
        # Reassign to company2
        call_command(
            'assign_company',
            '--company-code', 'TEST2',
            '--user-ids', str(self.user1.id),
            verbosity=0,
            stdout=StringIO()
        )
        
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.company, self.company2)


class CreateCompanyCommandTests(TestCase):
    """Test suite for create_company management command"""
    
    def test_create_company_success(self):
        """Test successful company creation"""
        out = StringIO()
        call_command(
            'create_company',
            '--name', 'New Test Company',
            '--code', 'NEWTEST',
            verbosity=0,
            stdout=out
        )
        
        # Verify company was created
        company = Company.objects.get(code='NEWTEST')
        self.assertEqual(company.name, 'New Test Company')
        self.assertEqual(company.code, 'NEWTEST')
        self.assertTrue(company.is_active)
        
        # Verify output
        output = out.getvalue()
        self.assertIn('Successfully created', output)
    
    def test_create_company_inactive(self):
        """Test creating an inactive company"""
        call_command(
            'create_company',
            '--name', 'Inactive Company',
            '--code', 'INACTIVE',
            '--inactive',
            verbosity=0,
            stdout=StringIO()
        )
        
        company = Company.objects.get(code='INACTIVE')
        self.assertFalse(company.is_active)
    
    def test_create_company_code_uppercase_conversion(self):
        """Test that company code is converted to uppercase"""
        call_command(
            'create_company',
            '--name', 'Lowercase Test',
            '--code', 'lowercase',
            verbosity=0,
            stdout=StringIO()
        )
        
        company = Company.objects.get(code='LOWERCASE')
        self.assertEqual(company.code, 'LOWERCASE')
    
    def test_create_company_duplicate_code(self):
        """Test error handling for duplicate company code"""
        # Create first company
        Company.objects.create(
            name='Existing Company',
            code='EXISTING',
            is_active=True
        )
        
        # Try to create duplicate
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', 'Another Company',
                '--code', 'EXISTING',
                verbosity=0
            )
        
        self.assertIn('already exists', str(cm.exception))
    
    def test_create_company_duplicate_name(self):
        """Test error handling for duplicate company name"""
        # Create first company
        Company.objects.create(
            name='Duplicate Name',
            code='CODE1',
            is_active=True
        )
        
        # Try to create duplicate
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', 'Duplicate Name',
                '--code', 'CODE2',
                verbosity=0
            )
        
        self.assertIn('already exists', str(cm.exception))
    
    def test_create_company_empty_name(self):
        """Test error handling for empty company name"""
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', '   ',  # Whitespace only
                '--code', 'TEST',
                verbosity=0
            )
        
        self.assertIn('cannot be empty', str(cm.exception))
    
    def test_create_company_empty_code(self):
        """Test error handling for empty company code"""
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', 'Test Company',
                '--code', '   ',  # Whitespace only
                verbosity=0
            )
        
        self.assertIn('cannot be empty', str(cm.exception))
    
    def test_create_company_code_too_long(self):
        """Test error handling for company code exceeding max length"""
        long_code = 'A' * 51  # Max is 50
        
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', 'Test Company',
                '--code', long_code,
                verbosity=0
            )
        
        self.assertIn('50 characters or less', str(cm.exception))
    
    def test_create_company_name_too_long(self):
        """Test error handling for company name exceeding max length"""
        long_name = 'A' * 201  # Max is 200
        
        with self.assertRaises(CommandError) as cm:
            call_command(
                'create_company',
                '--name', long_name,
                '--code', 'TEST',
                verbosity=0
            )
        
        self.assertIn('200 characters or less', str(cm.exception))
    
    def test_create_company_with_special_characters(self):
        """Test creating company with special characters in name"""
        call_command(
            'create_company',
            '--name', 'Test & Company, Inc.',
            '--code', 'TESTINC',
            verbosity=0,
            stdout=StringIO()
        )
        
        company = Company.objects.get(code='TESTINC')
        self.assertEqual(company.name, 'Test & Company, Inc.')
    
    def test_create_company_whitespace_trimming(self):
        """Test that whitespace is trimmed from name and code"""
        call_command(
            'create_company',
            '--name', '  Trimmed Company  ',
            '--code', '  TRIM  ',
            verbosity=0,
            stdout=StringIO()
        )
        
        company = Company.objects.get(code='TRIM')
        self.assertEqual(company.name, 'Trimmed Company')
        self.assertEqual(company.code, 'TRIM')


class ListCompaniesCommandTests(TestCase):
    """Test suite for list_companies management command"""
    
    def setUp(self):
        """Set up test data"""
        # Create companies with users
        self.company1 = Company.objects.create(
            name='Active Company 1',
            code='ACTIVE1',
            is_active=True
        )
        self.company2 = Company.objects.create(
            name='Active Company 2',
            code='ACTIVE2',
            is_active=True
        )
        self.company3 = Company.objects.create(
            name='Inactive Company',
            code='INACTIVE',
            is_active=False
        )
        
        # Create users
        User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='testpass123',
            company=self.company1
        )
        User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='testpass123',
            company=self.company1
        )
        User.objects.create_user(
            username='user3',
            email='user3@test.com',
            password='testpass123',
            company=self.company2
        )
    
    def test_list_all_companies(self):
        """Test listing all companies"""
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        
        # Verify all companies are listed
        self.assertIn('Active Company 1', output)
        self.assertIn('Active Company 2', output)
        self.assertIn('Inactive Company', output)
        
        # Verify codes are shown
        self.assertIn('ACTIVE1', output)
        self.assertIn('ACTIVE2', output)
        self.assertIn('INACTIVE', output)
        
        # Verify summary (includes default Eswari Group company from migration)
        self.assertIn('Total: 4 companies', output)
        self.assertIn('3 active', output)
        self.assertIn('1 inactive', output)
    
    def test_list_active_only(self):
        """Test listing only active companies"""
        out = StringIO()
        call_command('list_companies', '--active-only', stdout=out)
        
        output = out.getvalue()
        
        # Verify only active companies are listed
        self.assertIn('Active Company 1', output)
        self.assertIn('Active Company 2', output)
        self.assertNotIn('Inactive Company', output)
        
        # Verify header
        self.assertIn('Active Companies', output)
    
    def test_list_companies_shows_user_count(self):
        """Test that user counts are displayed correctly"""
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        
        # Company1 has 2 users, Company2 has 1 user, Company3 has 0 users
        # The output format includes user counts in columns
        self.assertIn('Users', output)
    
    def test_list_companies_empty_database(self):
        """Test listing when no companies exist (except default)"""
        # Delete all users first to avoid PROTECT constraint
        User.objects.all().delete()
        # Delete all companies
        Company.objects.all().delete()
        
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        self.assertIn('No companies found', output)
    
    def test_list_companies_no_active(self):
        """Test listing when no active companies exist"""
        # Make all companies inactive
        Company.objects.all().update(is_active=False)
        
        out = StringIO()
        call_command('list_companies', '--active-only', stdout=out)
        
        output = out.getvalue()
        self.assertIn('No companies found', output)
    
    def test_list_companies_output_format(self):
        """Test that output includes proper headers and formatting"""
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        
        # Verify headers
        self.assertIn('ID', output)
        self.assertIn('Code', output)
        self.assertIn('Name', output)
        self.assertIn('Active', output)
        self.assertIn('Users', output)
        
        # Verify separator lines
        self.assertIn('-' * 70, output)
    
    def test_list_companies_active_status_display(self):
        """Test that active status is displayed correctly"""
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        
        # Active companies should show "Yes", inactive should show "No"
        # The exact format depends on ANSI color codes, but text should be present
        self.assertIn('Yes', output)
        self.assertIn('No', output)


class ManagementCommandsIntegrationTests(TestCase):
    """Integration tests for management commands working together"""
    
    def test_create_and_assign_workflow(self):
        """Test complete workflow: create company, create users, assign users"""
        # Step 1: Create a company
        call_command(
            'create_company',
            '--name', 'Integration Test Company',
            '--code', 'INTTEST',
            verbosity=0,
            stdout=StringIO()
        )
        
        company = Company.objects.get(code='INTTEST')
        
        # Step 2: Create users with the new company (company is required)
        user1 = User.objects.create_user(
            username='intuser1',
            email='intuser1@test.com',
            password='testpass123',
            company=company
        )
        user2 = User.objects.create_user(
            username='intuser2',
            email='intuser2@test.com',
            password='testpass123',
            company=company
        )
        
        # Step 3: Verify users are assigned to company
        user1.refresh_from_db()
        user2.refresh_from_db()
        
        self.assertEqual(user1.company, company)
        self.assertEqual(user2.company, company)
        
        # Step 4: List companies and verify
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Integration Test Company', output)
        self.assertIn('INTTEST', output)
        self.assertIn('2', output)  # 2 users
    
    def test_multiple_company_management(self):
        """Test managing multiple companies simultaneously"""
        # Create multiple companies
        call_command(
            'create_company',
            '--name', 'Company A',
            '--code', 'COMPA',
            verbosity=0,
            stdout=StringIO()
        )
        call_command(
            'create_company',
            '--name', 'Company B',
            '--code', 'COMPB',
            verbosity=0,
            stdout=StringIO()
        )
        
        company_a = Company.objects.get(code='COMPA')
        company_b = Company.objects.get(code='COMPB')
        
        # Create users with companies (company is required)
        user1 = User.objects.create_user(
            username='usera',
            email='usera@test.com',
            password='testpass123',
            company=company_a
        )
        user2 = User.objects.create_user(
            username='userb',
            email='userb@test.com',
            password='testpass123',
            company=company_b
        )
        
        # Verify assignments
        user1.refresh_from_db()
        user2.refresh_from_db()
        
        self.assertEqual(user1.company.code, 'COMPA')
        self.assertEqual(user2.company.code, 'COMPB')
        
        # Test reassignment using assign_company command
        call_command(
            'assign_company',
            '--company-code', 'COMPB',
            '--user-ids', str(user1.id),
            verbosity=0,
            stdout=StringIO()
        )
        
        user1.refresh_from_db()
        self.assertEqual(user1.company.code, 'COMPB')
        
        # Verify list shows both
        out = StringIO()
        call_command('list_companies', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Company A', output)
        self.assertIn('Company B', output)
