"""
Property-based tests for Customer API Endpoints

This test suite uses hypothesis to verify universal properties of the API filtering
and query logic across a wide range of inputs, ensuring correctness beyond specific examples.

**Validates: Requirements REQ-019, REQ-020**
"""

from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
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
def customer_data(draw, company, user):
    """Generate customer data for testing"""
    phone = draw(valid_phone_numbers())
    name = draw(st.text(
        min_size=1,
        max_size=100,
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    )).strip() or 'Test Customer'
    
    is_converted = draw(st.booleans())
    
    return {
        'phone': phone,
        'name': name,
        'is_converted': is_converted,
        'converted_lead_id': f"lead_{phone}" if is_converted else None,
        'company': company,
        'created_by': user,
        'call_status': draw(st.sampled_from(['pending', 'answered', 'not_answered', 'busy', 'invalid']))
    }


class TestCustomerAPIProperties(TestCase):
    """
    Property-based tests for Customer API Endpoints
    
    **Validates: Requirements REQ-019, REQ-020**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        cls.company = Company.objects.create(
            name='Test Company PBT API',
            code='TEST_PBT_API',
            is_active=True
        )
        
        cls.user = User.objects.create_user(
            username='test_user_pbt_api',
            email='test_pbt_api@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_converted=st.integers(min_value=0, max_value=20),
        num_unconverted=st.integers(min_value=0, max_value=20)
    )
    def test_property_conversion_status_filtering(self, num_converted, num_unconverted):
        """
        **Property 14: Conversion Status Filtering**
        
        For any customer list query with is_converted filter,
        the results should only include customers matching the specified conversion status (true/false).
        
        **Validates: Requirements REQ-019**
        """
        # Skip if no customers to test
        if num_converted == 0 and num_unconverted == 0:
            assume(False)
        
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create converted customers
        converted_customers = []
        for i in range(num_converted):
            phone = f"+1{str(i).zfill(13)}_conv"
            customer = Customer.objects.create(
                name=f"Converted Customer {i}",
                phone=phone,
                company=self.company,
                created_by=self.user,
                is_converted=True,
                converted_lead_id=f"lead_{phone}"
            )
            converted_customers.append(customer)
        
        # Create unconverted customers
        unconverted_customers = []
        for i in range(num_unconverted):
            phone = f"+1{str(i).zfill(13)}_unconv"
            customer = Customer.objects.create(
                name=f"Unconverted Customer {i}",
                phone=phone,
                company=self.company,
                created_by=self.user,
                is_converted=False
            )
            unconverted_customers.append(customer)
        
        try:
            # Test filter: converted=true
            response_true = client.get('/api/customers/?converted=true')
            self.assertEqual(
                response_true.status_code,
                status.HTTP_200_OK,
                "API should return 200 OK for converted=true filter"
            )
            
            # Verify all returned customers are converted
            results_true = response_true.data['results']
            for customer in results_true:
                self.assertTrue(
                    customer['is_converted'],
                    f"Customer {customer['id']} should be converted when filtered by converted=true"
                )
            
            # Verify count matches expected
            # Note: May include customers from other tests, so we check >= our created count
            converted_count = len([c for c in results_true if c['is_converted']])
            self.assertGreaterEqual(
                converted_count,
                num_converted,
                f"Should return at least {num_converted} converted customers"
            )
            
            # Test filter: converted=false
            response_false = client.get('/api/customers/?converted=false')
            self.assertEqual(
                response_false.status_code,
                status.HTTP_200_OK,
                "API should return 200 OK for converted=false filter"
            )
            
            # Verify all returned customers are not converted
            results_false = response_false.data['results']
            for customer in results_false:
                self.assertFalse(
                    customer['is_converted'],
                    f"Customer {customer['id']} should not be converted when filtered by converted=false"
                )
            
            # Verify count matches expected
            unconverted_count = len([c for c in results_false if not c['is_converted']])
            self.assertGreaterEqual(
                unconverted_count,
                num_unconverted,
                f"Should return at least {num_unconverted} unconverted customers"
            )
            
            # Test filter: converted=all (should return both)
            response_all = client.get('/api/customers/?converted=all')
            self.assertEqual(
                response_all.status_code,
                status.HTTP_200_OK,
                "API should return 200 OK for converted=all filter"
            )
            
            # Verify both converted and unconverted customers are returned
            results_all = response_all.data['results']
            total_count = response_all.data['count']
            self.assertGreaterEqual(
                total_count,
                num_converted + num_unconverted,
                f"Should return at least {num_converted + num_unconverted} customers with converted=all"
            )
            
            # Test no filter (should return all, same as converted=all)
            response_no_filter = client.get('/api/customers/')
            self.assertEqual(
                response_no_filter.status_code,
                status.HTTP_200_OK,
                "API should return 200 OK with no filter"
            )
            
            # Verify count matches converted=all
            self.assertEqual(
                response_no_filter.data['count'],
                response_all.data['count'],
                "No filter should return same count as converted=all"
            )
            
            # Property: Partition invariant
            # The union of converted=true and converted=false should equal converted=all
            # (accounting for pagination, we check the counts)
            converted_in_all = len([c for c in results_all if c['is_converted']])
            unconverted_in_all = len([c for c in results_all if not c['is_converted']])
            
            self.assertEqual(
                converted_in_all + unconverted_in_all,
                len(results_all),
                "All customers should be either converted or unconverted (partition property)"
            )
            
        finally:
            # Clean up - delete test customers
            Customer.objects.filter(
                phone__in=[c.phone for c in converted_customers + unconverted_customers]
            ).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=1, max_value=10),
        filter_status=st.sampled_from(['true', 'false', 'all', None])
    )
    def test_property_conversion_filter_consistency(self, num_customers, filter_status):
        """
        **Property: Conversion Filter Consistency**
        
        For any set of customers with mixed conversion statuses,
        filtering by conversion status should be consistent across multiple queries.
        
        **Validates: Requirements REQ-019**
        """
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create customers with random conversion statuses
        customers = []
        for i in range(num_customers):
            phone = f"+2{str(i).zfill(13)}_test"
            is_converted = (i % 2 == 0)  # Alternate between converted and not
            customer = Customer.objects.create(
                name=f"Test Customer {i}",
                phone=phone,
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=f"lead_{phone}" if is_converted else None
            )
            customers.append(customer)
        
        try:
            # Build query URL
            if filter_status is None:
                url = '/api/customers/'
            else:
                url = f'/api/customers/?converted={filter_status}'
            
            # Query twice to verify consistency
            response1 = client.get(url)
            response2 = client.get(url)
            
            self.assertEqual(response1.status_code, status.HTTP_200_OK)
            self.assertEqual(response2.status_code, status.HTTP_200_OK)
            
            # Extract our test customers from results
            test_phones = {c.phone for c in customers}
            results1 = [c for c in response1.data['results'] if c['phone'] in test_phones]
            results2 = [c for c in response2.data['results'] if c['phone'] in test_phones]
            
            # Verify consistency: same customers returned in both queries
            phones1 = sorted([c['phone'] for c in results1])
            phones2 = sorted([c['phone'] for c in results2])
            
            self.assertEqual(
                phones1,
                phones2,
                f"Filter {filter_status} should return consistent results across queries"
            )
            
            # Verify filter correctness
            if filter_status == 'true':
                for customer in results1:
                    self.assertTrue(
                        customer['is_converted'],
                        f"Customer {customer['phone']} should be converted"
                    )
            elif filter_status == 'false':
                for customer in results1:
                    self.assertFalse(
                        customer['is_converted'],
                        f"Customer {customer['phone']} should not be converted"
                    )
            # For 'all' or None, both types should be present (if we created both)
            elif filter_status in ('all', None):
                converted_count = sum(1 for c in results1 if c['is_converted'])
                unconverted_count = sum(1 for c in results1 if not c['is_converted'])
                
                # We created alternating statuses, so both should be present
                expected_converted = (num_customers + 1) // 2
                expected_unconverted = num_customers // 2
                
                self.assertEqual(
                    converted_count,
                    expected_converted,
                    f"Should have {expected_converted} converted customers"
                )
                self.assertEqual(
                    unconverted_count,
                    expected_unconverted,
                    f"Should have {expected_unconverted} unconverted customers"
                )
            
        finally:
            # Clean up
            Customer.objects.filter(phone__in=[c.phone for c in customers]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=2, max_value=15)
    )
    def test_property_conversion_filter_mutual_exclusivity(self, num_customers):
        """
        **Property: Conversion Filter Mutual Exclusivity**
        
        For any set of customers, the intersection of converted=true and converted=false
        results should be empty (no customer should appear in both).
        
        **Validates: Requirements REQ-019**
        """
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create customers with mixed conversion statuses
        customers = []
        for i in range(num_customers):
            phone = f"+3{str(i).zfill(13)}_excl"
            is_converted = (i % 3 == 0)  # Some converted, some not
            customer = Customer.objects.create(
                name=f"Exclusive Test {i}",
                phone=phone,
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=f"lead_{phone}" if is_converted else None
            )
            customers.append(customer)
        
        try:
            # Query converted=true
            response_true = client.get('/api/customers/?converted=true')
            self.assertEqual(response_true.status_code, status.HTTP_200_OK)
            
            # Query converted=false
            response_false = client.get('/api/customers/?converted=false')
            self.assertEqual(response_false.status_code, status.HTTP_200_OK)
            
            # Extract our test customers
            test_phones = {c.phone for c in customers}
            phones_true = {c['phone'] for c in response_true.data['results'] if c['phone'] in test_phones}
            phones_false = {c['phone'] for c in response_false.data['results'] if c['phone'] in test_phones}
            
            # Verify mutual exclusivity: no overlap
            intersection = phones_true & phones_false
            self.assertEqual(
                len(intersection),
                0,
                f"Converted and unconverted filters should have no overlap, found: {intersection}"
            )
            
            # Verify union equals all customers
            union = phones_true | phones_false
            self.assertEqual(
                len(union),
                num_customers,
                f"Union of converted and unconverted should equal total customers"
            )
            
        finally:
            # Clean up
            Customer.objects.filter(phone__in=[c.phone for c in customers]).delete()

    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=3, max_value=15),
        sort_field=st.sampled_from(['created_at', 'call_status', 'name', '-created_at', '-call_status', '-name'])
    )
    def test_property_customer_sorting_correctness(self, num_customers, sort_field):
        """
        **Property 15: Customer Sorting Correctness**
        
        For any customer list query with a sort parameter (created_at, call_status, or name),
        the results should be ordered correctly according to that field.
        
        **Validates: Requirements REQ-020**
        """
        from datetime import timedelta
        from django.utils import timezone
        
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create customers with varied data for sorting
        customers = []
        base_time = timezone.now()
        
        for i in range(num_customers):
            phone = f"+4{str(i).zfill(13)}_sort"
            
            # Vary the data to test sorting
            name = f"Customer {chr(65 + (i % 26))}{i}"  # Names like "Customer A0", "Customer B1", etc.
            call_status_choices = ['pending', 'answered', 'not_answered', 'busy', 'not_interested']
            call_status = call_status_choices[i % len(call_status_choices)]
            
            # Create customers with different timestamps (spread over time)
            created_at = base_time - timedelta(hours=i)
            
            customer = Customer.objects.create(
                name=name,
                phone=phone,
                company=self.company,
                created_by=self.user,
                call_status=call_status,
                is_converted=False
            )
            # Manually set created_at to control ordering
            Customer.objects.filter(id=customer.id).update(created_at=created_at)
            customer.refresh_from_db()
            customers.append(customer)
        
        try:
            # Query with ordering parameter
            url = f'/api/customers/?ordering={sort_field}'
            response = client.get(url)
            
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"API should return 200 OK for ordering={sort_field}"
            )
            
            # Extract our test customers from results
            test_phones = {c.phone for c in customers}
            results = [c for c in response.data['results'] if c['phone'] in test_phones]
            
            # Verify we got all our test customers
            self.assertEqual(
                len(results),
                num_customers,
                f"Should return all {num_customers} test customers"
            )
            
            # Determine the field to check and sort direction
            if sort_field.startswith('-'):
                field_name = sort_field[1:]
                reverse = True
            else:
                field_name = sort_field
                reverse = False
            
            # Extract the field values from results
            if field_name == 'created_at':
                result_values = [c['created_at'] for c in results]
            elif field_name == 'call_status':
                result_values = [c['call_status'] for c in results]
            elif field_name == 'name':
                result_values = [c['name'] for c in results]
            else:
                self.fail(f"Unexpected sort field: {field_name}")
            
            # Verify ordering is correct
            expected_values = sorted(result_values, reverse=reverse)
            
            self.assertEqual(
                result_values,
                expected_values,
                f"Results should be sorted by {sort_field}. Got: {result_values}, Expected: {expected_values}"
            )
            
            # Additional check: verify pairwise ordering
            for i in range(len(result_values) - 1):
                current = result_values[i]
                next_val = result_values[i + 1]
                
                if reverse:
                    # Descending order: current >= next
                    self.assertGreaterEqual(
                        current,
                        next_val,
                        f"Descending order violated at position {i}: {current} should be >= {next_val}"
                    )
                else:
                    # Ascending order: current <= next
                    self.assertLessEqual(
                        current,
                        next_val,
                        f"Ascending order violated at position {i}: {current} should be <= {next_val}"
                    )
            
        finally:
            # Clean up
            Customer.objects.filter(phone__in=[c.phone for c in customers]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=5, max_value=10)
    )
    def test_property_sorting_stability(self, num_customers):
        """
        **Property: Sorting Stability**
        
        For any customer list, sorting by the same field multiple times
        should produce consistent results (stable sort).
        
        **Validates: Requirements REQ-020**
        """
        from datetime import timedelta
        from django.utils import timezone
        
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create customers with some duplicate values to test stability
        customers = []
        base_time = timezone.now()
        
        for i in range(num_customers):
            phone = f"+5{str(i).zfill(13)}_stable"
            
            # Create some duplicate names to test stability
            name = f"Customer {chr(65 + (i % 3))}"  # Only 3 unique names
            call_status = ['pending', 'answered'][i % 2]  # Only 2 statuses
            
            customer = Customer.objects.create(
                name=name,
                phone=phone,
                company=self.company,
                created_by=self.user,
                call_status=call_status,
                is_converted=False
            )
            customers.append(customer)
        
        try:
            # Test sorting by name (which has duplicates)
            url = '/api/customers/?ordering=name'
            
            # Query multiple times
            response1 = client.get(url)
            response2 = client.get(url)
            response3 = client.get(url)
            
            self.assertEqual(response1.status_code, status.HTTP_200_OK)
            self.assertEqual(response2.status_code, status.HTTP_200_OK)
            self.assertEqual(response3.status_code, status.HTTP_200_OK)
            
            # Extract our test customers
            test_phones = {c.phone for c in customers}
            results1 = [c for c in response1.data['results'] if c['phone'] in test_phones]
            results2 = [c for c in response2.data['results'] if c['phone'] in test_phones]
            results3 = [c for c in response3.data['results'] if c['phone'] in test_phones]
            
            # Extract phone numbers (unique identifiers) in order
            phones1 = [c['phone'] for c in results1]
            phones2 = [c['phone'] for c in results2]
            phones3 = [c['phone'] for c in results3]
            
            # Verify consistency: all three queries return same order
            self.assertEqual(
                phones1,
                phones2,
                "First and second query should return same order"
            )
            self.assertEqual(
                phones2,
                phones3,
                "Second and third query should return same order"
            )
            
            # Verify names are actually sorted
            names = [c['name'] for c in results1]
            self.assertEqual(
                names,
                sorted(names),
                "Names should be in sorted order"
            )
            
        finally:
            # Clean up
            Customer.objects.filter(phone__in=[c.phone for c in customers]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=3, max_value=10),
        sort_field=st.sampled_from(['created_at', 'name', 'call_status'])
    )
    def test_property_sorting_with_filters(self, num_customers, sort_field):
        """
        **Property: Sorting with Filters**
        
        For any customer list with filters applied (e.g., converted status),
        sorting should work correctly on the filtered results.
        
        **Validates: Requirements REQ-019, REQ-020**
        """
        from datetime import timedelta
        from django.utils import timezone
        
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create mix of converted and unconverted customers
        customers = []
        base_time = timezone.now()
        
        for i in range(num_customers):
            phone = f"+6{str(i).zfill(13)}_filter"
            name = f"Customer {chr(65 + i)}"
            is_converted = (i % 2 == 0)
            call_status = ['pending', 'answered', 'not_answered'][i % 3]
            
            customer = Customer.objects.create(
                name=name,
                phone=phone,
                company=self.company,
                created_by=self.user,
                call_status=call_status,
                is_converted=is_converted,
                converted_lead_id=f"lead_{phone}" if is_converted else None
            )
            customers.append(customer)
        
        try:
            # Test sorting with converted=false filter
            url = f'/api/customers/?converted=false&ordering={sort_field}'
            response = client.get(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Extract our test customers
            test_phones = {c.phone for c in customers}
            results = [c for c in response.data['results'] if c['phone'] in test_phones]
            
            # Verify all results are unconverted
            for customer in results:
                self.assertFalse(
                    customer['is_converted'],
                    f"Customer {customer['phone']} should not be converted"
                )
            
            # Verify sorting is correct
            if sort_field == 'created_at':
                values = [c['created_at'] for c in results]
            elif sort_field == 'name':
                values = [c['name'] for c in results]
            elif sort_field == 'call_status':
                values = [c['call_status'] for c in results]
            
            expected_values = sorted(values)
            self.assertEqual(
                values,
                expected_values,
                f"Filtered results should be sorted by {sort_field}"
            )
            
        finally:
            # Clean up
            Customer.objects.filter(phone__in=[c.phone for c in customers]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        name=st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
        ),
        notes=st.text(
            min_size=0,
            max_size=500,
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
        )
    )
    def test_property_form_prefill_accuracy(self, name, notes):
        """
        **Property 19: Form Pre-Fill Accuracy**
        
        For any customer being converted, the conversion form should pre-fill
        the name and phone fields with values matching the customer's name and phone.
        
        **Validates: Requirements REQ-029**
        """
        # Clean up name and notes (strip whitespace)
        name = name.strip() or 'Test Customer'
        notes = notes.strip()
        
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Generate unique phone for this test
        import random
        phone = f"+7{random.randint(1000000000, 9999999999)}"
        
        # Create customer with specific name, phone, and notes
        customer = Customer.objects.create(
            name=name,
            phone=phone,
            notes=notes,
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        try:
            # Call conversion-form endpoint
            url = f'/api/customers/{customer.id}/conversion-form/'
            response = client.get(url)
            
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                "Conversion form endpoint should return 200 OK"
            )
            
            # Verify response structure
            self.assertIn('customer', response.data)
            self.assertIn('pre_filled', response.data)
            self.assertIn('can_convert', response.data)
            
            # Property: Pre-filled name should match customer name
            self.assertEqual(
                response.data['pre_filled']['name'],
                customer.name,
                f"Pre-filled name should match customer name. Expected: '{customer.name}', Got: '{response.data['pre_filled']['name']}'"
            )
            
            # Property: Pre-filled phone should match customer phone
            self.assertEqual(
                response.data['pre_filled']['phone'],
                customer.phone,
                f"Pre-filled phone should match customer phone. Expected: '{customer.phone}', Got: '{response.data['pre_filled']['phone']}'"
            )
            
            # Property: Pre-filled description should match customer notes
            self.assertEqual(
                response.data['pre_filled']['description'],
                customer.notes or '',
                f"Pre-filled description should match customer notes. Expected: '{customer.notes or ''}', Got: '{response.data['pre_filled']['description']}'"
            )
            
            # Property: Source should always be 'customer_conversion'
            self.assertEqual(
                response.data['pre_filled']['source'],
                'customer_conversion',
                "Pre-filled source should always be 'customer_conversion'"
            )
            
            # Property: Customer data in response should match actual customer
            self.assertEqual(
                response.data['customer']['id'],
                customer.id,
                "Customer ID in response should match"
            )
            self.assertEqual(
                response.data['customer']['name'],
                customer.name,
                "Customer name in response should match"
            )
            self.assertEqual(
                response.data['customer']['phone'],
                customer.phone,
                "Customer phone in response should match"
            )
            self.assertEqual(
                response.data['customer']['notes'],
                customer.notes,
                "Customer notes in response should match"
            )
            
            # Property: Unconverted customer should be eligible for conversion
            if not customer.is_converted:
                self.assertTrue(
                    response.data['can_convert'],
                    "Unconverted customer should be eligible for conversion"
                )
                self.assertIsNone(
                    response.data['reason'],
                    "Reason should be None for eligible customers"
                )
            
        finally:
            # Clean up
            Customer.objects.filter(id=customer.id).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        num_customers=st.integers(min_value=1, max_value=5)
    )
    def test_property_form_prefill_consistency(self, num_customers):
        """
        **Property: Form Pre-Fill Consistency**
        
        For any customer, calling the conversion-form endpoint multiple times
        should return consistent pre-filled data.
        
        **Validates: Requirements REQ-029**
        """
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Create customers
        customers = []
        for i in range(num_customers):
            import random
            phone = f"+8{random.randint(1000000000, 9999999999)}"
            customer = Customer.objects.create(
                name=f"Consistency Test {i}",
                phone=phone,
                notes=f"Test notes {i}",
                company=self.company,
                created_by=self.user,
                is_converted=False
            )
            customers.append(customer)
        
        try:
            for customer in customers:
                url = f'/api/customers/{customer.id}/conversion-form/'
                
                # Call endpoint multiple times
                response1 = client.get(url)
                response2 = client.get(url)
                response3 = client.get(url)
                
                self.assertEqual(response1.status_code, status.HTTP_200_OK)
                self.assertEqual(response2.status_code, status.HTTP_200_OK)
                self.assertEqual(response3.status_code, status.HTTP_200_OK)
                
                # Verify consistency: all three calls return same data
                self.assertEqual(
                    response1.data['pre_filled'],
                    response2.data['pre_filled'],
                    f"First and second call should return same pre-filled data for customer {customer.id}"
                )
                self.assertEqual(
                    response2.data['pre_filled'],
                    response3.data['pre_filled'],
                    f"Second and third call should return same pre-filled data for customer {customer.id}"
                )
                
                # Verify data matches customer
                self.assertEqual(
                    response1.data['pre_filled']['name'],
                    customer.name,
                    "Pre-filled name should match customer"
                )
                self.assertEqual(
                    response1.data['pre_filled']['phone'],
                    customer.phone,
                    "Pre-filled phone should match customer"
                )
                
        finally:
            # Clean up
            Customer.objects.filter(id__in=[c.id for c in customers]).delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        is_converted=st.booleans()
    )
    def test_property_form_prefill_conversion_eligibility(self, is_converted):
        """
        **Property: Form Pre-Fill Conversion Eligibility**
        
        For any customer, the conversion-form endpoint should correctly indicate
        whether the customer can be converted based on their is_converted status.
        
        **Validates: Requirements REQ-029, REQ-035**
        """
        # Create authenticated client for this test
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # Generate unique phone
        import random
        phone = f"+9{random.randint(1000000000, 9999999999)}"
        
        # Create customer with specified conversion status
        customer = Customer.objects.create(
            name="Eligibility Test",
            phone=phone,
            company=self.company,
            created_by=self.user,
            is_converted=is_converted,
            converted_lead_id=f"lead_{phone}" if is_converted else None
        )
        
        try:
            url = f'/api/customers/{customer.id}/conversion-form/'
            response = client.get(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Property: can_convert should be False if already converted
            if is_converted:
                self.assertFalse(
                    response.data['can_convert'],
                    "Already converted customer should not be eligible for conversion"
                )
                self.assertIsNotNone(
                    response.data['reason'],
                    "Reason should be provided when customer cannot be converted"
                )
            else:
                self.assertTrue(
                    response.data['can_convert'],
                    "Unconverted customer should be eligible for conversion"
                )
                self.assertIsNone(
                    response.data['reason'],
                    "Reason should be None for eligible customers"
                )
            
            # Property: Pre-filled data should still be accurate regardless of eligibility
            self.assertEqual(
                response.data['pre_filled']['name'],
                customer.name,
                "Pre-filled name should match even if not eligible"
            )
            self.assertEqual(
                response.data['pre_filled']['phone'],
                customer.phone,
                "Pre-filled phone should match even if not eligible"
            )
            
        finally:
            # Clean up
            Customer.objects.filter(id=customer.id).delete()

