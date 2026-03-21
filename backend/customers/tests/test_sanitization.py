"""
Tests for input sanitization utilities

Validates: REQ-075 - Input sanitization for security
"""
import pytest
from django.core.exceptions import ValidationError
from django.test import TestCase
from customers.sanitization import InputSanitizer


class TestInputSanitizer(TestCase):
    """Test suite for InputSanitizer class"""
    
    def test_sanitize_string_basic(self):
        """Test basic string sanitization"""
        result = InputSanitizer.sanitize_string("  Hello World  ")
        self.assertEqual(result, "Hello World")
    
    def test_sanitize_string_xss_prevention(self):
        """Test XSS attack prevention in string sanitization"""
        malicious = "<script>alert('XSS')</script>"
        result = InputSanitizer.sanitize_string(malicious)
        # Should escape HTML entities
        self.assertNotIn("<script>", result)
        self.assertIn("&lt;script&gt;", result)
    
    def test_sanitize_string_max_length(self):
        """Test string truncation"""
        long_string = "a" * 1000
        result = InputSanitizer.sanitize_string(long_string, max_length=100)
        self.assertEqual(len(result), 100)
    
    def test_sanitize_phone_basic(self):
        """Test phone number sanitization"""
        result = InputSanitizer.sanitize_phone("+1 (555) 123-4567")
        self.assertEqual(result, "+15551234567")
    
    def test_sanitize_phone_removes_invalid_chars(self):
        """Test phone sanitization removes invalid characters"""
        result = InputSanitizer.sanitize_phone("555-abc-1234")
        self.assertEqual(result, "5551234")
    
    def test_sanitize_email_basic(self):
        """Test email sanitization"""
        result = InputSanitizer.sanitize_email("  TEST@EXAMPLE.COM  ")
        self.assertEqual(result, "test@example.com")
    
    def test_sanitize_email_removes_dangerous_chars(self):
        """Test email sanitization removes dangerous characters"""
        result = InputSanitizer.sanitize_email("test<script>@example.com")
        self.assertNotIn("<", result)
        self.assertNotIn(">", result)
    
    def test_sanitize_text_field_no_html(self):
        """Test text field sanitization without HTML"""
        text = "This is <b>bold</b> text"
        result = InputSanitizer.sanitize_text_field(text, allow_html=False)
        self.assertNotIn("<b>", result)
        self.assertIn("&lt;b&gt;", result)
    
    def test_sanitize_text_field_with_safe_html(self):
        """Test text field sanitization with safe HTML allowed"""
        text = "This is <p>paragraph</p> and <script>alert('xss')</script>"
        result = InputSanitizer.sanitize_text_field(text, allow_html=True)
        # Should allow <p> but strip <script>
        self.assertIn("<p>", result)
        self.assertNotIn("<script>", result)
    
    def test_sanitize_numeric_valid(self):
        """Test numeric sanitization with valid input"""
        result = InputSanitizer.sanitize_numeric("123.45")
        self.assertEqual(result, 123.45)
    
    def test_sanitize_numeric_invalid(self):
        """Test numeric sanitization with invalid input"""
        result = InputSanitizer.sanitize_numeric("not a number")
        self.assertIsNone(result)
    
    def test_sanitize_numeric_integer_only(self):
        """Test numeric sanitization for integers only"""
        result = InputSanitizer.sanitize_numeric("123.45", allow_decimal=False)
        self.assertEqual(result, 123)
    
    def test_check_sql_injection_patterns_select(self):
        """Test SQL injection pattern detection - SELECT"""
        result = InputSanitizer.check_sql_injection_patterns("SELECT * FROM users")
        self.assertTrue(result)
    
    def test_check_sql_injection_patterns_union(self):
        """Test SQL injection pattern detection - UNION"""
        result = InputSanitizer.check_sql_injection_patterns("1' UNION SELECT password")
        self.assertTrue(result)
    
    def test_check_sql_injection_patterns_comment(self):
        """Test SQL injection pattern detection - SQL comments"""
        result = InputSanitizer.check_sql_injection_patterns("admin'--")
        self.assertTrue(result)
    
    def test_check_sql_injection_patterns_or_equals(self):
        """Test SQL injection pattern detection - OR 1=1"""
        result = InputSanitizer.check_sql_injection_patterns("' OR 1=1--")
        self.assertTrue(result)
    
    def test_check_sql_injection_patterns_safe_input(self):
        """Test SQL injection pattern detection with safe input"""
        result = InputSanitizer.check_sql_injection_patterns("John Doe")
        self.assertFalse(result)
    
    def test_sanitize_import_data_valid(self):
        """Test import data sanitization with valid data"""
        row = {
            'phone': '+1-555-1234',
            'name': '  John Doe  ',
            'email': 'JOHN@EXAMPLE.COM'
        }
        result = InputSanitizer.sanitize_import_data(row)
        self.assertEqual(result['phone'], '+15551234')
        self.assertEqual(result['name'], 'John Doe')
        self.assertEqual(result['email'], 'john@example.com')
    
    def test_sanitize_import_data_sql_injection(self):
        """Test import data sanitization detects SQL injection"""
        row = {
            'phone': '1234567890',
            'name': "'; DROP TABLE users--"
        }
        with self.assertRaises(ValidationError):
            InputSanitizer.sanitize_import_data(row)
    
    def test_sanitize_import_data_xss(self):
        """Test import data sanitization handles XSS"""
        row = {
            'phone': '1234567890',
            'name': '<script>alert("xss")</script>'
        }
        result = InputSanitizer.sanitize_import_data(row)
        # Should escape HTML
        self.assertNotIn('<script>', result['name'])
    
    def test_sanitize_conversion_data_valid(self):
        """Test conversion data sanitization with valid data"""
        data = {
            'name': 'John Doe',
            'phone': '+1-555-1234',
            'email': 'john@example.com',
            'budget_min': '5000000',
            'budget_max': '7000000',
            'description': 'Looking for 3BHK apartment'
        }
        result = InputSanitizer.sanitize_conversion_data(data)
        self.assertEqual(result['phone'], '+15551234')
        self.assertEqual(result['budget_min'], 5000000.0)
        self.assertEqual(result['budget_max'], 7000000.0)
    
    def test_sanitize_conversion_data_sql_injection(self):
        """Test conversion data sanitization detects SQL injection"""
        data = {
            'name': "'; DROP TABLE leads--",
            'phone': '1234567890'
        }
        with self.assertRaises(ValidationError):
            InputSanitizer.sanitize_conversion_data(data)
    
    def test_sanitize_conversion_data_xss_in_description(self):
        """Test conversion data sanitization handles XSS in description"""
        data = {
            'description': '<script>alert("xss")</script>Looking for apartment'
        }
        result = InputSanitizer.sanitize_conversion_data(data)
        # Should escape HTML in description
        self.assertNotIn('<script>', result['description'])
    
    def test_validate_file_upload_valid_csv(self):
        """Test file upload validation with valid CSV"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        file_obj = SimpleUploadedFile(
            "test.csv",
            b"phone,name\n1234567890,John Doe",
            content_type="text/csv"
        )
        # Should not raise exception
        InputSanitizer.validate_file_upload(file_obj)
    
    def test_validate_file_upload_invalid_extension(self):
        """Test file upload validation rejects invalid extension"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        file_obj = SimpleUploadedFile(
            "test.exe",
            b"malicious content",
            content_type="application/x-msdownload"
        )
        with self.assertRaises(ValidationError) as context:
            InputSanitizer.validate_file_upload(file_obj)
        self.assertIn("Invalid file type", str(context.exception))
    
    def test_validate_file_upload_too_large(self):
        """Test file upload validation rejects files that are too large"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        # Create a file larger than 10MB
        large_content = b"x" * (11 * 1024 * 1024)
        file_obj = SimpleUploadedFile(
            "large.csv",
            large_content,
            content_type="text/csv"
        )
        with self.assertRaises(ValidationError) as context:
            InputSanitizer.validate_file_upload(file_obj)
        self.assertIn("File size exceeds", str(context.exception))
    
    def test_validate_file_upload_path_traversal(self):
        """Test file upload validation detects path traversal attempts"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        file_obj = SimpleUploadedFile(
            "../../../etc/passwd",
            b"content",
            content_type="text/csv"
        )
        with self.assertRaises(ValidationError) as context:
            InputSanitizer.validate_file_upload(file_obj)
        self.assertIn("Invalid file name", str(context.exception))
    
    def test_validate_file_upload_null_byte(self):
        """Test file upload validation detects null byte injection"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        file_obj = SimpleUploadedFile(
            "test\x00.csv",
            b"content",
            content_type="text/csv"
        )
        with self.assertRaises(ValidationError) as context:
            InputSanitizer.validate_file_upload(file_obj)
        self.assertIn("Invalid file name", str(context.exception))
    
    def test_sanitize_query_param_with_whitelist(self):
        """Test query parameter sanitization with whitelist"""
        result = InputSanitizer.sanitize_query_param(
            "true",
            allowed_values=["true", "false", "all"]
        )
        self.assertEqual(result, "true")
    
    def test_sanitize_query_param_invalid_value(self):
        """Test query parameter sanitization rejects invalid value"""
        result = InputSanitizer.sanitize_query_param(
            "invalid",
            allowed_values=["true", "false", "all"]
        )
        self.assertEqual(result, "")
    
    def test_sanitize_query_param_sql_injection(self):
        """Test query parameter sanitization detects SQL injection"""
        result = InputSanitizer.sanitize_query_param("'; DROP TABLE users--")
        self.assertEqual(result, "")
    
    def test_sanitize_query_param_xss(self):
        """Test query parameter sanitization handles XSS"""
        result = InputSanitizer.sanitize_query_param("<script>alert('xss')</script>")
        # Should escape HTML
        self.assertNotIn("<script>", result)


class TestSanitizationIntegration(TestCase):
    """Integration tests for sanitization in real scenarios"""
    
    def test_import_with_malicious_data(self):
        """Test that import process sanitizes malicious data"""
        rows = [
            {'phone': '1234567890', 'name': 'John Doe'},
            {'phone': '0987654321', 'name': '<script>alert("xss")</script>'},
        ]
        
        # First row should pass, second should be sanitized
        for row in rows:
            try:
                sanitized = InputSanitizer.sanitize_import_data(row)
                # XSS should be escaped
                self.assertNotIn('<script>', sanitized.get('name', ''))
            except ValidationError:
                # SQL injection should be caught
                pass
    
    def test_conversion_with_malicious_data(self):
        """Test that conversion process sanitizes malicious data"""
        data = {
            'name': 'John Doe',
            'description': '<img src=x onerror=alert("xss")>',
            'budget_min': 5000000,
            'budget_max': 7000000
        }
        
        sanitized = InputSanitizer.sanitize_conversion_data(data)
        # XSS should be escaped
        self.assertNotIn('<img', sanitized['description'])
        self.assertNotIn('onerror', sanitized['description'])
