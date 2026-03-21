"""
Unit tests for ImportService

This test suite verifies the import functionality including CSV parsing,
Excel parsing, clipboard parsing, validation, and bulk creation.

**Validates: Requirements REQ-001 through REQ-017**
"""

import io
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from customers.services import ImportService, ValidationService
from customers.models import Customer
from accounts.models import Company

User = get_user_model()


class TestImportServiceDelimiterDetection(TestCase):
    """
    Unit tests for delimiter auto-detection
    
    **Validates: Requirements REQ-012**
    """
    
    def test_detect_tab_delimiter(self):
        """Tab-separated data should be detected"""
        text = "phone\tname\n1234567890\tJohn Doe\n9876543210\tJane Smith"
        delimiter = ImportService.detect_delimiter(text)
        self.assertEqual(delimiter, '\t')
    
    def test_detect_comma_delimiter(self):
        """Comma-separated data should be detected"""
        text = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith"
        delimiter = ImportService.detect_delimiter(text)
        self.assertEqual(delimiter, ',')
    
    def test_detect_semicolon_delimiter(self):
        """Semicolon-separated data should be detected"""
        text = "phone;name\n1234567890;John Doe\n9876543210;Jane Smith"
        delimiter = ImportService.detect_delimiter(text)
        self.assertEqual(delimiter, ';')
    
    def test_detect_delimiter_with_mixed_content(self):
        """Should detect most common delimiter"""
        # More tabs than commas
        text = "phone\tname\taddress\n1234567890\tJohn, Doe\tNew York"
        delimiter = ImportService.detect_delimiter(text)
        self.assertEqual(delimiter, '\t')


class TestImportServiceCSVParsing(TestCase):
    """
    Unit tests for CSV parsing
    
    **Validates: Requirements REQ-001, REQ-010**
    """
    
    def test_parse_csv_basic(self):
        """Parse basic CSV with phone and name columns"""
        csv_content = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith"
        rows = ImportService.parse_csv(csv_content)
        
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
        self.assertEqual(rows[1]['phone'], '9876543210')
        self.assertEqual(rows[1]['name'], 'Jane Smith')
    
    def test_parse_csv_case_insensitive_headers(self):
        """Parse CSV with case-insensitive column headers"""
        csv_content = "PHONE,NAME\n1234567890,John Doe"
        rows = ImportService.parse_csv(csv_content)
        
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
    
    def test_parse_csv_with_extra_columns(self):
        """Parse CSV with extra columns (should ignore them)"""
        csv_content = "phone,name,email,address\n1234567890,John Doe,john@example.com,123 Main St"
        rows = ImportService.parse_csv(csv_content)
        
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
        # Should only have phone and name keys
        self.assertEqual(set(rows[0].keys()), {'phone', 'name'})
    
    def test_parse_csv_with_empty_rows(self):
        """Parse CSV and skip empty rows"""
        csv_content = "phone,name\n1234567890,John Doe\n,\n9876543210,Jane Smith"
        rows = ImportService.parse_csv(csv_content)
        
        # Should skip the empty row
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[1]['phone'], '9876543210')
    
    def test_parse_csv_with_whitespace(self):
        """Parse CSV and trim whitespace from values"""
        csv_content = "phone,name\n  1234567890  ,  John Doe  "
        rows = ImportService.parse_csv(csv_content)
        
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
    
    def test_parse_csv_from_file_object(self):
        """Parse CSV from file-like object"""
        csv_content = b"phone,name\n1234567890,John Doe"
        file_obj = io.BytesIO(csv_content)
        rows = ImportService.parse_csv(file_obj)
        
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')


class TestImportServiceClipboardParsing(TestCase):
    """
    Unit tests for clipboard text parsing
    
    **Validates: Requirements REQ-011, REQ-012**
    """
    
    def test_parse_clipboard_tab_separated(self):
        """Parse tab-separated clipboard text"""
        text = "phone\tname\n1234567890\tJohn Doe\n9876543210\tJane Smith"
        rows = ImportService.parse_clipboard(text)
        
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
    
    def test_parse_clipboard_comma_separated(self):
        """Parse comma-separated clipboard text"""
        text = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith"
        rows = ImportService.parse_clipboard(text)
        
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')
    
    def test_parse_clipboard_semicolon_separated(self):
        """Parse semicolon-separated clipboard text"""
        text = "phone;name\n1234567890;John Doe\n9876543210;Jane Smith"
        rows = ImportService.parse_clipboard(text)
        
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['phone'], '1234567890')
        self.assertEqual(rows[0]['name'], 'John Doe')


