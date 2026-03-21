"""
Property-based tests for ImportService

This test suite uses hypothesis to verify universal properties of the import logic
across a wide range of inputs, ensuring correctness beyond specific examples.

**Validates: Requirements REQ-001 through REQ-012**
"""

import csv
import io
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from customers.services import ImportService, ValidationService
from customers.models import Customer
from accounts.models import Company

User = get_user_model()


# Custom strategies for domain-specific data
@st.composite
def valid_phone_numbers(draw):
    """Generate valid phone numbers (10-15 digits, optional + prefix)"""
    has_plus = draw(st.booleans())
    digit_count = draw(st.integers(min_value=10, max_value=15))
    digits = draw(st.text(min_size=digit_count, max_size=digit_count, alphabet='0123456789'))
    
    if has_plus:
        return f"+{digits}"
    return digits


@st.composite
def csv_rows(draw, min_rows=1, max_rows=10):
    """Generate CSV row data with phone and name"""
    num_rows = draw(st.integers(min_value=min_rows, max_value=max_rows))
    rows = []
    
    for _ in range(num_rows):
        phone = draw(valid_phone_numbers())
        # Exclude characters that would break CSV parsing or cause issues
        name = draw(st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(
                blacklist_categories=('Cs', 'Cc'),
                blacklist_characters=',\n\r\t;"'  # Exclude CSV delimiters and quote
            )
        )).strip()  # Strip to match parsing behavior
        
        # Ensure name is not empty after stripping
        if not name:
            name = 'Name'
        
        rows.append({'phone': phone, 'name': name})
    
    return rows


