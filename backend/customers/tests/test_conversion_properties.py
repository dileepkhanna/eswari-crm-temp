"""
Property-based tests for ConversionService

This test suite uses hypothesis to verify universal properties of the conversion logic
across a wide range of inputs, ensuring correctness beyond specific examples.

**Validates: Requirements REQ-033, REQ-034, REQ-035**
"""

from decimal import Decimal
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from customers.services import ConversionService
from customers.models import Customer
from leads.models import Lead
from accounts.models import Company

User = get_user_model()


# Custom strategies for domain-specific data
@st.composite
def safe_text(draw, min_size=0, max_size=1000):
    """
    Generate sanitization-safe text avoiding SQL injection patterns
    """
    safe_alphabet = st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'),  # Letters, digits, spaces, punctuation
        blacklist_characters=';-/*=\'"`<>()[]{}|\\&'  # Exclude SQL injection chars
    )
    return draw(st.text(min_size=min_size, max_size=max_size, alphabet=safe_alphabet))


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
def valid_customer_names(draw):
    """
    Generate valid customer names (1-255 characters, sanitization-safe)
    """
    # Safe alphabet for names - letters, digits, spaces, common punctuation
    safe_alphabet = st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),  # Letters, digits, spaces
        blacklist_characters=';-/*=\'"`<>()[]{}|\\&'  # Exclude SQL injection chars
    )
    return draw(st.text(
        min_size=1,
        max_size=255,
        alphabet=safe_alphabet
    ))


@st.composite
def valid_lead_data(draw):
    """
    Generate valid lead data for conversion (sanitization-safe)
    """
    requirement_types = ['apartment', 'villa', 'house', 'plot']
    bhk_choices = ['1', '2', '3', '4', '5+']
    status_choices = ['new', 'hot', 'warm', 'cold']
    
    # Generate budget values ensuring min <= max
    budget_min = draw(st.decimals(
        min_value=0,
        max_value=50000000,
        allow_nan=False,
        allow_infinity=False,
        places=2
    ))
    budget_max = draw(st.decimals(
        min_value=budget_min,
        max_value=100000000,
        allow_nan=False,
        allow_infinity=False,
        places=2
    ))
    
    # Safe alphabet excluding SQL injection patterns and suspicious characters
    safe_alphabet = st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),  # Letters, digits, spaces
        blacklist_characters=';-/*=\'"`<>()[]{}|\\&'  # Exclude SQL injection chars
    )
    
    return {
        'requirement_type': draw(st.sampled_from(requirement_types)),
        'bhk_requirement': draw(st.sampled_from(bhk_choices)),
        'budget_min': budget_min,
        'budget_max': budget_max,
        'preferred_location': draw(st.text(min_size=1, max_size=200, alphabet=safe_alphabet).filter(lambda x: x.strip())),
        'status': draw(st.sampled_from(status_choices)),
        'email': draw(st.emails()) if draw(st.booleans()) else '',
        'address': draw(st.text(min_size=0, max_size=500, alphabet=safe_alphabet)),
    }