class TestImportServiceValidation(TestCase):
    """
    Unit tests for import data validation
    
    **Validates: Requirements REQ-002, REQ-003, REQ-007**
    """
    
    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin',
            company=self.company
        )
    
    def test_validate_import_data_all_valid(self):
        """Validate import data with all valid rows"""
        rows = [
            {'phone': '1234567890', 'name': 'John Doe'},
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 2)
        self.assertEqual(len(error_rows), 0)
    
    def test_validate_import_data_missing_phone(self):
        """Validate import data with missing phone numbers"""
        rows = [
            {'phone': '', 'name': 'John Doe'},
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 1)
        self.assertEqual(len(error_rows), 1)
        self.assertEqual(error_rows[0]['row'], 1)
        self.assertIn('required', error_rows[0]['error'].lower())
    
    def test_validate_import_data_invalid_phone_format(self):
        """Validate import data with invalid phone format"""
        rows = [
            {'phone': '123', 'name': 'John Doe'},  # Too short
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 1)
        self.assertEqual(len(error_rows), 1)
        self.assertEqual(error_rows[0]['row'], 1)
        self.assertIn('10-15 digits', error_rows[0]['error'])
    
    def test_validate_import_data_duplicate_in_database(self):
        """Validate import data with phone already in database"""
        # Create existing customer
        Customer.objects.create(
            phone='1234567890',
            name='Existing Customer',
            company=self.company,
            created_by=self.user
        )
        
        rows = [
            {'phone': '1234567890', 'name': 'John Doe'},  # Duplicate
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 1)
        self.assertEqual(len(error_rows), 1)
        self.assertEqual(error_rows[0]['row'], 1)
        self.assertIn('already exists', error_rows[0]['error'].lower())
    
    def test_validate_import_data_duplicate_in_file(self):
        """Validate import data with duplicate phone within the file"""
        rows = [
            {'phone': '1234567890', 'name': 'John Doe'},
            {'phone': '1234567890', 'name': 'John Duplicate'},  # Duplicate
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 2)  # First occurrence and Jane
        self.assertEqual(len(error_rows), 1)
        self.assertEqual(error_rows[0]['row'], 2)
        self.assertIn('duplicate', error_rows[0]['error'].lower())
    
    def test_validate_import_data_multiple_errors(self):
        """Validate import data with multiple error types"""
        # Create existing customer
        Customer.objects.create(
            phone='1111111111',
            name='Existing',
            company=self.company,
            created_by=self.user
        )
        
        rows = [
            {'phone': '', 'name': 'Missing Phone'},  # Missing phone - ERROR
            {'phone': '123', 'name': 'Invalid'},  # Invalid format - ERROR
            {'phone': '1111111111', 'name': 'Duplicate'},  # Duplicate in DB - ERROR
            {'phone': '2222222222', 'name': 'Valid 1'},  # Valid (first occurrence)
            {'phone': '2222222222', 'name': 'Duplicate in File'},  # Duplicate in file - ERROR
            {'phone': '3333333333', 'name': 'Valid 2'},  # Valid
        ]
        
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        self.assertEqual(len(valid_rows), 2)  # Valid 1 (2222222222) and Valid 2 (3333333333)
        self.assertEqual(len(error_rows), 4)  # Missing, Invalid, Duplicate DB, Duplicate in file