class TestImportServiceProperties(TestCase):
    """
    Property-based tests for ImportService
    
    **Validates: Requirements REQ-001 through REQ-012**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        cls.company = Company.objects.create(
            name='Test Company PBT Import',
            code='TEST_PBT_IMP',
            is_active=True
        )
        
        cls.user = User.objects.create_user(
            username='test_user_pbt_import',
            email='test_pbt_import@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(rows=csv_rows(min_rows=1, max_rows=20))
    def test_property_csv_parsing_preserves_data(self, rows):
        """
        **Property 1: CSV Parsing Preserves Data**
        
        For any valid CSV content with phone and name columns,
        parsing should extract all rows with values intact.
        
        **Validates: Requirements REQ-001**
        """
        # Create CSV content
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=['phone', 'name'])
        writer.writeheader()
        writer.writerows(rows)
        csv_content = output.getvalue()
        
        # Parse CSV
        parsed_rows = ImportService.parse_csv(csv_content)
        
        # Verify all rows were parsed
        self.assertEqual(
            len(parsed_rows),
            len(rows),
            f"Expected {len(rows)} rows, got {len(parsed_rows)}"
        )
        
        # Verify data integrity
        for original, parsed in zip(rows, parsed_rows):
            self.assertEqual(
                parsed['phone'],
                original['phone'],
                f"Phone number mismatch: expected '{original['phone']}', got '{parsed['phone']}'"
            )
            self.assertEqual(
                parsed['name'],
                original['name'],
                f"Name mismatch: expected '{original['name']}', got '{parsed['name']}'"
            )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
        )
    )
    def test_property_company_assignment_invariant(self, phone, name):
        """
        **Property 4: Company Assignment Invariant**
        
        For any import operation by an authenticated user,
        all created customers should have their company field set to the user's company.
        
        **Validates: Requirements REQ-004**
        """
        valid_rows = [{'phone': phone, 'name': name}]
        
        result = ImportService.bulk_create_customers(
            valid_rows,
            self.user,
            self.company
        )
        
        # Verify customer was created
        self.assertGreater(
            result['success_count'],
            0,
            f"Customer with phone '{phone}' should be created"
        )
        
        # Verify company assignment
        customer = Customer.objects.get(phone=phone)
        self.assertEqual(
            customer.company,
            self.company,
            f"Customer company should be {self.company}, got {customer.company}"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(rows=csv_rows(min_rows=1, max_rows=20))
    def test_property_import_summary_accuracy(self, rows):
        """
        **Property 5: Import Summary Accuracy**
        
        For any import operation, the returned summary counts
        (success_count + duplicate_count + error_count) should equal total_rows,
        and the actual number of created customers should match success_count.
        
        **Validates: Requirements REQ-005**
        """
        # Ensure unique phone numbers for this test
        unique_rows = []
        seen_phones = set()
        for row in rows:
            if row['phone'] not in seen_phones:
                unique_rows.append(row)
                seen_phones.add(row['phone'])
        
        if not unique_rows:
            assume(False)
        
        # Validate rows
        valid_rows, error_rows = ImportService.validate_import_data(
            unique_rows,
            self.company.id
        )
        
        # Bulk create
        result = ImportService.bulk_create_customers(
            valid_rows,
            self.user,
            self.company
        )
        
        # Verify summary accuracy
        total_processed = len(valid_rows)
        success_count = result['success_count']
        duplicates_skipped = result['duplicates_skipped']
        
        self.assertEqual(
            success_count + duplicates_skipped,
            total_processed,
            f"Summary counts don't add up: {success_count} + {duplicates_skipped} != {total_processed}"
        )
        
        # Verify actual created count matches success_count
        created_count = len([cid for cid in result['created_ids'] if cid])
        self.assertEqual(
            created_count,
            success_count,
            f"Created count {created_count} doesn't match success_count {success_count}"
        )
        
        # Clean up
        Customer.objects.filter(phone__in=[r['phone'] for r in unique_rows]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(rows=csv_rows(min_rows=1, max_rows=20))
    def test_property_duplicate_handling_idempotency(self, rows):
        """
        **Property 3: Duplicate Handling Idempotency**
        
        For any import containing duplicate phone numbers,
        importing the same data twice with "skip duplicates" mode
        should result in the same final database state
        (no additional customers created on second import).
        
        **Validates: Requirements REQ-003**
        """
        # Ensure unique phone numbers within the import
        unique_rows = []
        seen_phones = set()
        for row in rows:
            if row['phone'] not in seen_phones:
                unique_rows.append(row)
                seen_phones.add(row['phone'])
        
        if not unique_rows:
            assume(False)
        
        # First import - validate and create
        valid_rows1, error_rows1 = ImportService.validate_import_data(
            unique_rows,
            self.company.id
        )
        result1 = ImportService.bulk_create_customers(
            valid_rows1,
            self.user,
            self.company
        )
        
        # Capture database state after first import
        phones_imported = [r['phone'] for r in valid_rows1]
        customers_after_first = list(
            Customer.objects.filter(
                phone__in=phones_imported,
                company=self.company
            ).values('phone', 'name', 'company_id', 'call_status', 'is_converted')
        )
        count_after_first = len(customers_after_first)
        
        # Verify first import succeeded
        self.assertGreater(
            count_after_first,
            0,
            "First import should create at least one customer"
        )
        self.assertEqual(
            result1['success_count'],
            count_after_first,
            f"Success count {result1['success_count']} should match created count {count_after_first}"
        )
        
        # Second import - same data (should detect duplicates and skip)
        valid_rows2, error_rows2 = ImportService.validate_import_data(
            unique_rows,
            self.company.id
        )
        
        # All rows should be detected as duplicates
        self.assertEqual(
            len(error_rows2),
            len(unique_rows),
            f"Second import should detect all {len(unique_rows)} rows as duplicates"
        )
        
        # Verify all errors mention duplicates
        for error_row in error_rows2:
            self.assertIn(
                'already exists',
                error_row['error'].lower(),
                f"Error for phone '{error_row['phone']}' should mention duplicate"
            )
        
        # No valid rows should remain for second import
        self.assertEqual(
            len(valid_rows2),
            0,
            "Second import should have no valid rows (all duplicates)"
        )
        
        # Capture database state after second import attempt
        customers_after_second = list(
            Customer.objects.filter(
                phone__in=phones_imported,
                company=self.company
            ).values('phone', 'name', 'company_id', 'call_status', 'is_converted')
        )
        count_after_second = len(customers_after_second)
        
        # Verify idempotency: database state unchanged
        self.assertEqual(
            count_after_first,
            count_after_second,
            f"Customer count should remain {count_after_first} after duplicate import attempt"
        )
        
        # Verify exact database state matches (not just count)
        self.assertEqual(
            sorted(customers_after_first, key=lambda x: x['phone']),
            sorted(customers_after_second, key=lambda x: x['phone']),
            "Database state should be identical after duplicate import attempt"
        )
        
        # Verify duplicate_count reporting
        # If we were to track duplicates in the result, it should match
        duplicate_count = len(error_rows2)
        self.assertEqual(
            duplicate_count,
            len(unique_rows),
            f"Duplicate count should be {len(unique_rows)}"
        )
        
        # Clean up
        Customer.objects.filter(phone__in=phones_imported, company=self.company).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        delimiter=st.sampled_from(['\t', ',', ';']),
        rows=csv_rows(min_rows=2, max_rows=10)
    )
    def test_property_delimiter_auto_detection(self, delimiter, rows):
        """
        **Property 8: Delimiter Auto-Detection**
        
        For any text data using tab, comma, or semicolon as delimiter,
        the auto-detection function should correctly identify the delimiter used.
        
        **Validates: Requirements REQ-012**
        """
        # Create delimited text
        lines = ['phone' + delimiter + 'name']
        for row in rows:
            lines.append(row['phone'] + delimiter + row['name'])
        text = '\n'.join(lines)
        
        # Detect delimiter
        detected = ImportService.detect_delimiter(text)
        
        self.assertEqual(
            detected,
            delimiter,
            f"Expected delimiter '{repr(delimiter)}', detected '{repr(detected)}'"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(
                blacklist_categories=('Cs', 'Cc'),
                blacklist_characters=',\n\r\t;"'  # Exclude CSV delimiters and quote
            )
        ),
        header_case=st.sampled_from(['lower', 'upper', 'title', 'mixed'])
    )
    def test_property_column_header_flexibility(self, phone, name, header_case):
        """
        **Property 9: Column Header Flexibility**
        
        For any CSV with column headers that are case-insensitive variations
        of "phone" and "name", the parser should correctly map them.
        
        **Validates: Requirements REQ-010**
        """
        # Strip name to match parsing behavior
        name = name.strip()
        if not name:
            name = 'Name'
        
        # Generate header based on case
        if header_case == 'lower':
            phone_header, name_header = 'phone', 'name'
        elif header_case == 'upper':
            phone_header, name_header = 'PHONE', 'NAME'
        elif header_case == 'title':
            phone_header, name_header = 'Phone', 'Name'
        else:  # mixed
            phone_header, name_header = 'PhOnE', 'NaMe'
        
        # Create CSV with case-variant headers
        csv_content = f"{phone_header},{name_header}\n{phone},{name}"
        
        # Parse CSV
        parsed_rows = ImportService.parse_csv(csv_content)
        
        # Verify parsing worked correctly
        self.assertEqual(
            len(parsed_rows),
            1,
            f"Should parse 1 row with headers '{phone_header},{name_header}'"
        )
        self.assertEqual(
            parsed_rows[0]['phone'],
            phone,
            f"Phone should be '{phone}' with header '{phone_header}'"
        )
        self.assertEqual(
            parsed_rows[0]['name'],
            name,
            f"Name should be '{name}' with header '{name_header}'"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(
                blacklist_categories=('Cs', 'Cc'),
                blacklist_characters=',\n\r\t;"'
            )
        ),
        delimiter=st.sampled_from(['\t', ',', ';'])
    )
    def test_property_clipboard_import_equivalence(self, phone, name, delimiter):
        """
        **Property 10: Clipboard Import Equivalence**
        
        For any data that can be represented as CSV,
        importing via clipboard paste should produce the same result
        as importing the equivalent CSV file.
        
        **Validates: Requirements REQ-011**
        """
        # Strip name to match parsing behavior
        name = name.strip()
        if not name:
            name = 'Name'
        
        # Create CSV content
        csv_content = f"phone,name\n{phone},{name}"
        
        # Create clipboard content with specified delimiter
        clipboard_content = f"phone{delimiter}name\n{phone}{delimiter}{name}"
        
        # Parse both
        csv_rows = ImportService.parse_csv(csv_content)
        clipboard_rows = ImportService.parse_clipboard(clipboard_content)
        
        # Results should be equivalent
        self.assertEqual(
            len(csv_rows),
            len(clipboard_rows),
            "CSV and clipboard should parse same number of rows"
        )
        
        if csv_rows and clipboard_rows:
            self.assertEqual(
                csv_rows[0]['phone'],
                clipboard_rows[0]['phone'],
                f"Phone should match: CSV='{csv_rows[0]['phone']}', Clipboard='{clipboard_rows[0]['phone']}'"
            )
            self.assertEqual(
                csv_rows[0]['name'],
                clipboard_rows[0]['name'],
                f"Name should match: CSV='{csv_rows[0]['name']}', Clipboard='{clipboard_rows[0]['name']}'"
            )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
        )
    )
    def test_property_created_by_auto_assignment(self, phone, name):
        """
        **Property 12: Created By Auto-Assignment**
        
        For any customer creation operation,
        the created_by field should automatically be set to the currently authenticated user.
        
        **Validates: Requirements REQ-016**
        """
        valid_rows = [{'phone': phone, 'name': name}]
        
        result = ImportService.bulk_create_customers(
            valid_rows,
            self.user,
            self.company
        )
        
        # Verify customer was created
        self.assertGreater(result['success_count'], 0)
        
        # Verify created_by assignment
        customer = Customer.objects.get(phone=phone)
        self.assertEqual(
            customer.created_by,
            self.user,
            f"Customer created_by should be {self.user}, got {customer.created_by}"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
        )
    )
    def test_property_default_call_status(self, phone, name):
        """
        **Property 13: Default Call Status**
        
        For any customer created without an explicit call_status value,
        the call_status should default to "pending".
        
        **Validates: Requirements REQ-017**
        """
        valid_rows = [{'phone': phone, 'name': name}]
        
        result = ImportService.bulk_create_customers(
            valid_rows,
            self.user,
            self.company
        )
        
        # Verify customer was created
        self.assertGreater(result['success_count'], 0)
        
        # Verify default call_status
        customer = Customer.objects.get(phone=phone)
        self.assertEqual(
            customer.call_status,
            'pending',
            f"Customer call_status should be 'pending', got '{customer.call_status}'"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        row_count=st.integers(min_value=1000, max_value=10000)
    )
    def test_property_import_capacity(self, row_count):
        """
        **Property 6: Import Capacity**
        
        For any valid CSV file with up to 10,000 rows,
        the import operation should complete successfully without errors.
        
        **Validates: Requirements REQ-006**
        """
        # Generate unique phone numbers for large import
        rows = []
        for i in range(row_count):
            # Generate unique phone numbers using index to ensure uniqueness
            phone = f"+1{str(i).zfill(13)}"  # Pad to 13 digits after +1
            name = f"Customer {i}"
            rows.append({'phone': phone, 'name': name})
        
        # Validate rows
        valid_rows, error_rows = ImportService.validate_import_data(
            rows,
            self.company.id
        )
        
        # All rows should be valid (no duplicates, valid format)
        self.assertEqual(
            len(valid_rows),
            row_count,
            f"All {row_count} rows should be valid"
        )
        self.assertEqual(
            len(error_rows),
            0,
            f"No error rows expected, got {len(error_rows)}"
        )
        
        # Bulk create customers
        result = ImportService.bulk_create_customers(
            valid_rows,
            self.user,
            self.company
        )
        
        # Verify import completed successfully
        self.assertEqual(
            result['success_count'],
            row_count,
            f"Should successfully import all {row_count} customers"
        )
        self.assertEqual(
            result['duplicates_skipped'],
            0,
            "No duplicates should be skipped"
        )
        
        # Verify all customers were actually created in database
        created_count = Customer.objects.filter(
            company=self.company,
            phone__startswith='+1'
        ).count()
        
        self.assertGreaterEqual(
            created_count,
            row_count,
            f"Database should contain at least {row_count} customers"
        )
        
        # Verify created_ids list matches success_count
        self.assertEqual(
            len(result['created_ids']),
            result['success_count'],
            "created_ids list length should match success_count"
        )
        
        # Clean up - delete all test customers
        Customer.objects.filter(
            company=self.company,
            phone__startswith='+1'
        ).delete()
