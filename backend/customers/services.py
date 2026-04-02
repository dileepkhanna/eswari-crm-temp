"""
Service classes for customer-related business logic
"""
import re
import csv
import io
from decimal import Decimal
from typing import Tuple, Optional, List, Dict
from django.db.models import Q
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Customer
from .sanitization import InputSanitizer
from leads.models import Lead


class ValidationService:
    """
    Centralized validation service for customer and lead data
    Provides validation methods for phone numbers, budget ranges, and conversion eligibility
    """
    
    @staticmethod
    def validate_phone_number(phone: str) -> Tuple[bool, str]:
        """
        Validate phone number format (10-15 digits, optional + prefix)
        
        Args:
            phone: Phone number string to validate
            
        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if phone number is valid, False otherwise
            - error_message: Empty string if valid, descriptive error if invalid
            
        Validates:
            - REQ-002: Phone number format validation
            - REQ-015: Phone number uniqueness validation
        """
        if not phone:
            return False, "Phone number is required"
        
        # Remove whitespace
        phone = phone.strip()
        
        # Check for valid format: optional + prefix followed by 10-15 digits
        pattern = r'^\+?\d{10,15}$'
        if not re.match(pattern, phone):
            return False, "Phone number must be 10-15 digits with optional + prefix"
        
        return True, ""
    
    @staticmethod
    def check_phone_uniqueness(
        phone: str,
        company_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if phone number is unique within company scope
        
        Args:
            phone: Phone number to check
            company_id: Company ID for scoping the uniqueness check
            exclude_id: Optional customer ID to exclude from check (for updates)
            
        Returns:
            True if phone is unique (available), False if duplicate exists
            
        Validates:
            - REQ-015: Company-scoped phone uniqueness
        """
        query = Customer.objects.filter(
            phone=phone,
            company_id=company_id
        )
        
        # Exclude current customer when updating
        if exclude_id:
            query = query.exclude(id=exclude_id)
        
        return not query.exists()
    
    @staticmethod
    def validate_budget_range(
        budget_min: Decimal,
        budget_max: Decimal
    ) -> Tuple[bool, str]:
        """
        Validate budget range constraints
        
        Args:
            budget_min: Minimum budget value
            budget_max: Maximum budget value
            
        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if budget range is valid, False otherwise
            - error_message: Empty string if valid, descriptive error if invalid
            
        Validates:
            - REQ-043: Budget range validation (min <= max, both >= 0)
        """
        # Convert to Decimal if needed
        if not isinstance(budget_min, Decimal):
            budget_min = Decimal(str(budget_min))
        if not isinstance(budget_max, Decimal):
            budget_max = Decimal(str(budget_max))
        
        # Check both values are non-negative
        if budget_min < 0:
            return False, "Minimum budget must be greater than or equal to 0"
        
        if budget_max < 0:
            return False, "Maximum budget must be greater than or equal to 0"
        
        # Check min <= max
        if budget_min > budget_max:
            return False, "Minimum budget must be less than or equal to maximum budget"
        
        return True, ""
    
    @staticmethod
    def validate_conversion_eligibility(customer: Customer) -> Tuple[bool, str]:
        """
        Check if customer can be converted to lead
        
        Args:
            customer: Customer instance to validate
            
        Returns:
            Tuple of (can_convert, reason)
            - can_convert: True if customer can be converted, False otherwise
            - reason: Empty string if can convert, descriptive reason if cannot
            
        Validates:
            - REQ-035: Duplicate conversion prevention
            - REQ-042: Phone number doesn't already exist as lead
            - REQ-044: Required fields validation
        """
        # Check if already converted
        if customer.is_converted:
            return False, "Customer has already been converted to a lead"
        
        # Check if phone number is valid
        is_valid_phone, phone_error = ValidationService.validate_phone_number(customer.phone)
        if not is_valid_phone:
            return False, f"Invalid phone number: {phone_error}"
        
        # Check if phone already exists as a lead in the same company
        lead_exists = Lead.objects.filter(
            phone=customer.phone,
            company_id=customer.company_id
        ).exists()
        
        if lead_exists:
            return False, "A lead with this phone number already exists"
        
        # Check required fields
        if not customer.phone:
            return False, "Customer must have a phone number"
        
        return True, ""



class ImportService:
    """
    Service for importing customers from various file formats (CSV, Excel, clipboard)
    Handles file parsing, validation, and bulk customer creation
    """
    
    @staticmethod
    def detect_delimiter(text: str) -> str:
        """
        Auto-detect delimiter in text (tab, comma, semicolon)
        
        Args:
            text: Text content to analyze
            
        Returns:
            Detected delimiter character ('\t', ',', or ';')
            
        Validates:
            - REQ-012: Auto-detect delimiter
        """
        # Get first few lines for analysis
        lines = text.strip().split('\n')[:5]
        sample = '\n'.join(lines)
        
        # Count occurrences of each delimiter
        tab_count = sample.count('\t')
        comma_count = sample.count(',')
        semicolon_count = sample.count(';')
        
        # Return delimiter with highest count
        if tab_count >= comma_count and tab_count >= semicolon_count:
            return '\t'
        elif semicolon_count >= comma_count:
            return ';'
        else:
            return ','
    
    @staticmethod
    def parse_csv(file_obj) -> List[Dict]:
        """
        Parse CSV file and return list of customer dictionaries
        Supports flexible column headers (case-insensitive matching)
        
        Args:
            file_obj: File object or file-like object containing CSV data
            
        Returns:
            List of dictionaries with 'phone' and 'name' keys
            
        Validates:
            - REQ-001: CSV file upload support
            - REQ-010: Column header flexibility
        """
        # Read file content
        if hasattr(file_obj, 'read'):
            content = file_obj.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
        else:
            content = file_obj
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(content))
        
        # Map column headers (case-insensitive)
        rows = []
        for row in reader:
            # Find phone and name columns (case-insensitive)
            phone = None
            name = None
            
            for key, value in row.items():
                # Skip None keys (can happen with malformed CSV)
                if key is None:
                    continue
                    
                key_lower = key.lower().strip()
                if key_lower == 'phone':
                    phone = value.strip() if value else ''
                elif key_lower == 'name':
                    name = value.strip() if value else ''
            
            if phone or name:  # Include row if at least one field has data
                rows.append({
                    'phone': phone or '',
                    'name': name or ''
                })
        
        return rows
    
    @staticmethod
    def parse_excel(file_obj) -> List[Dict]:
        """
        Parse Excel file and return list of customer dictionaries
        Supports .xlsx and .xls formats, reads from first sheet
        
        Args:
            file_obj: File object containing Excel data
            
        Returns:
            List of dictionaries with 'phone' and 'name' keys
            
        Validates:
            - REQ-008: Excel file format support
            - REQ-009: Read from first sheet
            - REQ-010: Column header flexibility
        """
        try:
            import openpyxl
        except ImportError:
            raise ImportError("openpyxl library is required for Excel file parsing. Install it with: pip install openpyxl")
        
        # Load workbook
        workbook = openpyxl.load_workbook(file_obj, read_only=True)
        sheet = workbook.active
        
        # Get headers from first row
        headers = []
        for cell in sheet[1]:
            headers.append(cell.value.lower().strip() if cell.value else '')
        
        # Find phone and name column indices
        phone_idx = None
        name_idx = None
        
        for idx, header in enumerate(headers):
            if header == 'phone':
                phone_idx = idx
            elif header == 'name':
                name_idx = idx
        
        # Parse rows
        rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            phone = str(row[phone_idx]).strip() if phone_idx is not None and row[phone_idx] else ''
            name = str(row[name_idx]).strip() if name_idx is not None and row[name_idx] else ''
            
            if phone or name:  # Include row if at least one field has data
                rows.append({
                    'phone': phone,
                    'name': name
                })
        
        workbook.close()
        return rows
    
    @staticmethod
    def parse_clipboard(text: str) -> List[Dict]:
        """
        Parse clipboard text and return list of customer dictionaries
        Auto-detects delimiter and parses accordingly
        
        Args:
            text: Clipboard text content (tab, comma, or semicolon separated)
            
        Returns:
            List of dictionaries with 'phone' and 'name' keys
            
        Validates:
            - REQ-011: Clipboard paste support
            - REQ-012: Auto-detect delimiter
        """
        # Detect delimiter
        delimiter = ImportService.detect_delimiter(text)
        
        # Parse as CSV with detected delimiter
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        
        # Map column headers (case-insensitive)
        rows = []
        for row in reader:
            phone = None
            name = None
            
            for key, value in row.items():
                if key:
                    key_lower = key.lower().strip()
                    if key_lower == 'phone':
                        phone = value.strip() if value else ''
                    elif key_lower == 'name':
                        name = value.strip() if value else ''
            
            if phone or name:
                rows.append({
                    'phone': phone or '',
                    'name': name or ''
                })
        
        return rows
    
    @staticmethod
    def validate_import_data(
        rows: List[Dict],
        company_id: int
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Validate import data and return (valid_rows, error_rows)
        Checks phone format, uniqueness, and required fields
        
        Args:
            rows: List of dictionaries with 'phone' and 'name' keys
            company_id: Company ID for scoping uniqueness checks
            
        Returns:
            Tuple of (valid_rows, error_rows)
            - valid_rows: List of valid row dictionaries
            - error_rows: List of error dictionaries with 'row', 'phone', 'name', 'error' keys
            
        Validates:
            - REQ-002: Phone number format validation
            - REQ-003: Duplicate handling
            - REQ-007: Clear error messages
            - REQ-075: Input sanitization
        """
        valid_rows = []
        error_rows = []
        
        # Get existing phone numbers in this company for duplicate detection
        existing_phones = set(
            Customer.objects.filter(company_id=company_id)
            .values_list('phone', flat=True)
        )
        
        # Track phones in current import to detect duplicates within the file
        seen_phones = set()
        
        for idx, row in enumerate(rows, start=1):
            try:
                # Sanitize the entire row first
                sanitized_row = InputSanitizer.sanitize_import_data(row)
                phone = sanitized_row.get('phone', '').strip()
                name = sanitized_row.get('name', '').strip()
                
            except ValidationError as e:
                # Sanitization detected suspicious patterns
                error_rows.append({
                    'row': idx,
                    'phone': row.get('phone', ''),
                    'name': row.get('name', ''),
                    'error': str(e)
                })
                continue
            
            # Validate phone number
            if not phone:
                error_rows.append({
                    'row': idx,
                    'phone': phone,
                    'name': name,
                    'error': 'Phone number is required'
                })
                continue
            
            # Validate phone format
            is_valid, error_msg = ValidationService.validate_phone_number(phone)
            if not is_valid:
                error_rows.append({
                    'row': idx,
                    'phone': phone,
                    'name': name,
                    'error': error_msg
                })
                continue
            
            # Check for duplicates in database
            if phone in existing_phones:
                error_rows.append({
                    'row': idx,
                    'phone': phone,
                    'name': name,
                    'error': 'Phone number already exists in database'
                })
                continue
            
            # Check for duplicates within import file
            if phone in seen_phones:
                error_rows.append({
                    'row': idx,
                    'phone': phone,
                    'name': name,
                    'error': 'Duplicate phone number in import file'
                })
                continue
            
            # Valid row
            seen_phones.add(phone)
            valid_rows.append({
                'phone': phone,
                'name': name
            })
        
        return valid_rows, error_rows
    
    @staticmethod
    def bulk_create_customers(
        valid_rows: List[Dict],
        user,
        company
    ) -> Dict:
        """
        Create customers in bulk and return summary
        Uses Django's bulk_create for performance
        
        Args:
            valid_rows: List of validated row dictionaries
            user: User object (for created_by field)
            company: Company object
            
        Returns:
            Dictionary with 'success_count', 'created_ids', 'duplicates_skipped' keys
            
        Validates:
            - REQ-004: Auto-assign company
            - REQ-005: Import summary
            - REQ-006: Support up to 10,000 contacts
            - REQ-016: Auto-assign created_by
            - REQ-017: Default call_status to pending
        """
        # Prepare customer objects
        customers_to_create = []
        phones_to_create = []
        
        for row in valid_rows:
            customer = Customer(
                phone=row['phone'],
                name=row.get('name', ''),
                company=company,
                created_by=user,
                assigned_to=user,  # Auto-assign to creator
                call_status='pending'  # Default status
            )
            customers_to_create.append(customer)
            phones_to_create.append(row['phone'])
        
        # Bulk create with transaction
        with transaction.atomic():
            created_customers = Customer.objects.bulk_create(
                customers_to_create,
                ignore_conflicts=True  # Skip duplicate phone+company rows
            )
        
        # Get the created IDs by querying for the phones we just created
        created_ids = list(
            Customer.objects.filter(
                phone__in=phones_to_create,
                company=company
            ).values_list('id', flat=True)
        )
        
        # Calculate results
        success_count = len(created_customers)
        duplicates_skipped = len(valid_rows) - success_count
        
        return {
            'success_count': success_count,
            'created_ids': created_ids,
            'duplicates_skipped': duplicates_skipped
        }


class ConversionService:
    """
    Service for converting customers to leads
    Handles single and bulk conversion operations with validation and audit logging
    """
    
    @staticmethod
    def convert_single(customer: Customer, lead_data: Dict, user) -> Lead:
        """
        Convert single customer to lead with validation and audit logging
        
        Args:
            customer: Customer instance to convert
            lead_data: Dictionary containing lead-specific fields
            user: User performing the conversion
            
        Returns:
            Created Lead instance
            
        Raises:
            ValueError: If conversion validation fails
            
        Validates:
            - REQ-028: Convert to Lead action
            - REQ-029: Pre-fill lead form with customer data
            - REQ-031: Copy customer notes to lead description
            - REQ-033: Mark customer as converted
            - REQ-034: Store lead ID in customer record
            - REQ-035: Prevent duplicate conversion
            - REQ-036: Assign lead to same user as customer
            - REQ-075: Input sanitization
        """
        # Sanitize lead data first
        try:
            sanitized_data = InputSanitizer.sanitize_conversion_data(lead_data)
        except ValidationError as e:
            # Log failed conversion due to sanitization
            ConversionService.log_conversion(
                customer=customer,
                lead=None,
                user=user,
                success=False,
                error_message=f"Input sanitization failed: {str(e)}"
            )
            raise ValueError(f"Invalid input data: {str(e)}")
        
        # Validate conversion eligibility
        can_convert, reason = ValidationService.validate_conversion_eligibility(customer)
        if not can_convert:
            # Log failed conversion
            ConversionService.log_conversion(
                customer=customer,
                lead=None,
                user=user,
                success=False,
                error_message=reason
            )
            raise ValueError(reason)
        
        # Validate budget range if provided
        budget_min = sanitized_data.get('budget_min', 0)
        budget_max = sanitized_data.get('budget_max', 0)
        
        if budget_min or budget_max:
            is_valid_budget, budget_error = ValidationService.validate_budget_range(
                Decimal(str(budget_min)),
                Decimal(str(budget_max))
            )
            if not is_valid_budget:
                ConversionService.log_conversion(
                    customer=customer,
                    lead=None,
                    user=user,
                    success=False,
                    error_message=budget_error
                )
                raise ValueError(budget_error)
        
        # Prepare lead data by merging customer data with additional fields
        prepared_data = ConversionService.prepare_lead_data(customer, sanitized_data)
        
        # Use transaction for atomicity
        try:
            with transaction.atomic():
                # Create lead
                lead = Lead.objects.create(**prepared_data)
                
                # Mark customer as converted
                ConversionService.mark_customer_converted(customer, lead)
                
                # Log successful conversion
                ConversionService.log_conversion(
                    customer=customer,
                    lead=lead,
                    user=user,
                    success=True
                )
                
                return lead
                
        except Exception as e:
            # Log failed conversion
            ConversionService.log_conversion(
                customer=customer,
                lead=None,
                user=user,
                success=False,
                error_message=str(e)
            )
            raise
    
    @staticmethod
    def convert_bulk(
        customer_ids: List[int],
        default_values: Dict,
        user
    ) -> Dict:
        """
        Convert multiple customers to leads with default values
        
        Args:
            customer_ids: List of customer IDs to convert
            default_values: Dictionary of default values to apply to all conversions
            user: User performing the conversion
            
        Returns:
            Dictionary with conversion summary:
            - total: Total number of customers processed
            - success_count: Number of successful conversions
            - skipped_count: Number of already-converted customers skipped
            - error_count: Number of failed conversions
            - errors: List of error details
            
        Validates:
            - REQ-037: Bulk conversion support
            - REQ-038: Apply default values to all conversions
            - REQ-039: Skip already-converted customers
            - REQ-040: Return comprehensive summary
            - REQ-041: Support up to 100 customers per operation
            - REQ-075: Input sanitization
        """
        # Validate capacity limit
        if len(customer_ids) > 100:
            raise ValueError("Bulk conversion supports up to 100 customers per operation")
        
        # Sanitize default values first
        try:
            sanitized_defaults = InputSanitizer.sanitize_conversion_data(default_values)
        except ValidationError as e:
            raise ValueError(f"Invalid default values: {str(e)}")
        
        # Initialize counters
        success_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        # Get all customers in one query
        customers = Customer.objects.filter(
            id__in=customer_ids
        ).select_related('company')
        
        # Create a mapping of customer_id to customer object
        customer_map = {customer.id: customer for customer in customers}
        
        # Process each customer
        for customer_id in customer_ids:
            customer = customer_map.get(customer_id)
            
            # Check if customer exists
            if not customer:
                error_count += 1
                errors.append({
                    'customer_id': customer_id,
                    'error': 'Customer not found'
                })
                continue
            
            # Check if already converted (skip)
            if customer.is_converted:
                skipped_count += 1
                continue
            
            # Attempt conversion
            try:
                # Merge default values with customer-specific data
                lead_data = default_values.copy()
                
                # Convert single customer
                ConversionService.convert_single(customer, lead_data, user)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append({
                    'customer_id': customer_id,
                    'customer_name': customer.name or 'Unknown',
                    'customer_phone': customer.phone,
                    'error': str(e)
                })
        
        return {
            'total': len(customer_ids),
            'success_count': success_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'errors': errors
        }
    
    @staticmethod
    def prepare_lead_data(customer: Customer, additional_data: Dict) -> Dict:
        """
        Prepare lead data by merging customer data with additional fields
        
        Args:
            customer: Customer instance
            additional_data: Dictionary of additional lead fields
            
        Returns:
            Dictionary of complete lead data ready for Lead.objects.create()
            
        Validates:
            - REQ-029: Pre-fill lead form with customer data
            - REQ-031: Copy customer notes to lead description
            - REQ-032: Set lead source to customer_conversion
            - REQ-036: Assign lead to same user as customer
        """
        # Start with customer data
        lead_data = {
            'name': customer.name or '',
            'phone': customer.phone,
            'company': customer.company,
            'source': 'customer_conversion',
            'created_by': additional_data.get('created_by', customer.created_by),
        }
        
        # Assign to customer's assigned_to user, or current user if not set
        if customer.assigned_to:
            lead_data['assigned_to'] = customer.assigned_to
        elif 'assigned_to' in additional_data:
            lead_data['assigned_to'] = additional_data['assigned_to']
        
        # Copy customer notes to lead description
        if customer.notes:
            existing_description = additional_data.get('description', '')
            if existing_description:
                lead_data['description'] = f"{customer.notes}\n\n{existing_description}"
            else:
                lead_data['description'] = customer.notes
        
        # Merge additional data (email, address, requirements, etc.)
        # These fields override or supplement the customer data
        for key, value in additional_data.items():
            if key not in ['created_by', 'assigned_to', 'description', 'source', 'company']:
                lead_data[key] = value
            elif key == 'description' and not customer.notes:
                # Only use additional description if customer has no notes
                lead_data[key] = value
        
        return lead_data
    
    @staticmethod
    def mark_customer_converted(customer: Customer, lead: Lead) -> None:
        """
        Update customer with conversion status and lead reference
        
        Args:
            customer: Customer instance to update
            lead: Lead instance that was created
            
        Validates:
            - REQ-033: Mark customer as converted (is_converted = true)
            - REQ-034: Store lead ID in customer record (converted_lead_id)
        """
        customer.is_converted = True
        customer.converted_lead_id = str(lead.id)
        customer.save(update_fields=['is_converted', 'converted_lead_id', 'updated_at'])
    
    @staticmethod
    def log_conversion(
        customer: Customer,
        lead: Optional[Lead],
        user,
        success: bool = True,
        error_message: str = ''
    ) -> None:
        """
        Create audit log entry for conversion operation
        
        Args:
            customer: Customer instance
            lead: Lead instance (None if conversion failed)
            user: User who performed the conversion
            success: Whether conversion was successful
            error_message: Error message if conversion failed
            
        Validates:
            - REQ-071: Log all conversion operations for audit
        """
        from .models import ConversionAuditLog
        
        # Determine action type
        action = 'convert_single' if success else 'conversion_failed'
        
        # Create audit log entry
        ConversionAuditLog.objects.create(
            action=action,
            customer_id=customer.id,
            customer_phone=customer.phone,
            customer_name=customer.name or '',
            lead_id=lead.id if lead else None,
            performed_by=user,
            company=customer.company,
            success=success,
            error_message=error_message,
            metadata={
                'customer_call_status': customer.call_status,
                'customer_notes': customer.notes or '',
            }
        )



class AnalyticsService:
    """
    Service for calculating conversion analytics and metrics
    Provides conversion rate, time-to-conversion, and aggregation methods
    """
    
    @staticmethod
    def get_conversion_rate(
        company_id: int,
        start_date=None,
        end_date=None
    ) -> Dict:
        """
        Calculate conversion rate (converted / total customers) * 100
        
        Args:
            company_id: Company ID for scoping the calculation
            start_date: Optional start date for filtering (datetime or date object)
            end_date: Optional end date for filtering (datetime or date object)
            
        Returns:
            Dictionary with:
            - total_customers: Total number of customers
            - converted_customers: Number of converted customers
            - conversion_rate: Percentage (0-100)
            - period: Dict with start and end dates if provided
            
        Validates:
            - REQ-053: Track conversion rate (customers → leads)
            - REQ-059: Show conversion rate percentage
        """
        from django.db.models import Count, Q
        
        # Base query for company
        query = Customer.objects.filter(company_id=company_id)
        
        # Apply date range filter if provided
        if start_date:
            query = query.filter(created_at__gte=start_date)
        if end_date:
            query = query.filter(created_at__lte=end_date)
        
        # Get counts
        total_customers = query.count()
        converted_customers = query.filter(is_converted=True).count()
        
        # Calculate conversion rate
        if total_customers > 0:
            conversion_rate = (converted_customers / total_customers) * 100
        else:
            conversion_rate = 0.0
        
        result = {
            'total_customers': total_customers,
            'converted_customers': converted_customers,
            'conversion_rate': round(conversion_rate, 2)
        }
        
        # Add period info if dates provided
        if start_date or end_date:
            result['period'] = {
                'start': start_date.isoformat() if start_date else None,
                'end': end_date.isoformat() if end_date else None
            }
        
        return result
    
    @staticmethod
    def get_average_time_to_conversion(company_id: int) -> Optional[float]:
        """
        Calculate average time from customer creation to conversion
        Uses AVG(lead.created_at - customer.created_at) for converted customers
        
        Args:
            company_id: Company ID for scoping the calculation
            
        Returns:
            Average time in days (float), or None if no conversions
            
        Validates:
            - REQ-054: Calculate average time to conversion
        """
        from django.db.models import Avg, F, ExpressionWrapper, fields
        from django.db.models.functions import Extract
        
        # Get converted customers with their leads
        converted_customers = Customer.objects.filter(
            company_id=company_id,
            is_converted=True,
            converted_lead_id__isnull=False
        )
        
        # Calculate time differences
        total_seconds = 0
        count = 0
        
        for customer in converted_customers:
            try:
                # Get the corresponding lead
                lead = Lead.objects.get(
                    id=customer.converted_lead_id,
                    company_id=company_id
                )
                
                # Calculate time difference in seconds
                time_diff = (lead.created_at - customer.created_at).total_seconds()
                total_seconds += time_diff
                count += 1
                
            except Lead.DoesNotExist:
                # Skip if lead not found
                continue
        
        # Calculate average in days
        if count > 0:
            avg_seconds = total_seconds / count
            avg_days = avg_seconds / (24 * 60 * 60)  # Convert to days
            return round(avg_days, 2)
        
        return None
    
    @staticmethod
    def get_conversion_by_user(
        company_id: int,
        start_date=None,
        end_date=None
    ) -> List[Dict]:
        """
        Get conversion counts grouped by user
        
        Args:
            company_id: Company ID for scoping the calculation
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            
        Returns:
            List of dictionaries with:
            - user_id: User ID
            - user_name: User's full name or username
            - total_customers: Total customers assigned to user
            - converted: Number of converted customers
            - conversion_rate: Percentage (0-100)
            
        Validates:
            - REQ-055: Show conversion by user
            - REQ-060: Show top converters (users)
        """
        from django.db.models import Count, Q, Case, When, IntegerField
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Base query
        query = Customer.objects.filter(company_id=company_id)
        
        # Apply date range filter if provided
        if start_date:
            query = query.filter(created_at__gte=start_date)
        if end_date:
            query = query.filter(created_at__lte=end_date)
        
        # Group by created_by user
        user_stats = query.values('created_by').annotate(
            total_customers=Count('id'),
            converted=Count('id', filter=Q(is_converted=True))
        ).order_by('-converted')
        
        # Build result list with user details
        results = []
        for stat in user_stats:
            user_id = stat['created_by']
            total = stat['total_customers']
            converted = stat['converted']
            
            # Calculate conversion rate
            if total > 0:
                conversion_rate = (converted / total) * 100
            else:
                conversion_rate = 0.0
            
            # Get user details
            try:
                user = User.objects.get(id=user_id)
                user_name = user.get_full_name() or user.username
            except User.DoesNotExist:
                user_name = 'Unknown User'
            
            results.append({
                'user_id': user_id,
                'user_name': user_name,
                'total_customers': total,
                'converted': converted,
                'conversion_rate': round(conversion_rate, 2)
            })
        
        return results
    
    @staticmethod
    def get_conversion_by_call_status(company_id: int) -> List[Dict]:
        """
        Get conversion counts grouped by call status
        
        Args:
            company_id: Company ID for scoping the calculation
            
        Returns:
            List of dictionaries with:
            - call_status: Call status value
            - total_customers: Total customers with this status
            - converted: Number of converted customers
            - conversion_rate: Percentage (0-100)
            
        Validates:
            - REQ-056: Show conversion by call status
        """
        from django.db.models import Count, Q
        
        # Group by call_status
        status_stats = Customer.objects.filter(
            company_id=company_id
        ).values('call_status').annotate(
            total_customers=Count('id'),
            converted=Count('id', filter=Q(is_converted=True))
        ).order_by('-converted')
        
        # Build result list
        results = []
        for stat in status_stats:
            call_status = stat['call_status']
            total = stat['total_customers']
            converted = stat['converted']
            
            # Calculate conversion rate
            if total > 0:
                conversion_rate = (converted / total) * 100
            else:
                conversion_rate = 0.0
            
            results.append({
                'call_status': call_status or 'unknown',
                'total_customers': total,
                'converted': converted,
                'conversion_rate': round(conversion_rate, 2)
            })
        
        return results
    
    @staticmethod
    def get_conversion_trend(
        company_id: int,
        days: int = 30
    ) -> List[Dict]:
        """
        Get daily conversion counts for trend chart
        
        Args:
            company_id: Company ID for scoping the calculation
            days: Number of days to include in trend (default 30)
            
        Returns:
            List of dictionaries with:
            - date: Date string (YYYY-MM-DD)
            - conversions: Number of conversions on that date
            
        Validates:
            - REQ-057: Display conversion trend over time
        """
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        # Calculate start date
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get conversions grouped by date
        # We need to join with Lead to get the conversion date (lead.created_at)
        conversions_by_date = {}
        
        # Get all converted customers in the date range
        converted_customers = Customer.objects.filter(
            company_id=company_id,
            is_converted=True,
            converted_lead_id__isnull=False
        )
        
        for customer in converted_customers:
            try:
                # Get the corresponding lead
                lead = Lead.objects.get(
                    id=customer.converted_lead_id,
                    company_id=company_id
                )
                
                # Check if lead was created in our date range
                if start_date <= lead.created_at <= end_date:
                    date_key = lead.created_at.date().isoformat()
                    conversions_by_date[date_key] = conversions_by_date.get(date_key, 0) + 1
                    
            except Lead.DoesNotExist:
                continue
        
        # Build complete trend with all dates (including zeros)
        trend = []
        current_date = start_date.date()
        end_date_only = end_date.date()
        
        while current_date <= end_date_only:
            date_key = current_date.isoformat()
            trend.append({
                'date': date_key,
                'conversions': conversions_by_date.get(date_key, 0)
            })
            current_date += timedelta(days=1)
        
        return trend


    @staticmethod
    def get_pending_conversions_count(company_id: int) -> Dict:
        """
        Get count of customers with is_converted=false (pending conversions)

        Args:
            company_id: Company ID for scoping the calculation

        Returns:
            Dictionary with:
            - pending_conversions: Number of customers with is_converted=false
            - total_customers: Total number of customers
            - converted_customers: Number of customers with is_converted=true

        Validates:
            - REQ-058: Show "Pending Conversions" count
        """
        # Get counts
        total_customers = Customer.objects.filter(company_id=company_id).count()
        converted_customers = Customer.objects.filter(
            company_id=company_id,
            is_converted=True
        ).count()
        pending_conversions = Customer.objects.filter(
            company_id=company_id,
            is_converted=False
        ).count()

        return {
            'pending_conversions': pending_conversions,
            'total_customers': total_customers,
            'converted_customers': converted_customers
        }

