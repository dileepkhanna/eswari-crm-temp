"""
Property-based tests for ValidationService

This test suite uses hypothesis to verify universal properties of the validation logic
across a wide range of inputs, ensuring correctness beyond specific examples.

**Validates: Requirements REQ-002, REQ-015, REQ-043**
"""

from decimal import Decimal
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from customers.services import ValidationService
from customers.models import Customer
from accounts.models import Company

User = get_user_model()


# Custom strategies for domain-specific data
@st.composite
def valid_phone_numbers(draw):
    """
    Generate valid phone numbers (10-15 digits, optional + prefix)
    """
    has_plus = draw(st.booleans())
    digit_count = draw(st.integers(min_value=10, max_value=15))
    digits = draw(st.text(min_size=digit_count, max_size=digit_count, alphabet='0123456789'))
    
    if has_plus:
        return f"+{digits}"
    return digits


@st.composite
def invalid_phone_numbers(draw):
    """
    Generate invalid phone numbers (various invalid formats)
    """
    strategy = draw(st.sampled_from([
        'too_short',      # Less than 10 digits
        'too_long',       # More than 15 digits
        'has_letters',    # Contains letters
        'has_special',    # Contains special chars (except +)
        'empty',          # Empty string
        'whitespace',     # Only whitespace
        'plus_middle',    # + in wrong position
    ]))
    
    if strategy == 'too_short':
        digit_count = draw(st.integers(min_value=1, max_value=9))
        return draw(st.text(min_size=digit_count, max_size=digit_count, alphabet='0123456789'))
    elif strategy == 'too_long':
        digit_count = draw(st.integers(min_value=16, max_value=25))
        return draw(st.text(min_size=digit_count, max_size=digit_count, alphabet='0123456789'))
    elif strategy == 'has_letters':
        return draw(st.text(min_size=10, max_size=15, alphabet='0123456789abcdefghijklmnopqrstuvwxyz'))
    elif strategy == 'has_special':
        base_digits = draw(st.text(min_size=10, max_size=15, alphabet='0123456789'))
        special_char = draw(st.sampled_from(['-', '(', ')', ' ', '.', '#', '*']))
        insert_pos = draw(st.integers(min_value=0, max_value=len(base_digits)))
        return base_digits[:insert_pos] + special_char + base_digits[insert_pos:]
    elif strategy == 'empty':
        return ''
    elif strategy == 'whitespace':
        return '   '
    elif strategy == 'plus_middle':
        digits = draw(st.text(min_size=10, max_size=15, alphabet='0123456789'))
        insert_pos = draw(st.integers(min_value=1, max_value=len(digits)-1))
        return digits[:insert_pos] + '+' + digits[insert_pos:]
    
    return ''