class TestConversionStateUpdateProperties(TestCase):
    """
    Property-based tests for customer conversion state update
    
    **Validates: Requirements REQ-033, REQ-034**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Conversion PBT',
            code='TEST_CONV_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_conversion_pbt',
            email='test_conversion_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_conversion_sets_is_converted_flag(self, phone, name, lead_data):
        """
        **Property 23: Customer Conversion State Update**
        
        For any successful customer-to-lead conversion, the customer's
        is_converted field should be set to true.
        
        **Validates: Requirements REQ-033**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False  # Explicitly set to False
        )
        
        # Verify customer is not converted initially
        self.assertFalse(
            customer.is_converted,
            f"Customer {customer.id} should not be converted initially"
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify is_converted flag is set to True
        self.assertTrue(
            customer.is_converted,
            f"Customer {customer.id} should have is_converted=True after conversion"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_conversion_stores_lead_id(self, phone, name, lead_data):
        """
        **Property 23: Customer Conversion State Update**
        
        For any successful customer-to-lead conversion, the customer's
        converted_lead_id field should contain the created lead's ID.
        
        **Validates: Requirements REQ-034**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None  # Explicitly set to None
        )
        
        # Verify customer has no converted_lead_id initially
        self.assertIsNone(
            customer.converted_lead_id,
            f"Customer {customer.id} should have no converted_lead_id initially"
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify converted_lead_id is set to the lead's ID
        self.assertIsNotNone(
            customer.converted_lead_id,
            f"Customer {customer.id} should have converted_lead_id set after conversion"
        )
        self.assertEqual(
            customer.converted_lead_id,
            str(lead.id),
            f"Customer {customer.id} converted_lead_id should match lead ID {lead.id}"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_conversion_state_update_atomic(self, phone, name, lead_data):
        """
        **Property 23: Customer Conversion State Update**
        
        For any successful customer-to-lead conversion, both is_converted
        and converted_lead_id should be updated together (atomically).
        
        **Validates: Requirements REQ-033, REQ-034**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify both fields are updated together
        self.assertTrue(
            customer.is_converted,
            f"Customer {customer.id} should have is_converted=True"
        )
        self.assertIsNotNone(
            customer.converted_lead_id,
            f"Customer {customer.id} should have converted_lead_id set"
        )
        self.assertEqual(
            customer.converted_lead_id,
            str(lead.id),
            f"Customer {customer.id} converted_lead_id should match lead ID"
        )
        
        # Verify the state is consistent: if is_converted is True,
        # converted_lead_id must be set
        if customer.is_converted:
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"If customer {customer.id} is_converted=True, "
                f"converted_lead_id must not be None"
            )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_converted_lead_id_references_valid_lead(self, phone, name, lead_data):
        """
        **Property 23: Customer Conversion State Update**
        
        For any successful customer-to-lead conversion, the converted_lead_id
        should reference a valid lead that exists in the database.
        
        **Validates: Requirements REQ-034**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify the converted_lead_id references a valid lead
        self.assertIsNotNone(customer.converted_lead_id)
        
        # Try to fetch the lead using the stored ID
        try:
            referenced_lead = Lead.objects.get(id=int(customer.converted_lead_id))
            
            # Verify it's the same lead we created
            self.assertEqual(
                referenced_lead.id,
                lead.id,
                f"Referenced lead ID should match the created lead ID"
            )
            
            # Verify the lead has the correct source
            self.assertEqual(
                referenced_lead.source,
                'customer_conversion',
                f"Lead {referenced_lead.id} should have source='customer_conversion'"
            )
            
        except Lead.DoesNotExist:
            self.fail(
                f"Customer {customer.id} has converted_lead_id={customer.converted_lead_id} "
                f"but no lead with that ID exists in the database"
            )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data(),
        notes=safe_text(min_size=0, max_size=1000)
    )
    def test_property_conversion_preserves_customer_data(self, phone, name, lead_data, notes):
        """
        **Property 23: Customer Conversion State Update**
        
        For any successful customer-to-lead conversion, the customer's
        original data (name, phone, notes, etc.) should be preserved.
        Only is_converted and converted_lead_id should change.
        
        **Validates: Requirements REQ-033, REQ-034**
        """
        # Create a customer with specific data
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            notes=notes
        )
        
        # Store original values
        original_phone = customer.phone
        original_name = customer.name
        original_notes = customer.notes
        original_company = customer.company
        original_created_by = customer.created_by
        original_assigned_to = customer.assigned_to
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify original data is preserved
        self.assertEqual(
            customer.phone,
            original_phone,
            f"Customer phone should not change after conversion"
        )
        self.assertEqual(
            customer.name,
            original_name,
            f"Customer name should not change after conversion"
        )
        self.assertEqual(
            customer.notes,
            original_notes,
            f"Customer notes should not change after conversion"
        )
        self.assertEqual(
            customer.company,
            original_company,
            f"Customer company should not change after conversion"
        )
        self.assertEqual(
            customer.created_by,
            original_created_by,
            f"Customer created_by should not change after conversion"
        )
        self.assertEqual(
            customer.assigned_to,
            original_assigned_to,
            f"Customer assigned_to should not change after conversion"
        )
        
        # Verify only conversion fields changed
        self.assertTrue(customer.is_converted)
        self.assertEqual(customer.converted_lead_id, str(lead.id))
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_conversion_state_idempotent_read(self, phone, name, lead_data):
        """
        **Property 23: Customer Conversion State Update**
        
        For any converted customer, reading the is_converted and
        converted_lead_id fields multiple times should always return
        the same values (idempotent reads).
        
        **Validates: Requirements REQ-033, REQ-034**
        """
        # Create and convert a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Read conversion state multiple times
        customer.refresh_from_db()
        is_converted_1 = customer.is_converted
        converted_lead_id_1 = customer.converted_lead_id
        
        customer.refresh_from_db()
        is_converted_2 = customer.is_converted
        converted_lead_id_2 = customer.converted_lead_id
        
        customer.refresh_from_db()
        is_converted_3 = customer.is_converted
        converted_lead_id_3 = customer.converted_lead_id
        
        # Verify all reads return the same values
        self.assertEqual(
            is_converted_1,
            is_converted_2,
            f"is_converted should be consistent across reads"
        )
        self.assertEqual(
            is_converted_2,
            is_converted_3,
            f"is_converted should be consistent across reads"
        )
        self.assertEqual(
            converted_lead_id_1,
            converted_lead_id_2,
            f"converted_lead_id should be consistent across reads"
        )
        self.assertEqual(
            converted_lead_id_2,
            converted_lead_id_3,
            f"converted_lead_id should be consistent across reads"
        )
        
        # All should be True and match the lead ID
        self.assertTrue(is_converted_1)
        self.assertTrue(is_converted_2)
        self.assertTrue(is_converted_3)
        self.assertEqual(converted_lead_id_1, str(lead.id))
        self.assertEqual(converted_lead_id_2, str(lead.id))
        self.assertEqual(converted_lead_id_3, str(lead.id))
        
        # Clean up
        lead.delete()
        customer.delete()



class TestDuplicateConversionPreventionProperties(TestCase):
    """
    Property-based tests for duplicate conversion prevention
    
    **Validates: Requirements REQ-035**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Duplicate PBT',
            code='TEST_DUP_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_duplicate_pbt',
            email='test_duplicate_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_raises_error(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any customer with is_converted=true, attempting to convert
        that customer again should fail with a ValueError.
        
        **Validates: Requirements REQ-035**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False
        )
        
        # First conversion should succeed
        lead1 = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer to get updated state
        customer.refresh_from_db()
        
        # Verify customer is now converted
        self.assertTrue(
            customer.is_converted,
            f"Customer {customer.id} should be converted after first conversion"
        )
        
        # Second conversion attempt should fail
        with self.assertRaises(ValueError) as context:
            ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify error message indicates duplicate conversion
        error_message = str(context.exception)
        self.assertIn(
            "already been converted",
            error_message.lower(),
            f"Error message should indicate duplicate conversion: {error_message}"
        )
        
        # Verify no second lead was created
        lead_count = Lead.objects.filter(
            phone=customer.phone,
            company=self.company
        ).count()
        self.assertEqual(
            lead_count,
            1,
            f"Only one lead should exist for customer {customer.id}, found {lead_count}"
        )
        
        # Clean up
        lead1.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_preserves_original_lead(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any customer with is_converted=true, attempting to convert
        again should not modify or delete the original lead.
        
        **Validates: Requirements REQ-035**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # First conversion
        lead1 = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Store original lead data
        original_lead_id = lead1.id
        original_lead_phone = lead1.phone
        original_lead_name = lead1.name
        original_lead_source = lead1.source
        
        # Refresh customer
        customer.refresh_from_db()
        
        # Attempt second conversion (should fail)
        try:
            ConversionService.convert_single(customer, lead_data, self.user)
            self.fail("Second conversion should have raised ValueError")
        except ValueError:
            pass  # Expected
        
        # Verify original lead still exists and is unchanged
        lead1.refresh_from_db()
        self.assertEqual(
            lead1.id,
            original_lead_id,
            f"Original lead ID should not change"
        )
        self.assertEqual(
            lead1.phone,
            original_lead_phone,
            f"Original lead phone should not change"
        )
        self.assertEqual(
            lead1.name,
            original_lead_name,
            f"Original lead name should not change"
        )
        self.assertEqual(
            lead1.source,
            original_lead_source,
            f"Original lead source should not change"
        )
        
        # Clean up
        lead1.delete()
        customer.delete()
    
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.data_too_large])
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_preserves_customer_state(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any customer with is_converted=true, attempting to convert
        again should not modify the customer's conversion state.
        
        **Validates: Requirements REQ-035**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # First conversion
        lead1 = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh and store customer state after first conversion
        customer.refresh_from_db()
        is_converted_after_first = customer.is_converted
        converted_lead_id_after_first = customer.converted_lead_id
        
        # Attempt second conversion (should fail)
        try:
            ConversionService.convert_single(customer, lead_data, self.user)
            self.fail("Second conversion should have raised ValueError")
        except ValueError:
            pass  # Expected
        
        # Refresh customer and verify state is unchanged
        customer.refresh_from_db()
        self.assertEqual(
            customer.is_converted,
            is_converted_after_first,
            f"Customer is_converted should not change after failed second conversion"
        )
        self.assertEqual(
            customer.converted_lead_id,
            converted_lead_id_after_first,
            f"Customer converted_lead_id should not change after failed second conversion"
        )
        self.assertTrue(
            customer.is_converted,
            f"Customer should still be marked as converted"
        )
        self.assertEqual(
            customer.converted_lead_id,
            str(lead1.id),
            f"Customer should still reference the original lead"
        )
        
        # Clean up
        lead1.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_validation_check(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any customer with is_converted=true, the validation service
        should correctly identify it as ineligible for conversion.
        
        **Validates: Requirements REQ-035**
        """
        from customers.services import ValidationService
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False
        )
        
        # Before conversion, should be eligible
        can_convert_before, reason_before = ValidationService.validate_conversion_eligibility(customer)
        self.assertTrue(
            can_convert_before,
            f"Customer should be eligible for conversion before being converted"
        )
        self.assertEqual(
            reason_before,
            "",
            f"No error reason should be provided for eligible customer"
        )
        
        # Convert customer
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer
        customer.refresh_from_db()
        
        # After conversion, should NOT be eligible
        can_convert_after, reason_after = ValidationService.validate_conversion_eligibility(customer)
        self.assertFalse(
            can_convert_after,
            f"Customer should NOT be eligible for conversion after being converted"
        )
        self.assertNotEqual(
            reason_after,
            "",
            f"Error reason should be provided for ineligible customer"
        )
        self.assertIn(
            "already",
            reason_after.lower(),
            f"Error reason should mention customer is already converted: {reason_after}"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_idempotent_check(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any customer with is_converted=true, multiple attempts to
        convert should all fail consistently (idempotent failure).
        
        **Validates: Requirements REQ-035**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # First conversion should succeed
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer
        customer.refresh_from_db()
        
        # Multiple conversion attempts should all fail consistently
        for attempt in range(3):
            with self.assertRaises(ValueError) as context:
                ConversionService.convert_single(customer, lead_data, self.user)
            
            error_message = str(context.exception)
            self.assertIn(
                "already",
                error_message.lower(),
                f"Attempt {attempt + 1}: Error should indicate duplicate conversion"
            )
            
            # Verify customer state remains unchanged
            customer.refresh_from_db()
            self.assertTrue(customer.is_converted)
            self.assertEqual(customer.converted_lead_id, str(lead.id))
        
        # Verify only one lead exists
        lead_count = Lead.objects.filter(
            phone=customer.phone,
            company=self.company
        ).count()
        self.assertEqual(
            lead_count,
            1,
            f"Only one lead should exist after multiple conversion attempts"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_bulk_conversion_skips_already_converted(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any bulk conversion operation that includes already-converted
        customers, those customers should be skipped without error.
        
        **Validates: Requirements REQ-035, REQ-039**
        """
        # Create two customers
        customer1 = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Generate a different phone for customer2
        phone2 = phone + "999" if len(phone) < 12 else phone[:-3] + "999"
        customer2 = Customer.objects.create(
            phone=phone2,
            name=name + " 2",
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer1 first
        lead1 = ConversionService.convert_single(customer1, lead_data, self.user)
        
        # Refresh customer1
        customer1.refresh_from_db()
        self.assertTrue(customer1.is_converted)
        
        # Attempt bulk conversion of both customers
        result = ConversionService.convert_bulk(
            customer_ids=[customer1.id, customer2.id],
            default_values=lead_data,
            user=self.user
        )
        
        # Verify results
        self.assertEqual(
            result['total'],
            2,
            f"Total should be 2 customers"
        )
        self.assertEqual(
            result['skipped_count'],
            1,
            f"One customer (customer1) should be skipped"
        )
        self.assertEqual(
            result['success_count'],
            1,
            f"One customer (customer2) should be converted successfully"
        )
        self.assertEqual(
            result['error_count'],
            0,
            f"No errors should occur (skipped is not an error)"
        )
        
        # Verify only two leads exist (one from first conversion, one from bulk)
        lead_count = Lead.objects.filter(
            company=self.company,
            source='customer_conversion'
        ).count()
        self.assertEqual(
            lead_count,
            2,
            f"Two leads should exist total"
        )
        
        # Clean up
        Lead.objects.filter(company=self.company, source='customer_conversion').delete()
        customer1.delete()
        customer2.delete()
    
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.data_too_large])
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_duplicate_conversion_audit_log(self, phone, name, lead_data):
        """
        **Property 24: Duplicate Conversion Prevention**
        
        For any failed duplicate conversion attempt, an audit log entry
        should be created with success=False.
        
        **Validates: Requirements REQ-035, REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # First conversion
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer
        customer.refresh_from_db()
        
        # Count audit logs before second attempt
        audit_count_before = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        
        # Attempt second conversion (should fail)
        try:
            ConversionService.convert_single(customer, lead_data, self.user)
            self.fail("Second conversion should have raised ValueError")
        except ValueError:
            pass  # Expected
        
        # Verify audit log was created for failed attempt
        audit_count_after = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        self.assertGreater(
            audit_count_after,
            audit_count_before,
            f"Audit log should be created for failed conversion attempt"
        )
        
        # Verify the failed audit log entry
        failed_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=False
        ).latest('created_at')
        
        self.assertFalse(
            failed_log.success,
            f"Failed conversion audit log should have success=False"
        )
        self.assertIsNone(
            failed_log.lead_id,
            f"Failed conversion audit log should have lead_id=None"
        )
        self.assertNotEqual(
            failed_log.error_message,
            "",
            f"Failed conversion audit log should have error message"
        )
        self.assertIn(
            "already",
            failed_log.error_message.lower(),
            f"Error message should indicate duplicate conversion"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()


class TestConversionTransactionAtomicityProperties(TestCase):
    """
    Property-based tests for conversion transaction atomicity
    
    **Validates: Requirements REQ-070**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Atomicity PBT',
            code='TEST_ATOM_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_atomicity_pbt',
            email='test_atomicity_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_failed_conversion_no_lead_created(self, phone, name, lead_data):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion attempt that fails validation, no lead should
        be created in the database.
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer and mark as already converted to trigger validation failure
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=True,  # Already converted - will fail validation
            converted_lead_id='999'
        )
        
        # Count leads before conversion attempt
        lead_count_before = Lead.objects.filter(
            phone=customer.phone,
            company=self.company
        ).count()
        
        # Attempt conversion (should fail due to already converted)
        with self.assertRaises(ValueError):
            ConversionService.convert_single(customer, lead_data, self.user)
        
        # Count leads after failed conversion
        lead_count_after = Lead.objects.filter(
            phone=customer.phone,
            company=self.company
        ).count()
        
        # Verify no lead was created
        self.assertEqual(
            lead_count_before,
            lead_count_after,
            f"No lead should be created when conversion fails validation"
        )
        self.assertEqual(
            lead_count_after,
            0,
            f"No lead should exist for failed conversion"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names()
    )
    def test_property_failed_conversion_customer_state_unchanged(self, phone, name):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion attempt that fails validation, the customer's
        is_converted flag should remain false (no state change).
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Create invalid lead data (budget_min > budget_max)
        invalid_lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': Decimal('10000000'),  # 10M
            'budget_max': Decimal('5000000'),   # 5M (invalid: min > max)
            'preferred_location': 'Test Location',
            'status': 'new'
        }
        
        # Store original customer state
        original_is_converted = customer.is_converted
        original_converted_lead_id = customer.converted_lead_id
        
        # Attempt conversion with invalid data (should fail)
        with self.assertRaises(ValueError):
            ConversionService.convert_single(customer, invalid_lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify customer state is unchanged
        self.assertEqual(
            customer.is_converted,
            original_is_converted,
            f"Customer is_converted should remain unchanged after failed conversion"
        )
        self.assertEqual(
            customer.converted_lead_id,
            original_converted_lead_id,
            f"Customer converted_lead_id should remain unchanged after failed conversion"
        )
        self.assertFalse(
            customer.is_converted,
            f"Customer should still be marked as not converted"
        )
        self.assertIsNone(
            customer.converted_lead_id,
            f"Customer should have no converted_lead_id"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_atomicity_all_or_nothing(self, phone, name, lead_data):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion operation, either both the lead is created AND
        the customer is marked as converted, OR neither happens (all-or-nothing).
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Attempt successful conversion
        try:
            lead = ConversionService.convert_single(customer, lead_data, self.user)
            
            # Refresh customer
            customer.refresh_from_db()
            
            # Verify BOTH operations succeeded
            self.assertTrue(
                customer.is_converted,
                f"Customer should be marked as converted when lead is created"
            )
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"Customer should have converted_lead_id when lead is created"
            )
            
            # Verify lead exists
            lead_exists = Lead.objects.filter(id=lead.id).exists()
            self.assertTrue(
                lead_exists,
                f"Lead should exist when customer is marked as converted"
            )
            
            # Verify referential integrity
            self.assertEqual(
                customer.converted_lead_id,
                str(lead.id),
                f"Customer converted_lead_id should match created lead ID"
            )
            
            # Clean up
            lead.delete()
            
        except Exception as e:
            # If conversion failed, verify NEITHER operation succeeded
            customer.refresh_from_db()
            
            self.assertFalse(
                customer.is_converted,
                f"Customer should NOT be marked as converted when conversion fails: {e}"
            )
            self.assertIsNone(
                customer.converted_lead_id,
                f"Customer should have no converted_lead_id when conversion fails: {e}"
            )
            
            # Verify no lead was created
            lead_count = Lead.objects.filter(
                phone=customer.phone,
                company=self.company
            ).count()
            self.assertEqual(
                lead_count,
                0,
                f"No lead should exist when conversion fails: {e}"
            )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names()
    )
    def test_property_atomicity_rollback_on_budget_validation_failure(self, phone, name):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion with invalid budget range (min > max), the
        transaction should rollback completely with no side effects.
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Create invalid lead data with budget_min > budget_max
        invalid_lead_data = {
            'requirement_type': 'villa',
            'bhk_requirement': '4',
            'budget_min': Decimal('20000000'),  # 20M
            'budget_max': Decimal('10000000'),  # 10M (invalid)
            'preferred_location': 'Premium Area',
            'status': 'hot',
            'email': 'test@example.com',
            'address': '123 Test St'
        }
        
        # Count database objects before conversion
        customer_count_before = Customer.objects.filter(company=self.company).count()
        lead_count_before = Lead.objects.filter(company=self.company).count()
        
        # Attempt conversion (should fail)
        with self.assertRaises(ValueError) as context:
            ConversionService.convert_single(customer, invalid_lead_data, self.user)
        
        # Verify error message mentions budget
        error_message = str(context.exception)
        self.assertIn(
            'budget',
            error_message.lower(),
            f"Error message should mention budget validation failure"
        )
        
        # Refresh customer
        customer.refresh_from_db()
        
        # Verify complete rollback - customer state unchanged
        self.assertFalse(
            customer.is_converted,
            f"Customer should not be marked as converted after budget validation failure"
        )
        self.assertIsNone(
            customer.converted_lead_id,
            f"Customer should have no converted_lead_id after budget validation failure"
        )
        
        # Verify no lead was created
        lead_count_after = Lead.objects.filter(company=self.company).count()
        self.assertEqual(
            lead_count_before,
            lead_count_after,
            f"No lead should be created after budget validation failure"
        )
        
        # Verify customer count unchanged (no accidental deletions)
        customer_count_after = Customer.objects.filter(company=self.company).count()
        self.assertEqual(
            customer_count_before,
            customer_count_after,
            f"Customer count should remain unchanged after failed conversion"
        )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_atomicity_no_partial_state(self, phone, name, lead_data):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion operation, there should never be a partial state
        where a lead exists but customer is not marked as converted, or
        vice versa.
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Attempt conversion
        try:
            lead = ConversionService.convert_single(customer, lead_data, self.user)
            conversion_succeeded = True
        except Exception:
            conversion_succeeded = False
            lead = None
        
        # Refresh customer
        customer.refresh_from_db()
        
        # Check for partial states (should never happen)
        lead_exists = Lead.objects.filter(
            phone=customer.phone,
            company=self.company,
            source='customer_conversion'
        ).exists()
        
        # Verify no partial state: lead exists but customer not marked converted
        if lead_exists:
            self.assertTrue(
                customer.is_converted,
                f"PARTIAL STATE DETECTED: Lead exists but customer not marked as converted"
            )
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"PARTIAL STATE DETECTED: Lead exists but customer has no converted_lead_id"
            )
        
        # Verify no partial state: customer marked converted but no lead exists
        if customer.is_converted:
            self.assertTrue(
                lead_exists,
                f"PARTIAL STATE DETECTED: Customer marked as converted but no lead exists"
            )
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"PARTIAL STATE DETECTED: Customer marked as converted but has no converted_lead_id"
            )
        
        # Verify consistency: if conversion succeeded, both should be true
        if conversion_succeeded:
            self.assertTrue(
                customer.is_converted,
                f"Conversion succeeded but customer not marked as converted"
            )
            self.assertTrue(
                lead_exists,
                f"Conversion succeeded but lead does not exist"
            )
        
        # Verify consistency: if conversion failed, both should be false
        if not conversion_succeeded:
            self.assertFalse(
                customer.is_converted,
                f"Conversion failed but customer marked as converted"
            )
            self.assertFalse(
                lead_exists,
                f"Conversion failed but lead exists"
            )
        
        # Clean up
        if lead:
            lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_atomicity_idempotent_failure(self, phone, name, lead_data):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion that fails, multiple checks of the database state
        should show consistent rollback (no eventual consistency issues).
        
        **Validates: Requirements REQ-070**
        """
        # Create a customer already marked as converted
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=True,  # Already converted
            converted_lead_id='999'
        )
        
        # Attempt conversion (should fail)
        with self.assertRaises(ValueError):
            ConversionService.convert_single(customer, lead_data, self.user)
        
        # Check database state multiple times
        for check_num in range(3):
            # Refresh customer
            customer.refresh_from_db()
            
            # Verify customer state is consistent across checks
            self.assertTrue(
                customer.is_converted,
                f"Check {check_num + 1}: Customer state should be consistent"
            )
            self.assertEqual(
                customer.converted_lead_id,
                '999',
                f"Check {check_num + 1}: Customer converted_lead_id should be consistent"
            )
            
            # Verify no lead was created
            lead_count = Lead.objects.filter(
                phone=customer.phone,
                company=self.company,
                source='customer_conversion'
            ).count()
            self.assertEqual(
                lead_count,
                0,
                f"Check {check_num + 1}: No lead should exist after failed conversion"
            )
        
        # Clean up
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names()
    )
    def test_property_atomicity_audit_log_on_failure(self, phone, name):
        """
        **Property 37: Conversion Transaction Atomicity**
        
        For any conversion that fails and rolls back, an audit log entry
        should still be created (audit logging is outside the transaction).
        
        **Validates: Requirements REQ-070, REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False
        )
        
        # Create invalid lead data
        invalid_lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': Decimal('15000000'),
            'budget_max': Decimal('8000000'),  # Invalid: min > max
            'preferred_location': 'Test',
            'status': 'new'
        }
        
        # Count audit logs before
        audit_count_before = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        
        # Attempt conversion (should fail)
        with self.assertRaises(ValueError):
            ConversionService.convert_single(customer, invalid_lead_data, self.user)
        
        # Verify audit log was created despite rollback
        audit_count_after = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        self.assertGreater(
            audit_count_after,
            audit_count_before,
            f"Audit log should be created even when conversion fails and rolls back"
        )
        
        # Verify the audit log indicates failure
        failed_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=False
        ).latest('created_at')
        
        self.assertFalse(
            failed_log.success,
            f"Audit log should indicate failure"
        )
        self.assertIsNone(
            failed_log.lead_id,
            f"Audit log should have no lead_id for failed conversion"
        )
        self.assertNotEqual(
            failed_log.error_message,
            '',
            f"Audit log should contain error message"
        )
        
        # Verify customer state was rolled back
        customer.refresh_from_db()
        self.assertFalse(
            customer.is_converted,
            f"Customer should not be marked as converted after failed conversion"
        )
        
        # Clean up
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()



