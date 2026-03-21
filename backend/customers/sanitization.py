"""
Input sanitization utilities for customer-to-lead conversion feature

This module provides comprehensive input sanitization to prevent:
- SQL injection attacks
- XSS (Cross-Site Scripting) attacks
- File upload vulnerabilities
- Path traversal attacks

Validates: REQ-075 - Input sanitization for security
"""
import re
import html
from typing import Any, Dict, List, Optional
from django.utils.html import escape, strip_tags
from django.core.exceptions import ValidationError


class InputSanitizer:
    """
    Centralized input sanitization service
    
    Provides methods to sanitize various types of user input to prevent
    security vulnerabilities including SQL injection, XSS, and file upload attacks.
    """
    
    # Allowed HTML tags for rich text fields (very restrictive)
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li']
    ALLOWED_ATTRIBUTES = {}
    
    # Allowed file extensions for imports
    ALLOWED_IMPORT_EXTENSIONS = ['.csv', '.xlsx', '.xls']
    
    # Maximum file size (10 MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Dangerous patterns that might indicate SQL injection attempts
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)",
        r"(--|;|\/\*|\*\/|xp_|sp_)",
        r"(\bOR\b.*=.*|1\s*=\s*1|'\s*OR\s*')",
    ]
    
    @staticmethod
    def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
        """
        Sanitize a string input by escaping HTML and removing dangerous characters
        
        Args:
            value: String to sanitize
            max_length: Optional maximum length to truncate to
            
        Returns:
            Sanitized string safe for storage and display
        """
        if not value:
            return ""
        
        # Convert to string if not already
        value = str(value)
        
        # Strip leading/trailing whitespace
        value = value.strip()
        
        # Escape HTML entities to prevent XSS
        value = escape(value)
        
        # Truncate if max_length specified
        if max_length and len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @staticmethod
    def sanitize_phone(phone: str) -> str:
        """
        Sanitize phone number input
        
        Args:
            phone: Phone number string
            
        Returns:
            Sanitized phone number containing only digits and optional + prefix
        """
        if not phone:
            return ""
        
        # Remove all characters except digits and +
        phone = re.sub(r'[^\d+]', '', str(phone))
        
        # Ensure + only appears at the start
        if '+' in phone:
            phone = '+' + phone.replace('+', '')
        
        return phone
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """
        Sanitize email input
        
        Args:
            email: Email address string
            
        Returns:
            Sanitized email address
        """
        if not email:
            return ""
        
        # Convert to lowercase and strip whitespace
        email = str(email).lower().strip()
        
        # Basic email format validation (Django will do full validation)
        # Just remove obviously dangerous characters
        email = re.sub(r'[<>"\']', '', email)
        
        return email
    
    @staticmethod
    def sanitize_text_field(text: str, allow_html: bool = False) -> str:
        """
        Sanitize text field (notes, description, etc.)
        
        Args:
            text: Text content to sanitize
            allow_html: Whether to allow safe HTML tags (default: False)
            
        Returns:
            Sanitized text safe for storage and display
        """
        if not text:
            return ""
        
        text = str(text).strip()
        
        if allow_html:
            # Strip all tags except safe ones, then escape
            # For now, we'll just strip all tags for safety
            text = strip_tags(text)
        else:
            # Escape all HTML
            text = escape(text)
        
        return text
    
    @staticmethod
    def sanitize_numeric(value: Any, allow_decimal: bool = True) -> Optional[float]:
        """
        Sanitize numeric input
        
        Args:
            value: Numeric value (can be string, int, float)
            allow_decimal: Whether to allow decimal values
            
        Returns:
            Sanitized numeric value or None if invalid
        """
        if value is None or value == "":
            return None
        
        try:
            # Convert to float first
            num = float(value)
            
            # If decimals not allowed, convert to int
            if not allow_decimal:
                num = int(num)
            
            return num
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def check_sql_injection_patterns(value: str) -> bool:
        """
        Check if input contains potential SQL injection patterns
        
        Args:
            value: String to check
            
        Returns:
            True if suspicious patterns detected, False otherwise
        """
        if not value:
            return False
        
        value_upper = str(value).upper()
        
        for pattern in InputSanitizer.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_upper, re.IGNORECASE):
                return True
        
        return False
    
    @staticmethod
    def sanitize_import_data(row: Dict[str, Any]) -> Dict[str, str]:
        """
        Sanitize a row of import data (CSV/Excel)
        
        Args:
            row: Dictionary containing import row data
            
        Returns:
            Sanitized row dictionary
            
        Raises:
            ValidationError: If suspicious patterns detected
        """
        sanitized = {}
        
        for key, value in row.items():
            if value is None:
                sanitized[key] = ""
                continue
            
            value_str = str(value).strip()
            
            # Check for SQL injection patterns
            if InputSanitizer.check_sql_injection_patterns(value_str):
                raise ValidationError(
                    f"Suspicious pattern detected in field '{key}': {value_str[:50]}"
                )
            
            # Sanitize based on field type
            if key.lower() in ['phone', 'mobile', 'contact']:
                sanitized[key] = InputSanitizer.sanitize_phone(value_str)
            elif key.lower() in ['email']:
                sanitized[key] = InputSanitizer.sanitize_email(value_str)
            elif key.lower() in ['name', 'first_name', 'last_name']:
                sanitized[key] = InputSanitizer.sanitize_string(value_str, max_length=255)
            elif key.lower() in ['notes', 'description', 'comments']:
                sanitized[key] = InputSanitizer.sanitize_text_field(value_str, allow_html=False)
            else:
                # Default: sanitize as string
                sanitized[key] = InputSanitizer.sanitize_string(value_str, max_length=500)
        
        return sanitized
    
    @staticmethod
    def sanitize_conversion_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize customer-to-lead conversion data
        
        Args:
            data: Dictionary containing conversion form data
            
        Returns:
            Sanitized data dictionary
            
        Raises:
            ValidationError: If suspicious patterns detected
        """
        sanitized = {}
        
        # String fields
        string_fields = ['name', 'address', 'preferred_location', 'requirement_type', 
                        'bhk_requirement', 'status', 'source']
        for field in string_fields:
            if field in data:
                value = data[field]
                if value:
                    value_str = str(value)
                    if InputSanitizer.check_sql_injection_patterns(value_str):
                        raise ValidationError(
                            f"Suspicious pattern detected in field '{field}'"
                        )
                    sanitized[field] = InputSanitizer.sanitize_string(value_str, max_length=255)
                else:
                    sanitized[field] = ""
        
        # Phone field
        if 'phone' in data:
            sanitized['phone'] = InputSanitizer.sanitize_phone(data['phone'])
        
        # Email field
        if 'email' in data:
            sanitized['email'] = InputSanitizer.sanitize_email(data['email'])
        
        # Text fields (allow more content)
        text_fields = ['description', 'notes']
        for field in text_fields:
            if field in data:
                value = data[field]
                if value:
                    sanitized[field] = InputSanitizer.sanitize_text_field(str(value), allow_html=False)
                else:
                    sanitized[field] = ""
        
        # Numeric fields
        numeric_fields = ['budget_min', 'budget_max']
        for field in numeric_fields:
            if field in data:
                sanitized[field] = InputSanitizer.sanitize_numeric(data[field], allow_decimal=True)
        
        # Date fields (pass through - Django will validate)
        date_fields = ['follow_up_date', 'scheduled_date', 'call_date']
        for field in date_fields:
            if field in data:
                sanitized[field] = data[field]
        
        # ID fields (ensure they're integers)
        id_fields = ['assigned_to', 'company', 'created_by']
        for field in id_fields:
            if field in data:
                try:
                    sanitized[field] = int(data[field]) if data[field] else None
                except (ValueError, TypeError):
                    sanitized[field] = None
        
        return sanitized
    
    @staticmethod
    def validate_file_upload(file_obj, allowed_extensions: Optional[List[str]] = None) -> None:
        """
        Validate uploaded file for security
        
        Args:
            file_obj: Uploaded file object
            allowed_extensions: List of allowed file extensions (default: CSV/Excel)
            
        Raises:
            ValidationError: If file validation fails
        """
        if not file_obj:
            raise ValidationError("No file provided")
        
        # Check file size
        if file_obj.size > InputSanitizer.MAX_FILE_SIZE:
            raise ValidationError(
                f"File size exceeds maximum allowed size of {InputSanitizer.MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Check file extension
        if allowed_extensions is None:
            allowed_extensions = InputSanitizer.ALLOWED_IMPORT_EXTENSIONS
        
        file_name = file_obj.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise ValidationError(
                f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Check for path traversal attempts and dangerous characters in filename
        dangerous_chars = ['..' , '/', '\\', ';', '|', '&', '$', '`', '(', ')', '{', '}', '[', ']', '<', '>']
        if any(char in file_name for char in dangerous_chars):
            raise ValidationError("Invalid file name")
        
        # Check for null bytes (potential security issue)
        if '\x00' in file_name:
            raise ValidationError("Invalid file name")
    
    @staticmethod
    def sanitize_query_param(param: str, allowed_values: Optional[List[str]] = None) -> str:
        """
        Sanitize query parameter
        
        Args:
            param: Query parameter value
            allowed_values: Optional list of allowed values (whitelist)
            
        Returns:
            Sanitized parameter value
        """
        if not param:
            return ""
        
        param = str(param).strip()
        
        # If whitelist provided, only allow whitelisted values
        if allowed_values:
            if param not in allowed_values:
                return ""
        
        # Check for SQL injection patterns
        if InputSanitizer.check_sql_injection_patterns(param):
            return ""
        
        # Escape HTML
        param = escape(param)
        
        return param