class TestPhoneValidationProperties(TestCase):
    """
    Property-based tests for phone number validation
    
    **Validates: Requirements REQ-002, REQ-015**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company PBT',
            code='TEST_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_pbt',
            email='test_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(phone=valid_phone_numbers())
    def test_property_valid_phone_format_accepted(self, phone):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any valid phone number (10-15 digits, optional + prefix),
        the validation function should accept it.
        
        **Validates: Requirements REQ-002**
        """
        is_valid, error_message = ValidationService.validate_phone_number(phone)
        
        # Valid phone numbers should be accepted
        self.assertTrue(
            is_valid,
            f"Valid phone '{phone}' was rejected with error: {error_message}"
        )
        self.assertEqual(
            error_message,
            "",
            f"Valid phone '{phone}' should have empty error message"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(phone=invalid_phone_numbers())
    def test_property_invalid_phone_format_rejected(self, phone):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any invalid phone number (wrong length, special characters, etc.),
        the validation function should reject it.
        
        **Validates: Requirements REQ-002**
        """
        # Skip if the invalid generator accidentally created a valid phone
        # (e.g., if random text happens to be 10-15 digits)
        import re
        if re.match(r'^\+?\d{10,15}$', phone.strip()):
            assume(False)
        
        is_valid, error_message = ValidationService.validate_phone_number(phone)
        
        # Invalid phone numbers should be rejected
        self.assertFalse(
            is_valid,
            f"Invalid phone '{phone}' was incorrectly accepted"
        )
        self.assertNotEqual(
            error_message,
            "",
            f"Invalid phone '{phone}' should have an error message"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc')))
    )
    def test_property_phone_uniqueness_within_company(self, phone, name):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any phone number, uniqueness check should reject duplicate phone numbers
        within the same company and accept unique phone numbers.
        
        **Validates: Requirements REQ-015**
        """
        # First check: phone should be unique (no existing customer)
        is_unique = ValidationService.check_phone_uniqueness(
            phone=phone,
            company_id=self.company.id
        )
        self.assertTrue(
            is_unique,
            f"Phone '{phone}' should be unique before creating customer"
        )
        
        # Create a customer with this phone number
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user
        )
        
        # Second check: phone should NOT be unique (customer exists)
        is_unique_after = ValidationService.check_phone_uniqueness(
            phone=phone,
            company_id=self.company.id
        )
        self.assertFalse(
            is_unique_after,
            f"Phone '{phone}' should NOT be unique after creating customer"
        )
        
        # Third check: phone should be unique when excluding the existing customer
        is_unique_excluded = ValidationService.check_phone_uniqueness(
            phone=phone,
            company_id=self.company.id,
            exclude_id=customer.id
        )
        self.assertTrue(
            is_unique_excluded,
            f"Phone '{phone}' should be unique when excluding the existing customer"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc')))
    )
    def test_property_phone_uniqueness_across_companies(self, phone, name):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any phone number, the same phone can exist in different companies
        (uniqueness is scoped to company).
        
        **Validates: Requirements REQ-015**
        """
        # Create a second company with unique code
        company2 = Company.objects.create(
            name=f'Test Company 2 {phone[:5]}',
            code=f'TEST2_{phone[:5]}',
            is_active=True
        )
        
        user2 = User.objects.create_user(
            username=f'test_user_{phone[:5]}',
            email=f'test_{phone[:5]}@example.com',
            password='testpass123',
            role='admin',
            company=company2
        )
        
        # Create customer in first company
        customer1 = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user
        )
        
        # Phone should NOT be unique in company 1
        is_unique_company1 = ValidationService.check_phone_uniqueness(
            phone=phone,
            company_id=self.company.id
        )
        self.assertFalse(
            is_unique_company1,
            f"Phone '{phone}' should NOT be unique in company 1"
        )
        
        # Phone SHOULD be unique in company 2 (different company)
        is_unique_company2 = ValidationService.check_phone_uniqueness(
            phone=phone,
            company_id=company2.id
        )
        self.assertTrue(
            is_unique_company2,
            f"Phone '{phone}' should be unique in company 2 (different company)"
        )
        
        # Clean up
        customer1.delete()
        user2.delete()
        company2.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(phone=valid_phone_numbers())
    def test_property_validation_consistency(self, phone):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any phone number, calling the validation function multiple times
        with the same input should always return the same result (idempotency).
        
        **Validates: Requirements REQ-002**
        """
        # Call validation multiple times
        result1 = ValidationService.validate_phone_number(phone)
        result2 = ValidationService.validate_phone_number(phone)
        result3 = ValidationService.validate_phone_number(phone)
        
        # All results should be identical
        self.assertEqual(
            result1,
            result2,
            f"Validation results should be consistent for phone '{phone}'"
        )
        self.assertEqual(
            result2,
            result3,
            f"Validation results should be consistent for phone '{phone}'"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        whitespace_before=st.text(min_size=0, max_size=5, alphabet=' \t'),
        whitespace_after=st.text(min_size=0, max_size=5, alphabet=' \t')
    )
    def test_property_whitespace_handling(self, phone, whitespace_before, whitespace_after):
        """
        **Property 2: Phone Number Validation Consistency**
        
        For any valid phone number with surrounding whitespace,
        the validation should handle it correctly (trim and validate).
        
        **Validates: Requirements REQ-002**
        """
        phone_with_whitespace = f"{whitespace_before}{phone}{whitespace_after}"
        
        is_valid, error_message = ValidationService.validate_phone_number(phone_with_whitespace)
        
        # Should accept valid phone even with whitespace
        self.assertTrue(
            is_valid,
            f"Valid phone '{phone}' with whitespace should be accepted"
        )
        self.assertEqual(
            error_message,
            "",
            f"Valid phone '{phone}' with whitespace should have empty error message"
        )