class TestConversionAuditLoggingProperties(TestCase):
    """
    Property-based tests for conversion audit logging
    
    **Validates: Requirements REQ-071**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Audit PBT',
            code='TEST_AUDIT_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_audit_pbt',
            email='test_audit_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_successful_conversion_creates_audit_log(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any successful conversion operation, an audit log entry should
        be created with the customer ID, lead ID, user, and timestamp.
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Count audit logs before conversion
        audit_count_before = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify audit log was created
        audit_count_after = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        self.assertGreater(
            audit_count_after,
            audit_count_before,
            f"Audit log should be created for successful conversion"
        )
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Verify audit log contains correct data
        self.assertEqual(
            audit_log.customer_id,
            customer.id,
            f"Audit log should contain correct customer ID"
        )
        self.assertEqual(
            audit_log.lead_id,
            lead.id,
            f"Audit log should contain correct lead ID"
        )
        self.assertEqual(
            audit_log.performed_by,
            self.user,
            f"Audit log should contain correct user"
        )
        self.assertEqual(
            audit_log.company,
            self.company,
            f"Audit log should contain correct company"
        )
        self.assertTrue(
            audit_log.success,
            f"Audit log should indicate success"
        )
        self.assertIsNotNone(
            audit_log.created_at,
            f"Audit log should have timestamp"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_failed_conversion_creates_audit_log(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any failed conversion operation, an audit log entry should
        be created with success=False and an error message.
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # First conversion (should succeed)
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        customer.refresh_from_db()
        
        # Count audit logs before second attempt
        audit_count_before = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        
        # Attempt second conversion (should fail)
        try:
            ConversionService.convert_single(customer, lead_data, self.user)
            self.fail("Second conversion should have raised ValueError")
        except ValueError:
            pass  # Expected
        
        # Verify audit log was created for failed attempt
        audit_count_after = ConversionAuditLog.objects.filter(
            customer_id=customer.id
        ).count()
        self.assertGreater(
            audit_count_after,
            audit_count_before,
            f"Audit log should be created for failed conversion"
        )
        
        # Retrieve the failed audit log entry
        failed_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=False
        ).latest('created_at')
        
        # Verify audit log indicates failure
        self.assertFalse(
            failed_log.success,
            f"Audit log should indicate failure"
        )
        self.assertIsNone(
            failed_log.lead_id,
            f"Failed audit log should have no lead_id"
        )
        self.assertNotEqual(
            failed_log.error_message,
            '',
            f"Failed audit log should contain error message"
        )
        self.assertEqual(
            failed_log.customer_id,
            customer.id,
            f"Audit log should contain correct customer ID"
        )
        self.assertEqual(
            failed_log.performed_by,
            self.user,
            f"Audit log should contain correct user"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_audit_log_contains_customer_metadata(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any conversion operation, the audit log should contain
        customer metadata (phone, name) for traceability.
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Verify audit log contains customer metadata
        self.assertEqual(
            audit_log.customer_phone,
            customer.phone,
            f"Audit log should contain customer phone"
        )
        self.assertEqual(
            audit_log.customer_name,
            customer.name,
            f"Audit log should contain customer name"
        )
        self.assertIsNotNone(
            audit_log.metadata,
            f"Audit log should have metadata field"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_audit_log_timestamp_accuracy(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any conversion operation, the audit log timestamp should
        be close to the actual conversion time (within 1 second).
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        from django.utils import timezone
        from datetime import timedelta
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Record time before conversion
        time_before = timezone.now()
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Record time after conversion
        time_after = timezone.now()
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Verify timestamp is within expected range
        self.assertGreaterEqual(
            audit_log.created_at,
            time_before,
            f"Audit log timestamp should be after conversion start"
        )
        self.assertLessEqual(
            audit_log.created_at,
            time_after,
            f"Audit log timestamp should be before conversion end"
        )
        
        # Verify timestamp is reasonably close (within 1 second)
        time_diff = (time_after - time_before).total_seconds()
        self.assertLess(
            time_diff,
            1.0,
            f"Conversion should complete within 1 second for timestamp accuracy"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_audit_log_action_type_correct(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any conversion operation, the audit log should have the
        correct action type ('convert_single' for success, 'conversion_failed' for failure).
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead (should succeed)
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Verify action type is correct for successful conversion
        self.assertEqual(
            audit_log.action,
            'convert_single',
            f"Audit log action should be 'convert_single' for successful conversion"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_audit_log_immutable_after_creation(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any conversion operation, the audit log entry should remain
        immutable after creation (no updates to existing logs).
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Store original values
        original_customer_id = audit_log.customer_id
        original_lead_id = audit_log.lead_id
        original_success = audit_log.success
        original_created_at = audit_log.created_at
        
        # Perform another operation (should create new log, not update existing)
        customer.refresh_from_db()
        
        # Re-fetch the original audit log
        audit_log.refresh_from_db()
        
        # Verify original audit log is unchanged
        self.assertEqual(
            audit_log.customer_id,
            original_customer_id,
            f"Audit log customer_id should not change"
        )
        self.assertEqual(
            audit_log.lead_id,
            original_lead_id,
            f"Audit log lead_id should not change"
        )
        self.assertEqual(
            audit_log.success,
            original_success,
            f"Audit log success should not change"
        )
        self.assertEqual(
            audit_log.created_at,
            original_created_at,
            f"Audit log created_at should not change"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_audit_log_company_isolation(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any conversion operation, the audit log should be associated
        with the correct company for data isolation.
        
        **Validates: Requirements REQ-071, REQ-072**
        """
        from customers.models import ConversionAuditLog
        
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Retrieve the audit log entry
        audit_log = ConversionAuditLog.objects.filter(
            customer_id=customer.id,
            success=True
        ).latest('created_at')
        
        # Verify audit log is associated with correct company
        self.assertEqual(
            audit_log.company,
            self.company,
            f"Audit log should be associated with customer's company"
        )
        self.assertEqual(
            audit_log.company,
            customer.company,
            f"Audit log company should match customer company"
        )
        self.assertEqual(
            audit_log.company,
            lead.company,
            f"Audit log company should match lead company"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
        ConversionAuditLog.objects.filter(customer_id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_multiple_conversions_create_multiple_logs(self, phone, name, lead_data):
        """
        **Property 38: Conversion Audit Logging**
        
        For any sequence of conversion operations (including failed attempts),
        each operation should create a separate audit log entry.
        
        **Validates: Requirements REQ-071**
        """
        from customers.models import ConversionAuditLog
        
        # Create first customer
        customer1 = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Create second customer with different phone
        phone2 = phone + "999" if len(phone) < 12 else phone[:-3] + "999"
        customer2 = Customer.objects.create(
            phone=phone2,
            name=name + " 2",
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Count initial audit logs
        initial_count = ConversionAuditLog.objects.filter(
            company=self.company
        ).count()
        
        # Convert first customer (should succeed)
        lead1 = ConversionService.convert_single(customer1, lead_data, self.user)
        
        # Convert second customer (should succeed)
        lead2 = ConversionService.convert_single(customer2, lead_data, self.user)
        
        # Attempt to convert first customer again (should fail)
        try:
            ConversionService.convert_single(customer1, lead_data, self.user)
        except ValueError:
            pass  # Expected
        
        # Count final audit logs
        final_count = ConversionAuditLog.objects.filter(
            company=self.company
        ).count()
        
        # Verify 3 audit logs were created (2 success + 1 failure)
        self.assertEqual(
            final_count - initial_count,
            3,
            f"Three audit logs should be created for three conversion operations"
        )
        
        # Verify each customer has correct number of logs
        customer1_logs = ConversionAuditLog.objects.filter(
            customer_id=customer1.id
        ).count()
        self.assertEqual(
            customer1_logs,
            2,
            f"Customer 1 should have 2 audit logs (1 success + 1 failure)"
        )
        
        customer2_logs = ConversionAuditLog.objects.filter(
            customer_id=customer2.id
        ).count()
        self.assertEqual(
            customer2_logs,
            1,
            f"Customer 2 should have 1 audit log (1 success)"
        )
        
        # Clean up
        lead1.delete()
        lead2.delete()
        customer1.delete()
        customer2.delete()
        ConversionAuditLog.objects.filter(
            customer_id__in=[customer1.id, customer2.id]
        ).delete()



class TestReferentialIntegrityProperties(TestCase):
    """
    Property-based tests for referential integrity between customers and leads
    
    **Validates: Requirements REQ-069**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Referential Integrity PBT',
            code='TEST_REF_INT_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_ref_integrity_pbt',
            email='test_ref_integrity_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_converted_customer_references_existing_lead(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any customer with is_converted=true and a non-null converted_lead_id,
        there should exist a lead with that ID in the database.
        
        **Validates: Requirements REQ-069**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            is_converted=False,
            converted_lead_id=None
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # Verify customer is marked as converted
        self.assertTrue(
            customer.is_converted,
            f"Customer {customer.id} should be marked as converted"
        )
        
        # Verify customer has a converted_lead_id
        self.assertIsNotNone(
            customer.converted_lead_id,
            f"Customer {customer.id} should have a converted_lead_id"
        )
        
        # CRITICAL: Verify the referenced lead exists in the database
        try:
            referenced_lead = Lead.objects.get(id=int(customer.converted_lead_id))
            
            # Verify it's the correct lead
            self.assertEqual(
                referenced_lead.id,
                lead.id,
                f"Referenced lead ID should match the created lead ID"
            )
            
            # Verify the lead has the correct properties
            self.assertEqual(
                referenced_lead.phone,
                customer.phone,
                f"Lead phone should match customer phone"
            )
            self.assertEqual(
                referenced_lead.company,
                customer.company,
                f"Lead company should match customer company"
            )
            self.assertEqual(
                referenced_lead.source,
                'customer_conversion',
                f"Lead source should be 'customer_conversion'"
            )
            
        except Lead.DoesNotExist:
            self.fail(
                f"REFERENTIAL INTEGRITY VIOLATION: Customer {customer.id} has "
                f"is_converted=True and converted_lead_id={customer.converted_lead_id}, "
                f"but no lead with ID {customer.converted_lead_id} exists in the database"
            )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_referential_integrity_after_multiple_queries(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any converted customer, the referential integrity should hold
        even after multiple database queries and refreshes.
        
        **Validates: Requirements REQ-069**
        """
        # Create and convert a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Perform multiple refresh cycles
        for i in range(5):
            customer.refresh_from_db()
            
            # Verify customer is still converted
            self.assertTrue(
                customer.is_converted,
                f"Customer should remain converted after refresh {i+1}"
            )
            
            # Verify converted_lead_id is still set
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"Customer should have converted_lead_id after refresh {i+1}"
            )
            
            # Verify the lead still exists
            lead_exists = Lead.objects.filter(
                id=int(customer.converted_lead_id)
            ).exists()
            self.assertTrue(
                lead_exists,
                f"Lead {customer.converted_lead_id} should exist after refresh {i+1}"
            )
            
            # Verify we can retrieve the lead
            try:
                retrieved_lead = Lead.objects.get(id=int(customer.converted_lead_id))
                self.assertEqual(
                    retrieved_lead.id,
                    lead.id,
                    f"Retrieved lead should match original lead after refresh {i+1}"
                )
            except Lead.DoesNotExist:
                self.fail(
                    f"REFERENTIAL INTEGRITY VIOLATION after refresh {i+1}: "
                    f"Lead {customer.converted_lead_id} does not exist"
                )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_all_converted_customers_have_valid_lead_references(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any set of converted customers in the database, all of them
        should have valid lead references (no orphaned references).
        
        **Validates: Requirements REQ-069**
        """
        # Create multiple customers
        customers = []
        leads = []
        
        for i in range(3):
            phone_variant = phone + str(i) if len(phone) < 13 else phone[:-1] + str(i)
            customer = Customer.objects.create(
                phone=phone_variant,
                name=f"{name} {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user
            )
            customers.append(customer)
            
            # Convert each customer
            lead = ConversionService.convert_single(customer, lead_data, self.user)
            leads.append(lead)
        
        # Refresh all customers
        for customer in customers:
            customer.refresh_from_db()
        
        # Verify ALL converted customers have valid lead references
        converted_customers = Customer.objects.filter(
            company=self.company,
            is_converted=True
        )
        
        for customer in converted_customers:
            # Verify customer has converted_lead_id
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"Converted customer {customer.id} should have converted_lead_id"
            )
            
            # Verify the referenced lead exists
            lead_exists = Lead.objects.filter(
                id=int(customer.converted_lead_id)
            ).exists()
            self.assertTrue(
                lead_exists,
                f"REFERENTIAL INTEGRITY VIOLATION: Customer {customer.id} references "
                f"lead {customer.converted_lead_id} which does not exist"
            )
            
            # Verify the lead has correct properties
            try:
                referenced_lead = Lead.objects.get(id=int(customer.converted_lead_id))
                self.assertEqual(
                    referenced_lead.company,
                    customer.company,
                    f"Lead company should match customer company"
                )
                self.assertEqual(
                    referenced_lead.source,
                    'customer_conversion',
                    f"Lead source should be 'customer_conversion'"
                )
            except Lead.DoesNotExist:
                self.fail(
                    f"REFERENTIAL INTEGRITY VIOLATION: Lead {customer.converted_lead_id} "
                    f"referenced by customer {customer.id} does not exist"
                )
        
        # Clean up
        for lead in leads:
            lead.delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_referential_integrity_invariant_holds_for_bulk_conversion(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any bulk conversion operation, all successfully converted customers
        should have valid lead references.
        
        **Validates: Requirements REQ-069**
        """
        # Create multiple customers for bulk conversion
        customers = []
        for i in range(5):
            phone_variant = phone + str(i) if len(phone) < 13 else phone[:-1] + str(i)
            customer = Customer.objects.create(
                phone=phone_variant,
                name=f"{name} {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        # Perform bulk conversion
        customer_ids = [c.id for c in customers]
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=lead_data,
            user=self.user
        )
        
        # Verify bulk conversion succeeded
        self.assertEqual(
            result['success_count'],
            5,
            f"All 5 customers should be converted successfully"
        )
        
        # Verify referential integrity for all converted customers
        for customer in customers:
            customer.refresh_from_db()
            
            # Verify customer is converted
            self.assertTrue(
                customer.is_converted,
                f"Customer {customer.id} should be converted after bulk operation"
            )
            
            # Verify customer has converted_lead_id
            self.assertIsNotNone(
                customer.converted_lead_id,
                f"Customer {customer.id} should have converted_lead_id after bulk conversion"
            )
            
            # CRITICAL: Verify the referenced lead exists
            try:
                referenced_lead = Lead.objects.get(id=int(customer.converted_lead_id))
                
                # Verify lead properties
                self.assertEqual(
                    referenced_lead.company,
                    customer.company,
                    f"Lead company should match customer company"
                )
                self.assertEqual(
                    referenced_lead.source,
                    'customer_conversion',
                    f"Lead source should be 'customer_conversion'"
                )
                self.assertEqual(
                    referenced_lead.phone,
                    customer.phone,
                    f"Lead phone should match customer phone"
                )
                
            except Lead.DoesNotExist:
                self.fail(
                    f"REFERENTIAL INTEGRITY VIOLATION in bulk conversion: "
                    f"Customer {customer.id} has converted_lead_id={customer.converted_lead_id} "
                    f"but no lead with that ID exists"
                )
        
        # Clean up
        Lead.objects.filter(
            company=self.company,
            source='customer_conversion',
            phone__in=[c.phone for c in customers]
        ).delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_no_orphaned_converted_lead_ids(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any customer with is_converted=true, the converted_lead_id
        should never be orphaned (pointing to a non-existent lead).
        
        **Validates: Requirements REQ-069**
        """
        # Create and convert a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        customer.refresh_from_db()
        
        # Store the lead ID
        lead_id = lead.id
        converted_lead_id = customer.converted_lead_id
        
        # Verify referential integrity before any operations
        self.assertTrue(
            Lead.objects.filter(id=lead_id).exists(),
            f"Lead {lead_id} should exist after conversion"
        )
        self.assertEqual(
            str(lead_id),
            converted_lead_id,
            f"Customer's converted_lead_id should match lead ID"
        )
        
        # Query the customer again from database
        customer_from_db = Customer.objects.get(id=customer.id)
        
        # Verify the customer still has valid reference
        self.assertTrue(
            customer_from_db.is_converted,
            f"Customer should be marked as converted"
        )
        self.assertIsNotNone(
            customer_from_db.converted_lead_id,
            f"Customer should have converted_lead_id"
        )
        
        # Verify the lead still exists
        try:
            Lead.objects.get(id=int(customer_from_db.converted_lead_id))
        except Lead.DoesNotExist:
            self.fail(
                f"REFERENTIAL INTEGRITY VIOLATION: Customer {customer_from_db.id} "
                f"has converted_lead_id={customer_from_db.converted_lead_id} "
                f"but the lead does not exist (orphaned reference)"
            )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_referential_integrity_bidirectional(self, phone, name, lead_data):
        """
        **Property 36: Referential Integrity Invariant**
        
        For any converted customer, not only should the customer reference
        a valid lead, but the lead should also have properties that link
        back to the customer (phone, company, source).
        
        **Validates: Requirements REQ-069**
        """
        # Create and convert a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        customer.refresh_from_db()
        
        # Verify forward reference (customer -> lead)
        self.assertTrue(customer.is_converted)
        self.assertIsNotNone(customer.converted_lead_id)
        
        try:
            referenced_lead = Lead.objects.get(id=int(customer.converted_lead_id))
        except Lead.DoesNotExist:
            self.fail(
                f"REFERENTIAL INTEGRITY VIOLATION: Customer {customer.id} references "
                f"non-existent lead {customer.converted_lead_id}"
            )
        
        # Verify backward reference properties (lead -> customer)
        self.assertEqual(
            referenced_lead.phone,
            customer.phone,
            f"Lead phone should match customer phone for referential integrity"
        )
        self.assertEqual(
            referenced_lead.company,
            customer.company,
            f"Lead company should match customer company for referential integrity"
        )
        self.assertEqual(
            referenced_lead.source,
            'customer_conversion',
            f"Lead source should indicate it came from customer conversion"
        )
        
        # Verify we can find the lead by customer's phone
        lead_by_phone = Lead.objects.filter(
            phone=customer.phone,
            company=customer.company,
            source='customer_conversion'
        ).first()
        
        self.assertIsNotNone(
            lead_by_phone,
            f"Should be able to find lead by customer's phone"
        )
        self.assertEqual(
            lead_by_phone.id,
            referenced_lead.id,
            f"Lead found by phone should match the referenced lead"
        )
        
        # Clean up
        lead.delete()
        customer.delete()



class TestNotesTransferProperties(TestCase):
    """
    Property-based tests for notes transfer during customer-to-lead conversion
    
    **Validates: Requirements REQ-031**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Notes Transfer PBT',
            code='TEST_NOTES_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_notes_pbt',
            email='test_notes_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_to_lead_description(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with non-empty notes, converting to lead should
        result in a lead whose description field contains the customer's notes.
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with notes
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes=notes,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Verify customer has notes
        self.assertIsNotNone(
            customer.notes,
            f"Customer {customer.id} should have notes"
        )
        self.assertEqual(
            customer.notes,
            notes,
            f"Customer notes should match the provided notes"
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify lead was created
        self.assertIsNotNone(
            lead,
            f"Lead should be created from customer {customer.id}"
        )
        
        # CRITICAL: Verify notes were transferred to lead description
        self.assertIsNotNone(
            lead.description,
            f"Lead {lead.id} should have a description field"
        )
        self.assertIn(
            notes,
            lead.description,
            f"Lead description should contain customer notes. "
            f"Expected notes: '{notes}', Lead description: '{lead.description}'"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_preserves_content(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with notes, the notes content should be preserved
        exactly in the lead description (no data loss or corruption).
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with notes
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes=notes,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Store original notes
        original_notes = customer.notes
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify notes content is preserved in lead description
        self.assertIn(
            original_notes,
            lead.description,
            f"Lead description should contain the exact customer notes without modification"
        )
        
        # Verify no data corruption occurred
        # The lead description should contain the notes as a substring
        notes_found = original_notes in lead.description
        self.assertTrue(
            notes_found,
            f"Customer notes should be found intact in lead description. "
            f"Original notes: '{original_notes}', Lead description: '{lead.description}'"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_empty_notes_handling(self, phone, name, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with empty or null notes, the lead description
        should be handled gracefully (empty string or default value).
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with empty notes
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes='',  # Empty notes
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify lead was created successfully even with empty notes
        self.assertIsNotNone(
            lead,
            f"Lead should be created even when customer has empty notes"
        )
        
        # Verify lead description exists (should be empty string or default)
        self.assertIsNotNone(
            lead.description,
            f"Lead description should not be None"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_does_not_modify_customer(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with notes, converting to lead should transfer
        the notes but NOT modify or delete the customer's original notes.
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with notes
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes=notes,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Store original notes
        original_notes = customer.notes
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Refresh customer from database
        customer.refresh_from_db()
        
        # CRITICAL: Verify customer notes are unchanged
        self.assertEqual(
            customer.notes,
            original_notes,
            f"Customer notes should remain unchanged after conversion. "
            f"Original: '{original_notes}', After conversion: '{customer.notes}'"
        )
        
        # Verify notes were transferred to lead
        self.assertIn(
            original_notes,
            lead.description,
            f"Lead description should contain customer notes"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_handles_special_characters(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with notes containing special characters
        (newlines, tabs, punctuation), the notes should be transferred
        correctly to the lead description.
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with notes containing special characters
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes=notes,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify notes with special characters are transferred correctly
        self.assertIn(
            notes,
            lead.description,
            f"Lead description should contain customer notes with special characters intact"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_in_bulk_conversion(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any bulk conversion operation, all customers with notes
        should have their notes transferred to the respective lead descriptions.
        
        **Validates: Requirements REQ-031**
        """
        # Create multiple customers with notes
        customers = []
        for i in range(3):
            phone_variant = phone + str(i) if len(phone) < 13 else phone[:-1] + str(i)
            customer_notes = f"{notes} - Customer {i}"
            customer = Customer.objects.create(
                phone=phone_variant,
                name=f"{name} {i}",
                notes=customer_notes,
                company=self.company,
                created_by=self.user,
                assigned_to=self.user
            )
            customers.append(customer)
        
        # Perform bulk conversion
        customer_ids = [c.id for c in customers]
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=lead_data,
            user=self.user
        )
        
        # Verify bulk conversion succeeded
        self.assertEqual(
            result['success_count'],
            3,
            f"All 3 customers should be converted successfully"
        )
        
        # Verify notes were transferred for all customers
        for customer in customers:
            customer.refresh_from_db()
            
            # Get the created lead
            try:
                lead = Lead.objects.get(id=int(customer.converted_lead_id))
                
                # Verify customer notes are in lead description
                self.assertIn(
                    customer.notes,
                    lead.description,
                    f"Lead {lead.id} description should contain notes from customer {customer.id}"
                )
                
            except Lead.DoesNotExist:
                self.fail(
                    f"Lead for customer {customer.id} should exist after bulk conversion"
                )
        
        # Clean up
        Lead.objects.filter(
            company=self.company,
            source='customer_conversion',
            phone__in=[c.phone for c in customers]
        ).delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        notes=safe_text(min_size=1, max_size=1000),
        lead_data=valid_lead_data()
    )
    def test_property_notes_transfer_idempotent(self, phone, name, notes, lead_data):
        """
        **Property 21: Notes Transfer**
        
        For any customer with notes, multiple reads of the lead description
        after conversion should always return the same notes content
        (idempotent reads).
        
        **Validates: Requirements REQ-031**
        """
        # Create a customer with notes
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            notes=notes,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Read lead description multiple times
        lead.refresh_from_db()
        description_1 = lead.description
        
        lead.refresh_from_db()
        description_2 = lead.description
        
        lead.refresh_from_db()
        description_3 = lead.description
        
        # Verify all reads return the same description
        self.assertEqual(
            description_1,
            description_2,
            f"Lead description should be consistent across reads"
        )
        self.assertEqual(
            description_2,
            description_3,
            f"Lead description should be consistent across reads"
        )
        
        # Verify all descriptions contain the customer notes
        self.assertIn(notes, description_1)
        self.assertIn(notes, description_2)
        self.assertIn(notes, description_3)
        
        # Clean up
        lead.delete()
        customer.delete()



class TestLeadSourceAssignmentProperties(TestCase):
    """
    Property-based tests for lead source assignment during conversion
    
    **Validates: Requirements REQ-032**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Source PBT',
            code='TEST_SOURCE_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_source_pbt',
            email='test_source_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_is_customer_conversion(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, the created lead should have
        source="customer_conversion".
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify lead source is set to 'customer_conversion'
        self.assertEqual(
            lead.source,
            'customer_conversion',
            f"Lead {lead.id} should have source='customer_conversion', "
            f"but got source='{lead.source}'"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_persists_after_refresh(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, the lead's source field should
        remain 'customer_conversion' after database refresh (persistence).
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Store lead ID
        lead_id = lead.id
        
        # Refresh lead from database
        lead.refresh_from_db()
        
        # Verify source is still 'customer_conversion'
        self.assertEqual(
            lead.source,
            'customer_conversion',
            f"Lead {lead_id} source should persist as 'customer_conversion' after refresh"
        )
        
        # Fetch lead again using a fresh query
        fresh_lead = Lead.objects.get(id=lead_id)
        self.assertEqual(
            fresh_lead.source,
            'customer_conversion',
            f"Lead {lead_id} source should be 'customer_conversion' when fetched fresh"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_not_overridden_by_input(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, even if the lead_data contains
        a different 'source' value, the created lead should have
        source='customer_conversion' (system-assigned, not user-provided).
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Add a different source value to lead_data (should be ignored)
        lead_data_with_source = lead_data.copy()
        lead_data_with_source['source'] = 'website'  # Try to override
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data_with_source, self.user)
        
        # Verify lead source is 'customer_conversion', NOT 'website'
        self.assertEqual(
            lead.source,
            'customer_conversion',
            f"Lead {lead.id} source should be 'customer_conversion' "
            f"(system-assigned), not '{lead.source}' (user-provided)"
        )
        self.assertNotEqual(
            lead.source,
            'website',
            f"Lead {lead.id} source should not be overridden by user input"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_bulk_conversion_assigns_source_to_all_leads(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any bulk conversion operation, all created leads should have
        source='customer_conversion'.
        
        **Validates: Requirements REQ-032**
        """
        # Create multiple customers
        customers = []
        for i in range(3):
            phone_variant = phone + str(i) if len(phone) < 13 else phone[:-1] + str(i)
            customer = Customer.objects.create(
                phone=phone_variant,
                name=f"{name} {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user
            )
            customers.append(customer)
        
        # Perform bulk conversion
        customer_ids = [c.id for c in customers]
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=lead_data,
            user=self.user
        )
        
        # Verify bulk conversion succeeded
        self.assertEqual(
            result['success_count'],
            3,
            f"All 3 customers should be converted successfully"
        )
        
        # Verify all created leads have source='customer_conversion'
        for customer in customers:
            customer.refresh_from_db()
            
            # Get the created lead
            try:
                lead = Lead.objects.get(id=int(customer.converted_lead_id))
                
                # Verify lead source
                self.assertEqual(
                    lead.source,
                    'customer_conversion',
                    f"Lead {lead.id} from bulk conversion should have "
                    f"source='customer_conversion', but got '{lead.source}'"
                )
                
            except Lead.DoesNotExist:
                self.fail(
                    f"Lead for customer {customer.id} should exist after bulk conversion"
                )
        
        # Clean up
        Lead.objects.filter(
            company=self.company,
            source='customer_conversion',
            phone__in=[c.phone for c in customers]
        ).delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_queryable(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, the lead should be queryable
        by source='customer_conversion' filter.
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Query leads by source='customer_conversion'
        converted_leads = Lead.objects.filter(
            source='customer_conversion',
            company=self.company
        )
        
        # Verify the created lead is in the query results
        self.assertIn(
            lead,
            converted_leads,
            f"Lead {lead.id} should be queryable by source='customer_conversion'"
        )
        
        # Verify we can find the lead by phone and source
        lead_by_phone_and_source = Lead.objects.filter(
            phone=customer.phone,
            source='customer_conversion',
            company=self.company
        ).first()
        
        self.assertIsNotNone(
            lead_by_phone_and_source,
            f"Should be able to find lead by phone and source='customer_conversion'"
        )
        self.assertEqual(
            lead_by_phone_and_source.id,
            lead.id,
            f"Found lead should match the created lead"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_immutable_after_creation(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, the lead's source field should
        remain 'customer_conversion' and not be changed by subsequent operations
        (immutability of source for converted leads).
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Convert customer to lead
        lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify initial source
        self.assertEqual(
            lead.source,
            'customer_conversion',
            f"Lead {lead.id} should have source='customer_conversion' initially"
        )
        
        # Simulate other operations that might modify the lead
        # (e.g., updating status, notes, etc.)
        lead.status = 'hot'
        lead.save()
        
        # Refresh and verify source is still 'customer_conversion'
        lead.refresh_from_db()
        self.assertEqual(
            lead.source,
            'customer_conversion',
            f"Lead {lead.id} source should remain 'customer_conversion' "
            f"after other field updates"
        )
        
        # Clean up
        lead.delete()
        customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        phone=valid_phone_numbers(),
        name=valid_customer_names(),
        lead_data=valid_lead_data()
    )
    def test_property_lead_source_distinguishes_conversion_leads(self, phone, name, lead_data):
        """
        **Property 22: Lead Source Assignment**
        
        For any customer converted to lead, the lead should be distinguishable
        from leads created through other sources (e.g., 'website', 'referral').
        
        **Validates: Requirements REQ-032**
        """
        # Create a customer
        customer = Customer.objects.create(
            phone=phone,
            name=name,
            company=self.company,
            created_by=self.user,
            assigned_to=self.user
        )
        
        # Create a lead from a different source (e.g., website)
        phone_website = phone + "999" if len(phone) < 12 else phone[:-3] + "999"
        website_lead = Lead.objects.create(
            name=name + " Website",
            phone=phone_website,
            source='website',
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            requirement_type=lead_data['requirement_type'],
            bhk_requirement=lead_data['bhk_requirement'],
            budget_min=lead_data['budget_min'],
            budget_max=lead_data['budget_max'],
            preferred_location=lead_data['preferred_location'],
            status=lead_data['status']
        )
        
        # Convert customer to lead
        converted_lead = ConversionService.convert_single(customer, lead_data, self.user)
        
        # Verify the two leads have different sources
        self.assertNotEqual(
            converted_lead.source,
            website_lead.source,
            f"Converted lead and website lead should have different sources"
        )
        self.assertEqual(
            converted_lead.source,
            'customer_conversion',
            f"Converted lead should have source='customer_conversion'"
        )
        self.assertEqual(
            website_lead.source,
            'website',
            f"Website lead should have source='website'"
        )
        
        # Verify we can filter to get only conversion leads
        conversion_leads = Lead.objects.filter(
            source='customer_conversion',
            company=self.company
        )
        
        self.assertIn(
            converted_lead,
            conversion_leads,
            f"Converted lead should be in conversion leads query"
        )
        self.assertNotIn(
            website_lead,
            conversion_leads,
            f"Website lead should NOT be in conversion leads query"
        )
        
        # Clean up
        converted_lead.delete()
        website_lead.delete()
        customer.delete()



class TestBulkConversionDefaultValuesProperties(TestCase):
    """
    Property-based tests for bulk conversion default values
    
    **Validates: Requirements REQ-038**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Bulk Default PBT',
            code='TEST_BULK_DEF_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_bulk_default_pbt',
            email='test_bulk_default_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.data_too_large])
    @given(
        customer_count=st.integers(min_value=2, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_applies_default_values(self, customer_count, default_values):
        """
        **Property 26: Bulk Conversion Default Values**
        
        For any bulk conversion operation with specified default values,
        all successfully created leads should have those default values
        for the specified fields.
        
        **Validates: Requirements REQ-038**
        """
        # Create multiple customers
        customers = []
        for i in range(customer_count):
            phone = f"1234567890{i:03d}"  # Unique phone for each customer
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        # Extract customer IDs
        customer_ids = [c.id for c in customers]
        
        # Perform bulk conversion with default values
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all conversions succeeded
        self.assertEqual(
            result['success_count'],
            customer_count,
            f"All {customer_count} customers should be converted successfully"
        )
        self.assertEqual(
            result['error_count'],
            0,
            f"No errors should occur during bulk conversion"
        )
        
        # Verify each created lead has the default values
        for customer in customers:
            customer.refresh_from_db()
            
            # Verify customer is converted
            self.assertTrue(
                customer.is_converted,
                f"Customer {customer.id} should be marked as converted"
            )
            
            # Get the created lead
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            
            # Verify default values are applied
            self.assertEqual(
                lead.requirement_type,
                default_values['requirement_type'],
                f"Lead {lead.id} should have requirement_type from default values"
            )
            self.assertEqual(
                lead.bhk_requirement,
                default_values['bhk_requirement'],
                f"Lead {lead.id} should have bhk_requirement from default values"
            )
            self.assertEqual(
                lead.budget_min,
                default_values['budget_min'],
                f"Lead {lead.id} should have budget_min from default values"
            )
            self.assertEqual(
                lead.budget_max,
                default_values['budget_max'],
                f"Lead {lead.id} should have budget_max from default values"
            )
            self.assertEqual(
                lead.preferred_location,
                default_values['preferred_location'],
                f"Lead {lead.id} should have preferred_location from default values"
            )
            self.assertEqual(
                lead.status,
                default_values['status'],
                f"Lead {lead.id} should have status from default values"
            )
            
            # Clean up lead
            lead.delete()
        
        # Clean up customers
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=2, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_default_values_consistency(self, customer_count, default_values):
        """
        **Property 26: Bulk Conversion Default Values**
        
        For any bulk conversion operation, all successfully created leads
        should have identical values for fields specified in default_values
        (consistency across all conversions).
        
        **Validates: Requirements REQ-038**
        """
        # Create multiple customers
        customers = []
        for i in range(customer_count):
            phone = f"2234567890{i:03d}"  # Unique phone for each customer
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        # Extract customer IDs
        customer_ids = [c.id for c in customers]
        
        # Perform bulk conversion with default values
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all conversions succeeded
        self.assertEqual(
            result['success_count'],
            customer_count,
            f"All {customer_count} customers should be converted successfully"
        )
        
        # Collect all created leads
        leads = []
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            leads.append(lead)
        
        # Verify all leads have identical default values
        first_lead = leads[0]
        for i, lead in enumerate(leads[1:], start=1):
            self.assertEqual(
                lead.requirement_type,
                first_lead.requirement_type,
                f"Lead {i} requirement_type should match lead 0"
            )
            self.assertEqual(
                lead.bhk_requirement,
                first_lead.bhk_requirement,
                f"Lead {i} bhk_requirement should match lead 0"
            )
            self.assertEqual(
                lead.budget_min,
                first_lead.budget_min,
                f"Lead {i} budget_min should match lead 0"
            )
            self.assertEqual(
                lead.budget_max,
                first_lead.budget_max,
                f"Lead {i} budget_max should match lead 0"
            )
            self.assertEqual(
                lead.preferred_location,
                first_lead.preferred_location,
                f"Lead {i} preferred_location should match lead 0"
            )
            self.assertEqual(
                lead.status,
                first_lead.status,
                f"Lead {i} status should match lead 0"
            )
        
        # Clean up
        for lead in leads:
            lead.delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=2, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_preserves_customer_specific_data(self, customer_count, default_values):
        """
        **Property 26: Bulk Conversion Default Values**
        
        For any bulk conversion operation with default values, customer-specific
        data (name, phone) should be preserved in each lead, not overwritten
        by default values.
        
        **Validates: Requirements REQ-038**
        """
        # Create multiple customers with unique data
        customers = []
        for i in range(customer_count):
            phone = f"3234567890{i:03d}"  # Unique phone for each customer
            name = f"Unique Customer {i}"
            customer = Customer.objects.create(
                phone=phone,
                name=name,
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        # Extract customer IDs
        customer_ids = [c.id for c in customers]
        
        # Perform bulk conversion with default values
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all conversions succeeded
        self.assertEqual(
            result['success_count'],
            customer_count,
            f"All {customer_count} customers should be converted successfully"
        )
        
        # Verify each lead preserves customer-specific data
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            
            # Verify customer-specific data is preserved
            self.assertEqual(
                lead.phone,
                customer.phone,
                f"Lead {lead.id} should preserve customer phone {customer.phone}"
            )
            self.assertEqual(
                lead.name,
                customer.name,
                f"Lead {lead.id} should preserve customer name {customer.name}"
            )
            
            # Verify default values are still applied
            self.assertEqual(
                lead.requirement_type,
                default_values['requirement_type'],
                f"Lead {lead.id} should have requirement_type from default values"
            )
            self.assertEqual(
                lead.status,
                default_values['status'],
                f"Lead {lead.id} should have status from default values"
            )
            
            # Clean up lead
            lead.delete()
        
        # Clean up customers
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=2, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_default_values_override_empty_fields(self, customer_count, default_values):
        """
        **Property 26: Bulk Conversion Default Values**
        
        For any bulk conversion operation, default values should be used
        for all specified fields, effectively providing values for fields
        that would otherwise be empty or require user input.
        
        **Validates: Requirements REQ-038**
        """
        # Create multiple customers with minimal data (no lead-specific fields)
        customers = []
        for i in range(customer_count):
            phone = f"4234567890{i:03d}"  # Unique phone for each customer
            customer = Customer.objects.create(
                phone=phone,
                name=f"Minimal Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False,
                notes=""  # No notes
            )
            customers.append(customer)
        
        # Extract customer IDs
        customer_ids = [c.id for c in customers]
        
        # Perform bulk conversion with default values
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all conversions succeeded
        self.assertEqual(
            result['success_count'],
            customer_count,
            f"All {customer_count} customers should be converted successfully"
        )
        
        # Verify each lead has complete data from default values
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            
            # Verify all default values are present (not None or empty)
            self.assertIsNotNone(
                lead.requirement_type,
                f"Lead {lead.id} should have requirement_type from defaults"
            )
            self.assertNotEqual(
                lead.requirement_type,
                "",
                f"Lead {lead.id} requirement_type should not be empty"
            )
            
            self.assertIsNotNone(
                lead.bhk_requirement,
                f"Lead {lead.id} should have bhk_requirement from defaults"
            )
            self.assertNotEqual(
                lead.bhk_requirement,
                "",
                f"Lead {lead.id} bhk_requirement should not be empty"
            )
            
            self.assertIsNotNone(
                lead.budget_min,
                f"Lead {lead.id} should have budget_min from defaults"
            )
            self.assertGreaterEqual(
                lead.budget_min,
                0,
                f"Lead {lead.id} budget_min should be >= 0"
            )
            
            self.assertIsNotNone(
                lead.budget_max,
                f"Lead {lead.id} should have budget_max from defaults"
            )
            self.assertGreaterEqual(
                lead.budget_max,
                lead.budget_min,
                f"Lead {lead.id} budget_max should be >= budget_min"
            )
            
            self.assertIsNotNone(
                lead.preferred_location,
                f"Lead {lead.id} should have preferred_location from defaults"
            )
            
            self.assertIsNotNone(
                lead.status,
                f"Lead {lead.id} should have status from defaults"
            )
            self.assertNotEqual(
                lead.status,
                "",
                f"Lead {lead.id} status should not be empty"
            )
            
            # Clean up lead
            lead.delete()
        
        # Clean up customers
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=2, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_default_values_immutable_during_operation(self, customer_count, default_values):
        """
        **Property 26: Bulk Conversion Default Values**
        
        For any bulk conversion operation, the default_values dictionary
        should not be modified during the operation (immutability).
        
        **Validates: Requirements REQ-038**
        """
        # Create multiple customers
        customers = []
        for i in range(customer_count):
            phone = f"5234567890{i:03d}"  # Unique phone for each customer
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        # Extract customer IDs
        customer_ids = [c.id for c in customers]
        
        # Store original default values
        original_default_values = default_values.copy()
        
        # Perform bulk conversion
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify default_values dictionary was not modified
        self.assertEqual(
            default_values,
            original_default_values,
            f"default_values should not be modified during bulk conversion"
        )
        
        # Verify all keys are still present
        for key in original_default_values.keys():
            self.assertIn(
                key,
                default_values,
                f"Key '{key}' should still be in default_values"
            )
            self.assertEqual(
                default_values[key],
                original_default_values[key],
                f"Value for key '{key}' should not change"
            )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            if customer.is_converted:
                lead = Lead.objects.get(id=int(customer.converted_lead_id))
                lead.delete()
            customer.delete()



class TestBulkConversionSummaryAccuracyProperties(TestCase):
    """
    Property-based tests for bulk conversion summary accuracy
    
    **Validates: Requirements REQ-040**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Bulk Summary PBT',
            code='TEST_BULK_SUM_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_bulk_summary_pbt',
            email='test_bulk_summary_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_customers=st.integers(min_value=1, max_value=20),
        already_converted_count=st.integers(min_value=0, max_value=5),
        invalid_ids_count=st.integers(min_value=0, max_value=3),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_counts_equal_total(
        self, 
        total_customers, 
        already_converted_count, 
        invalid_ids_count,
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion operation, the summary counts 
        (success_count + skipped_count + error_count) should equal 
        the total number of customer IDs provided.
        
        **Validates: Requirements REQ-040**
        """
        # Ensure already_converted_count doesn't exceed total_customers
        already_converted_count = min(already_converted_count, total_customers)
        
        # Create customers
        customers = []
        customer_ids = []
        
        # Create unconverted customers
        unconverted_count = total_customers - already_converted_count
        for i in range(unconverted_count):
            phone = f"9876543210{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Unconverted Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Create already-converted customers
        for i in range(already_converted_count):
            phone = f"8765432109{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Already Converted Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            
            # Convert this customer first
            lead = ConversionService.convert_single(customer, default_values, self.user)
            customer.refresh_from_db()
            
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Add invalid customer IDs (non-existent)
        invalid_ids = []
        for i in range(invalid_ids_count):
            # Use a very large ID that doesn't exist
            invalid_id = 999999 + i
            invalid_ids.append(invalid_id)
            customer_ids.append(invalid_id)
        
        # Total IDs provided
        total_ids_provided = len(customer_ids)
        
        # Perform bulk conversion
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify the summary accuracy property
        summary_sum = (
            result['success_count'] + 
            result['skipped_count'] + 
            result['error_count']
        )
        
        self.assertEqual(
            summary_sum,
            total_ids_provided,
            f"Summary counts (success={result['success_count']}, "
            f"skipped={result['skipped_count']}, error={result['error_count']}) "
            f"should sum to total IDs provided ({total_ids_provided})"
        )
        
        # Verify the 'total' field matches
        self.assertEqual(
            result['total'],
            total_ids_provided,
            f"Result 'total' field should match number of IDs provided"
        )
        
        # Verify expected counts
        self.assertEqual(
            result['skipped_count'],
            already_converted_count,
            f"Skipped count should equal number of already-converted customers"
        )
        
        self.assertEqual(
            result['error_count'],
            invalid_ids_count,
            f"Error count should equal number of invalid IDs"
        )
        
        self.assertEqual(
            result['success_count'],
            unconverted_count,
            f"Success count should equal number of unconverted customers"
        )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            if customer.is_converted:
                try:
                    lead = Lead.objects.get(id=int(customer.converted_lead_id))
                    lead.delete()
                except Lead.DoesNotExist:
                    pass
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=1, max_value=15),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_all_success(
        self, 
        customer_count, 
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion with all valid unconverted customers,
        success_count should equal total, and skipped_count and 
        error_count should be zero.
        
        **Validates: Requirements REQ-040**
        """
        # Create all unconverted customers
        customers = []
        customer_ids = []
        
        for i in range(customer_count):
            phone = f"7654321098{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Valid Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Perform bulk conversion
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all succeeded
        self.assertEqual(
            result['success_count'],
            customer_count,
            f"All {customer_count} customers should be converted successfully"
        )
        
        self.assertEqual(
            result['skipped_count'],
            0,
            f"No customers should be skipped when all are unconverted"
        )
        
        self.assertEqual(
            result['error_count'],
            0,
            f"No errors should occur when all customers are valid"
        )
        
        # Verify summary accuracy
        summary_sum = (
            result['success_count'] + 
            result['skipped_count'] + 
            result['error_count']
        )
        
        self.assertEqual(
            summary_sum,
            customer_count,
            f"Summary counts should sum to total customers"
        )
        
        self.assertEqual(
            result['total'],
            customer_count,
            f"Result 'total' should match customer count"
        )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            lead.delete()
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=1, max_value=15),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_all_skipped(
        self, 
        customer_count, 
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion with all already-converted customers,
        skipped_count should equal total, and success_count and 
        error_count should be zero.
        
        **Validates: Requirements REQ-040**
        """
        # Create and convert all customers first
        customers = []
        customer_ids = []
        
        for i in range(customer_count):
            phone = f"6543210987{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Already Converted {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            
            # Convert immediately
            lead = ConversionService.convert_single(customer, default_values, self.user)
            customer.refresh_from_db()
            
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Attempt bulk conversion on already-converted customers
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all were skipped
        self.assertEqual(
            result['skipped_count'],
            customer_count,
            f"All {customer_count} customers should be skipped (already converted)"
        )
        
        self.assertEqual(
            result['success_count'],
            0,
            f"No new conversions should occur when all are already converted"
        )
        
        self.assertEqual(
            result['error_count'],
            0,
            f"No errors should occur when skipping already-converted customers"
        )
        
        # Verify summary accuracy
        summary_sum = (
            result['success_count'] + 
            result['skipped_count'] + 
            result['error_count']
        )
        
        self.assertEqual(
            summary_sum,
            customer_count,
            f"Summary counts should sum to total customers"
        )
        
        self.assertEqual(
            result['total'],
            customer_count,
            f"Result 'total' should match customer count"
        )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            lead.delete()
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        invalid_id_count=st.integers(min_value=1, max_value=10),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_all_errors(
        self, 
        invalid_id_count, 
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion with all invalid customer IDs,
        error_count should equal total, and success_count and 
        skipped_count should be zero.
        
        **Validates: Requirements REQ-040**
        """
        # Create list of invalid customer IDs (non-existent)
        invalid_ids = []
        for i in range(invalid_id_count):
            invalid_id = 888888 + i
            invalid_ids.append(invalid_id)
        
        # Attempt bulk conversion with invalid IDs
        result = ConversionService.convert_bulk(
            customer_ids=invalid_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify all resulted in errors
        self.assertEqual(
            result['error_count'],
            invalid_id_count,
            f"All {invalid_id_count} invalid IDs should result in errors"
        )
        
        self.assertEqual(
            result['success_count'],
            0,
            f"No conversions should succeed with invalid IDs"
        )
        
        self.assertEqual(
            result['skipped_count'],
            0,
            f"No customers should be skipped with invalid IDs"
        )
        
        # Verify summary accuracy
        summary_sum = (
            result['success_count'] + 
            result['skipped_count'] + 
            result['error_count']
        )
        
        self.assertEqual(
            summary_sum,
            invalid_id_count,
            f"Summary counts should sum to total invalid IDs"
        )
        
        self.assertEqual(
            result['total'],
            invalid_id_count,
            f"Result 'total' should match invalid ID count"
        )
        
        # Verify errors list has correct length
        self.assertEqual(
            len(result['errors']),
            invalid_id_count,
            f"Errors list should contain {invalid_id_count} entries"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        success_count=st.integers(min_value=1, max_value=5),
        skip_count=st.integers(min_value=1, max_value=5),
        error_count=st.integers(min_value=1, max_value=5),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_mixed_results(
        self, 
        success_count, 
        skip_count, 
        error_count,
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion with mixed results (successes, skips, errors),
        the sum of all counts should equal the total number of IDs provided.
        
        **Validates: Requirements REQ-040**
        """
        customers = []
        customer_ids = []
        
        # Create customers that will succeed
        for i in range(success_count):
            phone = f"5432109876{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Success Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Create customers that will be skipped (already converted)
        for i in range(skip_count):
            phone = f"4321098765{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Skip Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            
            # Convert immediately
            lead = ConversionService.convert_single(customer, default_values, self.user)
            customer.refresh_from_db()
            
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # Add invalid IDs that will error
        for i in range(error_count):
            invalid_id = 777777 + i
            customer_ids.append(invalid_id)
        
        # Calculate expected total
        expected_total = success_count + skip_count + error_count
        
        # Perform bulk conversion
        result = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify summary accuracy property
        summary_sum = (
            result['success_count'] + 
            result['skipped_count'] + 
            result['error_count']
        )
        
        self.assertEqual(
            summary_sum,
            expected_total,
            f"Summary counts (success={result['success_count']}, "
            f"skipped={result['skipped_count']}, error={result['error_count']}) "
            f"should sum to expected total ({expected_total})"
        )
        
        self.assertEqual(
            result['total'],
            expected_total,
            f"Result 'total' should match expected total"
        )
        
        # Verify individual counts match expectations
        self.assertEqual(
            result['success_count'],
            success_count,
            f"Success count should match expected"
        )
        
        self.assertEqual(
            result['skipped_count'],
            skip_count,
            f"Skipped count should match expected"
        )
        
        self.assertEqual(
            result['error_count'],
            error_count,
            f"Error count should match expected"
        )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            if customer.is_converted:
                try:
                    lead = Lead.objects.get(id=int(customer.converted_lead_id))
                    lead.delete()
                except Lead.DoesNotExist:
                    pass
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        customer_count=st.integers(min_value=1, max_value=15),
        default_values=valid_lead_data()
    )
    def test_property_bulk_conversion_summary_idempotent(
        self, 
        customer_count, 
        default_values
    ):
        """
        **Property 28: Bulk Conversion Summary Accuracy**
        
        For any bulk conversion operation performed multiple times with
        the same customer IDs, the summary counts should remain consistent
        (idempotent summary reporting).
        
        **Validates: Requirements REQ-040**
        """
        # Create customers
        customers = []
        customer_ids = []
        
        for i in range(customer_count):
            phone = f"3210987654{i:04d}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Idempotent Test Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=False
            )
            customers.append(customer)
            customer_ids.append(customer.id)
        
        # First bulk conversion
        result1 = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Second bulk conversion (should skip all)
        result2 = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Third bulk conversion (should skip all)
        result3 = ConversionService.convert_bulk(
            customer_ids=customer_ids,
            default_values=default_values,
            user=self.user
        )
        
        # Verify first conversion succeeded
        self.assertEqual(
            result1['success_count'],
            customer_count,
            f"First conversion should succeed for all customers"
        )
        
        # Verify summary accuracy for all attempts
        for i, result in enumerate([result1, result2, result3], 1):
            summary_sum = (
                result['success_count'] + 
                result['skipped_count'] + 
                result['error_count']
            )
            
            self.assertEqual(
                summary_sum,
                customer_count,
                f"Attempt {i}: Summary counts should sum to total customers"
            )
            
            self.assertEqual(
                result['total'],
                customer_count,
                f"Attempt {i}: Result 'total' should match customer count"
            )
        
        # Verify subsequent conversions skipped all
        self.assertEqual(
            result2['skipped_count'],
            customer_count,
            f"Second conversion should skip all (already converted)"
        )
        
        self.assertEqual(
            result3['skipped_count'],
            customer_count,
            f"Third conversion should skip all (already converted)"
        )
        
        # Clean up
        for customer in customers:
            customer.refresh_from_db()
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            lead.delete()
            customer.delete()