class TestImportServiceBulkCreate(TestCase):
    """
    Unit tests for bulk customer creation
    
    **Validates: Requirements REQ-004, REQ-005, REQ-006, REQ-016, REQ-017**
    """
    
    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin',
            company=self.company
        )
    
    def test_bulk_create_customers_basic(self):
        """Create customers in bulk"""
        valid_rows = [
            {'phone': '1234567890', 'name': 'John Doe'},
            {'phone': '9876543210', 'name': 'Jane Smith'},
        ]
        
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        
        self.assertEqual(result['success_count'], 2)
        self.assertEqual(len(result['created_ids']), 2)
        self.assertEqual(result['duplicates_skipped'], 0)
        
        # Verify customers were created
        customers = Customer.objects.filter(company=self.company)
        self.assertEqual(customers.count(), 2)
    
    def test_bulk_create_customers_auto_assign_fields(self):
        """Verify auto-assigned fields (company, created_by, call_status)"""
        valid_rows = [
            {'phone': '1234567890', 'name': 'John Doe'},
        ]
        
        ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        
        customer = Customer.objects.get(phone='1234567890')
        self.assertEqual(customer.company, self.company)
        self.assertEqual(customer.created_by, self.user)
        self.assertEqual(customer.assigned_to, self.user)
        self.assertEqual(customer.call_status, 'pending')
    
    def test_bulk_create_customers_empty_name(self):
        """Create customers with empty name (name is optional)"""
        valid_rows = [
            {'phone': '1234567890', 'name': ''},
        ]
        
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        
        self.assertEqual(result['success_count'], 1)
        
        customer = Customer.objects.get(phone='1234567890')
        self.assertEqual(customer.name, '')
    
    def test_bulk_create_customers_large_batch(self):
        """Create large batch of customers (performance test)"""
        # Create 1000 customers
        valid_rows = [
            {'phone': f'{1000000000 + i}', 'name': f'Customer {i}'}
            for i in range(1000)
        ]
        
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        
        self.assertEqual(result['success_count'], 1000)
        self.assertEqual(Customer.objects.filter(company=self.company).count(), 1000)


class TestImportServiceIntegration(TestCase):
    """
    Integration tests for complete import workflow
    
    **Validates: Requirements REQ-001 through REQ-007**
    """
    
    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name='Test Company',
            code='TEST',
            is_active=True
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin',
            company=self.company
        )
    
    def test_complete_csv_import_workflow(self):
        """Test complete CSV import workflow: parse -> validate -> create"""
        csv_content = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith\n123,Invalid"
        
        # Step 1: Parse CSV
        rows = ImportService.parse_csv(csv_content)
        self.assertEqual(len(rows), 3)
        
        # Step 2: Validate
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        self.assertEqual(len(valid_rows), 2)
        self.assertEqual(len(error_rows), 1)
        
        # Step 3: Bulk create
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        self.assertEqual(result['success_count'], 2)
        
        # Verify final state
        customers = Customer.objects.filter(company=self.company)
        self.assertEqual(customers.count(), 2)
    
    def test_complete_clipboard_import_workflow(self):
        """Test complete clipboard import workflow: parse -> validate -> create"""
        clipboard_text = "phone\tname\n1234567890\tJohn Doe\n9876543210\tJane Smith"
        
        # Step 1: Parse clipboard
        rows = ImportService.parse_clipboard(clipboard_text)
        self.assertEqual(len(rows), 2)
        
        # Step 2: Validate
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        self.assertEqual(len(valid_rows), 2)
        self.assertEqual(len(error_rows), 0)
        
        # Step 3: Bulk create
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        self.assertEqual(result['success_count'], 2)
        
        # Verify final state
        customers = Customer.objects.filter(company=self.company)
        self.assertEqual(customers.count(), 2)
    
    def test_import_with_existing_customers(self):
        """Test import with some customers already existing"""
        # Create existing customer
        Customer.objects.create(
            phone='1234567890',
            name='Existing Customer',
            company=self.company,
            created_by=self.user
        )
        
        csv_content = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith"
        
        # Parse and validate
        rows = ImportService.parse_csv(csv_content)
        valid_rows, error_rows = ImportService.validate_import_data(rows, self.company.id)
        
        # Should have 1 valid (Jane) and 1 error (John - duplicate)
        self.assertEqual(len(valid_rows), 1)
        self.assertEqual(len(error_rows), 1)
        
        # Create
        result = ImportService.bulk_create_customers(valid_rows, self.user, self.company)
        self.assertEqual(result['success_count'], 1)
        
        # Total customers should be 2 (1 existing + 1 new)
        self.assertEqual(Customer.objects.filter(company=self.company).count(), 2)