class TestBudgetValidationProperties(TestCase):
    """
    Property-based tests for budget range validation
    
    **Validates: Requirements REQ-043**
    """
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_min=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        ),
        budget_max=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_valid_budget_range_accepted(self, budget_min, budget_max):
        """
        **Property 31: Budget Range Validation**
        
        For any budget range where min <= max and both >= 0,
        the validation function should accept it.
        
        **Validates: Requirements REQ-043**
        """
        # Ensure min <= max for this test
        if budget_min > budget_max:
            budget_min, budget_max = budget_max, budget_min
        
        is_valid, error_message = ValidationService.validate_budget_range(
            budget_min=budget_min,
            budget_max=budget_max
        )
        
        # Valid budget ranges should be accepted
        self.assertTrue(
            is_valid,
            f"Valid budget range [{budget_min}, {budget_max}] was rejected with error: {error_message}"
        )
        self.assertEqual(
            error_message,
            "",
            f"Valid budget range [{budget_min}, {budget_max}] should have empty error message"
        )
    
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.data_too_large])
    @given(
        budget_min=st.decimals(
            min_value=1,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        ),
        budget_max=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_invalid_budget_range_rejected(self, budget_min, budget_max):
        """
        **Property 31: Budget Range Validation**
        
        For any budget range where min > max,
        the validation function should reject it.
        
        **Validates: Requirements REQ-043**
        """
        # Ensure min > max for this test
        if budget_min <= budget_max:
            assume(False)
        
        is_valid, error_message = ValidationService.validate_budget_range(
            budget_min=budget_min,
            budget_max=budget_max
        )
        
        # Invalid budget ranges (min > max) should be rejected
        self.assertFalse(
            is_valid,
            f"Invalid budget range [{budget_min}, {budget_max}] (min > max) was incorrectly accepted"
        )
        self.assertIn(
            "less than or equal to",
            error_message.lower(),
            f"Error message should mention min/max constraint for range [{budget_min}, {budget_max}]"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_value=st.decimals(
            min_value=-999999999,
            max_value=-0.01,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_negative_budget_min_rejected(self, budget_value):
        """
        **Property 31: Budget Range Validation**
        
        For any negative minimum budget value,
        the validation function should reject it.
        
        **Validates: Requirements REQ-043**
        """
        is_valid, error_message = ValidationService.validate_budget_range(
            budget_min=budget_value,
            budget_max=Decimal('1000000')
        )
        
        # Negative minimum budget should be rejected
        self.assertFalse(
            is_valid,
            f"Negative minimum budget {budget_value} was incorrectly accepted"
        )
        self.assertIn(
            "minimum budget",
            error_message.lower(),
            f"Error message should mention minimum budget for value {budget_value}"
        )
        self.assertIn(
            "greater than or equal to 0",
            error_message.lower(),
            f"Error message should mention non-negative constraint for value {budget_value}"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_value=st.decimals(
            min_value=-999999999,
            max_value=-0.01,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_negative_budget_max_rejected(self, budget_value):
        """
        **Property 31: Budget Range Validation**
        
        For any negative maximum budget value,
        the validation function should reject it.
        
        **Validates: Requirements REQ-043**
        """
        is_valid, error_message = ValidationService.validate_budget_range(
            budget_min=Decimal('0'),
            budget_max=budget_value
        )
        
        # Negative maximum budget should be rejected
        self.assertFalse(
            is_valid,
            f"Negative maximum budget {budget_value} was incorrectly accepted"
        )
        self.assertIn(
            "maximum budget",
            error_message.lower(),
            f"Error message should mention maximum budget for value {budget_value}"
        )
        self.assertIn(
            "greater than or equal to 0",
            error_message.lower(),
            f"Error message should mention non-negative constraint for value {budget_value}"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_min=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        ),
        budget_max=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_budget_validation_consistency(self, budget_min, budget_max):
        """
        **Property 31: Budget Range Validation**
        
        For any budget range, calling the validation function multiple times
        with the same input should always return the same result (idempotency).
        
        **Validates: Requirements REQ-043**
        """
        # Call validation multiple times
        result1 = ValidationService.validate_budget_range(budget_min, budget_max)
        result2 = ValidationService.validate_budget_range(budget_min, budget_max)
        result3 = ValidationService.validate_budget_range(budget_min, budget_max)
        
        # All results should be identical
        self.assertEqual(
            result1,
            result2,
            f"Validation results should be consistent for budget range [{budget_min}, {budget_max}]"
        )
        self.assertEqual(
            result2,
            result3,
            f"Validation results should be consistent for budget range [{budget_min}, {budget_max}]"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_equal_budget_range_accepted(self, budget):
        """
        **Property 31: Budget Range Validation**
        
        For any non-negative budget value, using the same value for both
        min and max should be accepted (min == max is valid).
        
        **Validates: Requirements REQ-043**
        """
        is_valid, error_message = ValidationService.validate_budget_range(
            budget_min=budget,
            budget_max=budget
        )
        
        # Equal budget values should be accepted (min == max)
        self.assertTrue(
            is_valid,
            f"Equal budget range [{budget}, {budget}] was rejected with error: {error_message}"
        )
        self.assertEqual(
            error_message,
            "",
            f"Equal budget range [{budget}, {budget}] should have empty error message"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_min=st.one_of(
            st.integers(min_value=0, max_value=999999999),
            st.floats(min_value=0, max_value=999999999, allow_nan=False, allow_infinity=False)
        ),
        budget_max=st.one_of(
            st.integers(min_value=0, max_value=999999999),
            st.floats(min_value=0, max_value=999999999, allow_nan=False, allow_infinity=False)
        )
    )
    def test_property_budget_type_conversion(self, budget_min, budget_max):
        """
        **Property 31: Budget Range Validation**
        
        For any numeric budget values (int or float), the validation function
        should handle type conversion to Decimal correctly.
        
        **Validates: Requirements REQ-043**
        """
        # Ensure min <= max for this test
        if budget_min > budget_max:
            budget_min, budget_max = budget_max, budget_min
        
        # Should not raise exception for type conversion
        try:
            is_valid, error_message = ValidationService.validate_budget_range(
                budget_min=budget_min,
                budget_max=budget_max
            )
            
            # Should accept valid ranges regardless of input type
            self.assertTrue(
                is_valid,
                f"Valid budget range [{budget_min}, {budget_max}] with types "
                f"[{type(budget_min).__name__}, {type(budget_max).__name__}] was rejected"
            )
        except (ValueError, TypeError) as e:
            self.fail(
                f"Budget validation should handle type conversion for "
                f"[{budget_min}, {budget_max}] but raised: {e}"
            )
    
    @settings(max_examples=10, deadline=None)
    @given(
        budget_min=st.decimals(
            min_value=0,
            max_value=999999999,
            allow_nan=False,
            allow_infinity=False,
            places=2
        )
    )
    def test_property_zero_budget_accepted(self, budget_min):
        """
        **Property 31: Budget Range Validation**
        
        For any non-negative minimum budget, a range starting from 0
        or ending at 0 should be accepted (0 is a valid budget value).
        
        **Validates: Requirements REQ-043**
        """
        # Test with min=0
        is_valid_min_zero, error_min_zero = ValidationService.validate_budget_range(
            budget_min=Decimal('0'),
            budget_max=budget_min
        )
        
        self.assertTrue(
            is_valid_min_zero,
            f"Budget range [0, {budget_min}] was rejected with error: {error_min_zero}"
        )
        
        # Test with max=0 (only valid when min=0)
        is_valid_max_zero, error_max_zero = ValidationService.validate_budget_range(
            budget_min=Decimal('0'),
            budget_max=Decimal('0')
        )
        
        self.assertTrue(
            is_valid_max_zero,
            f"Budget range [0, 0] was rejected with error: {error_max_zero}"
        )
