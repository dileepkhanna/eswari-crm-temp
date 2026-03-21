"""
Property-based tests for AnalyticsService

This test suite uses hypothesis to verify universal properties of the analytics logic
across a wide range of inputs, ensuring correctness beyond specific examples.

**Validates: Requirements REQ-053, REQ-059**
"""

from decimal import Decimal
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from customers.services import AnalyticsService
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
def valid_customer_names(draw):
    """
    Generate valid customer names (1-255 characters, no control characters)
    """
    return draw(st.text(
        min_size=1,
        max_size=255,
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ))


@st.composite
def customer_conversion_dataset(draw):
    """
    Generate a dataset of customers with some converted and some not converted
    
    Returns:
        Tuple of (total_count, converted_count) where converted_count <= total_count
    """
    total_count = draw(st.integers(min_value=0, max_value=100))
    
    if total_count == 0:
        converted_count = 0
    else:
        converted_count = draw(st.integers(min_value=0, max_value=total_count))
    
    return (total_count, converted_count)


class TestConversionRateCalculationProperties(TestCase):
    """
    Property-based tests for conversion rate calculation
    
    **Validates: Requirements REQ-053, REQ-059**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Analytics PBT',
            code='TEST_ANALYTICS_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_analytics_pbt',
            email='test_analytics_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_conversion_rate_calculation_formula(self, dataset):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers with some converted and some not converted,
        the conversion rate returned by the analytics service should equal
        (count of converted customers / total customers) * 100.
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        total_count, converted_count = dataset
        
        # Create customers with unique phone numbers
        customers = []
        for i in range(total_count):
            # Generate unique phone number
            phone = f"+1555{str(i).zfill(10)}"
            
            # Determine if this customer should be converted
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=is_converted,
                converted_lead_id=str(1000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Calculate conversion rate using the service
        result = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Calculate expected conversion rate
        if total_count > 0:
            expected_rate = (converted_count / total_count) * 100
        else:
            expected_rate = 0.0
        
        # Verify the calculation matches the formula
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}, got {result['total_customers']}"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Converted customers should be {converted_count}, got {result['converted_customers']}"
        )
        self.assertAlmostEqual(
            result['conversion_rate'],
            round(expected_rate, 2),
            places=2,
            msg=f"Conversion rate should be {round(expected_rate, 2)}%, got {result['conversion_rate']}%"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=1, max_value=50),
        converted_count=st.integers(min_value=0, max_value=50)
    )
    def test_property_conversion_rate_bounded(self, total_count, converted_count):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers, the conversion rate should always be
        between 0 and 100 (inclusive).
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+1666{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(2000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Get conversion rate
        result = AnalyticsService.get_conversion_rate(self.company.id)
        conversion_rate = result['conversion_rate']
        
        # Verify rate is bounded between 0 and 100
        self.assertGreaterEqual(
            conversion_rate,
            0.0,
            f"Conversion rate should be >= 0%, got {conversion_rate}%"
        )
        self.assertLessEqual(
            conversion_rate,
            100.0,
            f"Conversion rate should be <= 100%, got {conversion_rate}%"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_conversion_rate_all_converted(self, total_count):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers where all are converted,
        the conversion rate should be exactly 100%.
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        # Create customers - all converted
        customers = []
        for i in range(total_count):
            phone = f"+1777{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=True,
                converted_lead_id=str(3000 + i)
            )
            customers.append(customer)
        
        # Get conversion rate
        result = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Verify 100% conversion rate
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            total_count,
            f"All {total_count} customers should be converted"
        )
        self.assertAlmostEqual(
            result['conversion_rate'],
            100.0,
            places=2,
            msg=f"Conversion rate should be 100% when all customers are converted"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_conversion_rate_none_converted(self, total_count):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers where none are converted,
        the conversion rate should be exactly 0%.
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        # Create customers - none converted
        customers = []
        for i in range(total_count):
            phone = f"+1888{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=False,
                converted_lead_id=None
            )
            customers.append(customer)
        
        # Get conversion rate
        result = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Verify 0% conversion rate
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"No customers should be converted"
        )
        self.assertAlmostEqual(
            result['conversion_rate'],
            0.0,
            places=2,
            msg=f"Conversion rate should be 0% when no customers are converted"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    def test_property_conversion_rate_zero_customers(self):
        """
        **Property 39: Conversion Rate Calculation**
        
        For a company with zero customers, the conversion rate should be 0%
        (edge case: division by zero handling).
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        # Ensure no customers exist for this company
        Customer.objects.filter(company=self.company).delete()
        
        # Get conversion rate
        result = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Verify zero customers and 0% conversion rate
        self.assertEqual(
            result['total_customers'],
            0,
            f"Total customers should be 0"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"Converted customers should be 0"
        )
        self.assertAlmostEqual(
            result['conversion_rate'],
            0.0,
            places=2,
            msg=f"Conversion rate should be 0% when there are no customers"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_conversion_rate_idempotent(self, dataset):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers, calling get_conversion_rate multiple times
        should return the same result (idempotent reads).
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        total_count, converted_count = dataset
        
        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+1999{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(4000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Call get_conversion_rate multiple times
        result1 = AnalyticsService.get_conversion_rate(self.company.id)
        result2 = AnalyticsService.get_conversion_rate(self.company.id)
        result3 = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Verify all results are identical
        self.assertEqual(
            result1['total_customers'],
            result2['total_customers'],
            "Total customers should be consistent across calls"
        )
        self.assertEqual(
            result2['total_customers'],
            result3['total_customers'],
            "Total customers should be consistent across calls"
        )
        
        self.assertEqual(
            result1['converted_customers'],
            result2['converted_customers'],
            "Converted customers should be consistent across calls"
        )
        self.assertEqual(
            result2['converted_customers'],
            result3['converted_customers'],
            "Converted customers should be consistent across calls"
        )
        
        self.assertEqual(
            result1['conversion_rate'],
            result2['conversion_rate'],
            "Conversion rate should be consistent across calls"
        )
        self.assertEqual(
            result2['conversion_rate'],
            result3['conversion_rate'],
            "Conversion rate should be consistent across calls"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=10, max_value=50),
        converted_count=st.integers(min_value=1, max_value=50)
    )
    def test_property_conversion_rate_date_range_filtering(self, total_count, converted_count):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any set of customers with date range filtering,
        the conversion rate should only include customers created within that range.
        
        **Validates: Requirements REQ-053, REQ-059**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        # Create customers with different creation dates
        now = timezone.now()
        old_date = now - timedelta(days=60)
        recent_date = now - timedelta(days=15)
        
        old_customers = []
        recent_customers = []
        recent_converted_count = 0
        
        # Create old customers (outside date range)
        for i in range(total_count // 2):
            phone = f"+1111{str(i).zfill(10)}"
            customer = Customer.objects.create(
                phone=phone,
                name=f"Old Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=False
            )
            # Manually set created_at to old date
            Customer.objects.filter(id=customer.id).update(created_at=old_date)
            old_customers.append(customer)
        
        # Create recent customers (within date range)
        for i in range(total_count // 2):
            phone = f"+1222{str(i).zfill(10)}"
            is_converted = i < (converted_count // 2)
            if is_converted:
                recent_converted_count += 1
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Recent Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(5000 + i) if is_converted else None
            )
            # Manually set created_at to recent date
            Customer.objects.filter(id=customer.id).update(created_at=recent_date)
            recent_customers.append(customer)
        
        # Get conversion rate with date range (last 30 days)
        start_date = now - timedelta(days=30)
        result = AnalyticsService.get_conversion_rate(
            self.company.id,
            start_date=start_date,
            end_date=now
        )
        
        # Verify only recent customers are included
        self.assertEqual(
            result['total_customers'],
            len(recent_customers),
            f"Should only count recent customers within date range"
        )
        self.assertEqual(
            result['converted_customers'],
            recent_converted_count,
            f"Should only count recent converted customers"
        )
        
        # Verify conversion rate calculation
        if len(recent_customers) > 0:
            expected_rate = (recent_converted_count / len(recent_customers)) * 100
            self.assertAlmostEqual(
                result['conversion_rate'],
                round(expected_rate, 2),
                places=2,
                msg=f"Conversion rate should match filtered dataset"
            )
        
        # Verify period info is included
        self.assertIn('period', result)
        self.assertIsNotNone(result['period']['start'])
        self.assertIsNotNone(result['period']['end'])
        
        # Clean up
        for customer in old_customers + recent_customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=5, max_value=30),
        converted_count=st.integers(min_value=1, max_value=30)
    )
    def test_property_conversion_rate_company_isolation(self, total_count, converted_count):
        """
        **Property 39: Conversion Rate Calculation**
        
        For any company, the conversion rate should only include customers
        belonging to that company (company data isolation).
        
        **Validates: Requirements REQ-053, REQ-059, REQ-072**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        # Create a second company
        other_company = Company.objects.create(
            name='Other Company Analytics PBT',
            code='OTHER_ANALYTICS_PBT',
            is_active=True
        )
        
        # Create customers for our company
        our_customers = []
        for i in range(total_count):
            phone = f"+1333{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Our Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(6000 + i) if is_converted else None
            )
            our_customers.append(customer)
        
        # Create customers for other company (should not affect our rate)
        other_customers = []
        for i in range(total_count):
            phone = f"+1444{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Other Customer {i}",
                company=other_company,
                created_by=self.user,
                is_converted=True,  # All converted
                converted_lead_id=str(7000 + i)
            )
            other_customers.append(customer)
        
        # Get conversion rate for our company
        result = AnalyticsService.get_conversion_rate(self.company.id)
        
        # Verify only our company's customers are counted
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Should only count customers from our company"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Should only count converted customers from our company"
        )
        
        # Calculate expected rate for our company only
        expected_rate = (converted_count / total_count) * 100
        self.assertAlmostEqual(
            result['conversion_rate'],
            round(expected_rate, 2),
            places=2,
            msg=f"Conversion rate should only reflect our company's data"
        )
        
        # Clean up
        for customer in our_customers + other_customers:
            customer.delete()
        other_company.delete()



class TestConversionAggregationProperties(TestCase):
    """
    Property-based tests for conversion aggregation methods
    
    **Validates: Requirements REQ-055, REQ-056, REQ-057**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Aggregation PBT',
            code='TEST_AGG_PBT',
            is_active=True
        )
        
        # Create test users
        cls.user1 = User.objects.create_user(
            username='test_user_agg1_pbt',
            email='test_agg1_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
        cls.user2 = User.objects.create_user(
            username='test_user_agg2_pbt',
            email='test_agg2_pbt@example.com',
            password='testpass123',
            role='sales',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(
        user1_total=st.integers(min_value=1, max_value=30),
        user1_converted=st.integers(min_value=0, max_value=30),
        user2_total=st.integers(min_value=1, max_value=30),
        user2_converted=st.integers(min_value=0, max_value=30)
    )
    def test_property_conversion_by_user_aggregation(self, user1_total, user1_converted, user2_total, user2_converted):
        """
        **Property 41: Conversion by User Aggregation**
        
        For any set of customers created by different users,
        the aggregation by user should correctly group customers
        and calculate per-user conversion rates.
        
        **Validates: Requirements REQ-055, REQ-060**
        """
        # Ensure converted counts don't exceed totals
        if user1_converted > user1_total:
            user1_converted = user1_total
        if user2_converted > user2_total:
            user2_converted = user2_total
        
        # Create customers for user1
        user1_customers = []
        for i in range(user1_total):
            phone = f"+1500{str(i).zfill(10)}"
            is_converted = i < user1_converted
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"User1 Customer {i}",
                company=self.company,
                created_by=self.user1,
                assigned_to=self.user1,
                is_converted=is_converted,
                converted_lead_id=str(8000 + i) if is_converted else None
            )
            user1_customers.append(customer)
        
        # Create customers for user2
        user2_customers = []
        for i in range(user2_total):
            phone = f"+1600{str(i).zfill(10)}"
            is_converted = i < user2_converted
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"User2 Customer {i}",
                company=self.company,
                created_by=self.user2,
                assigned_to=self.user2,
                is_converted=is_converted,
                converted_lead_id=str(9000 + i) if is_converted else None
            )
            user2_customers.append(customer)
        
        # Get conversion by user
        results = AnalyticsService.get_conversion_by_user(self.company.id)
        
        # Verify we have results for both users
        self.assertEqual(
            len(results),
            2,
            f"Should have results for 2 users, got {len(results)}"
        )
        
        # Find results for each user
        user1_result = next((r for r in results if r['user_id'] == self.user1.id), None)
        user2_result = next((r for r in results if r['user_id'] == self.user2.id), None)
        
        self.assertIsNotNone(user1_result, "Should have result for user1")
        self.assertIsNotNone(user2_result, "Should have result for user2")
        
        # Verify user1 aggregation
        self.assertEqual(
            user1_result['total_customers'],
            user1_total,
            f"User1 should have {user1_total} total customers"
        )
        self.assertEqual(
            user1_result['converted'],
            user1_converted,
            f"User1 should have {user1_converted} converted customers"
        )
        
        # Verify user1 conversion rate
        expected_rate1 = (user1_converted / user1_total) * 100
        self.assertAlmostEqual(
            user1_result['conversion_rate'],
            round(expected_rate1, 2),
            places=2,
            msg=f"User1 conversion rate should be {round(expected_rate1, 2)}%"
        )
        
        # Verify user2 aggregation
        self.assertEqual(
            user2_result['total_customers'],
            user2_total,
            f"User2 should have {user2_total} total customers"
        )
        self.assertEqual(
            user2_result['converted'],
            user2_converted,
            f"User2 should have {user2_converted} converted customers"
        )
        
        # Verify user2 conversion rate
        expected_rate2 = (user2_converted / user2_total) * 100
        self.assertAlmostEqual(
            user2_result['conversion_rate'],
            round(expected_rate2, 2),
            places=2,
            msg=f"User2 conversion rate should be {round(expected_rate2, 2)}%"
        )
        
        # Verify user names are included
        self.assertIn('user_name', user1_result)
        self.assertIn('user_name', user2_result)
        
        # Clean up
        for customer in user1_customers + user2_customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=5, max_value=30),
        converted_count=st.integers(min_value=2, max_value=30)
    )
    def test_property_conversion_by_user_ordering(self, total_count, converted_count):
        """
        **Property 41: Conversion by User Aggregation**
        
        For any set of users with different conversion counts,
        the results should be ordered by conversion count descending
        (top converters first).
        
        **Validates: Requirements REQ-055, REQ-060**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        # Ensure user2 has strictly fewer conversions than user1
        user2_converted = max(0, converted_count - 1)
        
        # Create customers for user1 with higher conversion count
        user1_customers = []
        for i in range(total_count):
            phone = f"+1700{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"User1 Customer {i}",
                company=self.company,
                created_by=self.user1,
                is_converted=is_converted,
                converted_lead_id=str(10000 + i) if is_converted else None
            )
            user1_customers.append(customer)
        
        # Create customers for user2 with lower conversion count
        user2_customers = []
        for i in range(total_count):
            phone = f"+1800{str(i).zfill(10)}"
            is_converted = i < user2_converted
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"User2 Customer {i}",
                company=self.company,
                created_by=self.user2,
                is_converted=is_converted,
                converted_lead_id=str(11000 + i) if is_converted else None
            )
            user2_customers.append(customer)
        
        # Get conversion by user
        results = AnalyticsService.get_conversion_by_user(self.company.id)
        
        # Verify ordering (user1 should be first since they have more conversions)
        self.assertGreaterEqual(
            len(results),
            2,
            "Should have at least 2 users"
        )
        
        # Verify results are ordered by converted count descending
        for i in range(len(results) - 1):
            self.assertGreaterEqual(
                results[i]['converted'],
                results[i + 1]['converted'],
                f"Results should be ordered by conversion count descending"
            )
        
        # Verify user1 is first (has more conversions) only if they have different counts
        if converted_count > user2_converted:
            self.assertEqual(
                results[0]['user_id'],
                self.user1.id,
                "User with most conversions should be first"
            )
        
        # Clean up
        for customer in user1_customers + user2_customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        pending_total=st.integers(min_value=1, max_value=20),
        pending_converted=st.integers(min_value=0, max_value=20),
        answered_total=st.integers(min_value=1, max_value=20),
        answered_converted=st.integers(min_value=0, max_value=20)
    )
    def test_property_conversion_by_call_status_aggregation(self, pending_total, pending_converted, answered_total, answered_converted):
        """
        **Property 42: Conversion by Call Status Aggregation**
        
        For any set of customers with different call statuses,
        the aggregation by call status should correctly group customers
        and calculate per-status conversion rates.
        
        **Validates: Requirements REQ-056**
        """
        # Ensure converted counts don't exceed totals
        if pending_converted > pending_total:
            pending_converted = pending_total
        if answered_converted > answered_total:
            answered_converted = answered_total
        
        # Create customers with "pending" call status
        pending_customers = []
        for i in range(pending_total):
            phone = f"+1900{str(i).zfill(10)}"
            is_converted = i < pending_converted
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Pending Customer {i}",
                company=self.company,
                created_by=self.user1,
                call_status='pending',
                is_converted=is_converted,
                converted_lead_id=str(12000 + i) if is_converted else None
            )
            pending_customers.append(customer)
        
        # Create customers with "answered" call status
        answered_customers = []
        for i in range(answered_total):
            phone = f"+2000{str(i).zfill(10)}"
            is_converted = i < answered_converted
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Answered Customer {i}",
                company=self.company,
                created_by=self.user1,
                call_status='answered',
                is_converted=is_converted,
                converted_lead_id=str(13000 + i) if is_converted else None
            )
            answered_customers.append(customer)
        
        # Get conversion by call status
        results = AnalyticsService.get_conversion_by_call_status(self.company.id)
        
        # Verify we have results for both statuses
        self.assertGreaterEqual(
            len(results),
            2,
            f"Should have results for at least 2 call statuses"
        )
        
        # Find results for each status
        pending_result = next((r for r in results if r['call_status'] == 'pending'), None)
        answered_result = next((r for r in results if r['call_status'] == 'answered'), None)
        
        self.assertIsNotNone(pending_result, "Should have result for pending status")
        self.assertIsNotNone(answered_result, "Should have result for answered status")
        
        # Verify pending aggregation
        self.assertEqual(
            pending_result['total_customers'],
            pending_total,
            f"Pending status should have {pending_total} total customers"
        )
        self.assertEqual(
            pending_result['converted'],
            pending_converted,
            f"Pending status should have {pending_converted} converted customers"
        )
        
        # Verify pending conversion rate
        expected_rate_pending = (pending_converted / pending_total) * 100
        self.assertAlmostEqual(
            pending_result['conversion_rate'],
            round(expected_rate_pending, 2),
            places=2,
            msg=f"Pending conversion rate should be {round(expected_rate_pending, 2)}%"
        )
        
        # Verify answered aggregation
        self.assertEqual(
            answered_result['total_customers'],
            answered_total,
            f"Answered status should have {answered_total} total customers"
        )
        self.assertEqual(
            answered_result['converted'],
            answered_converted,
            f"Answered status should have {answered_converted} converted customers"
        )
        
        # Verify answered conversion rate
        expected_rate_answered = (answered_converted / answered_total) * 100
        self.assertAlmostEqual(
            answered_result['conversion_rate'],
            round(expected_rate_answered, 2),
            places=2,
            msg=f"Answered conversion rate should be {round(expected_rate_answered, 2)}%"
        )
        
        # Clean up
        for customer in pending_customers + answered_customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        days_back=st.integers(min_value=1, max_value=10),
        conversions_per_day=st.integers(min_value=0, max_value=5)
    )
    def test_property_conversion_trend_aggregation(self, days_back, conversions_per_day):
        """
        **Property 43: Conversion Trend Aggregation**
        
        For any set of conversions over time, the trend aggregation
        should correctly count conversions per day and include all dates
        in the range (even dates with zero conversions).
        
        **Validates: Requirements REQ-057**
        """
        from leads.models import Lead
        
        # Create conversions spread over multiple days
        now = timezone.now()
        customers = []
        leads = []
        expected_counts = {}
        
        for day_offset in range(days_back):
            conversion_date = now - timedelta(days=day_offset)
            date_key = conversion_date.date().isoformat()
            expected_counts[date_key] = conversions_per_day
            
            for i in range(conversions_per_day):
                phone = f"+2100{day_offset:03d}{i:07d}"
                
                # Create customer
                customer = Customer.objects.create(
                    phone=phone,
                    name=f"Customer Day{day_offset} #{i}",
                    company=self.company,
                    created_by=self.user1,
                    is_converted=True,
                    converted_lead_id=None  # Will be set after lead creation
                )
                
                # Create lead with specific creation date
                lead = Lead.objects.create(
                    name=customer.name,
                    phone=customer.phone,
                    company=self.company,
                    created_by=self.user1,
                    source='customer_conversion'
                )
                
                # Update lead created_at to match the conversion date
                Lead.objects.filter(id=lead.id).update(created_at=conversion_date)
                
                # Update customer with lead reference
                customer.converted_lead_id = str(lead.id)
                customer.save()
                
                customers.append(customer)
                leads.append(lead)
        
        # Get conversion trend
        results = AnalyticsService.get_conversion_trend(
            self.company.id,
            days=days_back
        )
        
        # Verify we have results for all days (including today)
        self.assertGreaterEqual(
            len(results),
            days_back,
            f"Should have at least {days_back} days in trend"
        )
        
        # Verify each date has correct conversion count
        for result in results:
            date_key = result['date']
            conversions = result['conversions']
            
            # Check if this date is in our expected counts
            if date_key in expected_counts:
                self.assertEqual(
                    conversions,
                    expected_counts[date_key],
                    f"Date {date_key} should have {expected_counts[date_key]} conversions, got {conversions}"
                )
        
        # Verify dates are in chronological order
        dates = [result['date'] for result in results]
        sorted_dates = sorted(dates)
        self.assertEqual(
            dates,
            sorted_dates,
            "Trend dates should be in chronological order"
        )
        
        # Clean up
        for lead in leads:
            lead.delete()
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(days=st.integers(min_value=1, max_value=30))
    def test_property_conversion_trend_includes_zero_days(self, days):
        """
        **Property 43: Conversion Trend Aggregation**
        
        For any date range, the trend should include all dates
        even if there are zero conversions on some days.
        
        **Validates: Requirements REQ-057**
        """
        # Don't create any conversions - all days should have zero
        
        # Get conversion trend
        results = AnalyticsService.get_conversion_trend(
            self.company.id,
            days=days
        )
        
        # Verify we have results for all days (days + 1 to include today)
        self.assertGreaterEqual(
            len(results),
            days,
            f"Should have at least {days} days in trend"
        )
        
        # Verify all days have zero conversions
        for result in results:
            self.assertEqual(
                result['conversions'],
                0,
                f"Date {result['date']} should have 0 conversions when no data exists"
            )
        
        # Verify all results have required fields
        for result in results:
            self.assertIn('date', result)
            self.assertIn('conversions', result)
            self.assertIsInstance(result['date'], str)
            self.assertIsInstance(result['conversions'], int)
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=5, max_value=20),
        converted_count=st.integers(min_value=1, max_value=20)
    )
    def test_property_conversion_aggregations_sum_to_total(self, total_count, converted_count):
        """
        **Property 41, 42: Aggregation Consistency**
        
        For any aggregation (by user or by call status),
        the sum of all group totals should equal the overall total,
        and the sum of all group conversions should equal overall conversions.
        
        **Validates: Requirements REQ-055, REQ-056**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        # Create customers with mixed users and call statuses
        customers = []
        for i in range(total_count):
            phone = f"+2200{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            # Alternate between users and call statuses
            created_by = self.user1 if i % 2 == 0 else self.user2
            call_status = 'pending' if i % 3 == 0 else 'answered'
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=created_by,
                call_status=call_status,
                is_converted=is_converted,
                converted_lead_id=str(14000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Get aggregations
        by_user = AnalyticsService.get_conversion_by_user(self.company.id)
        by_status = AnalyticsService.get_conversion_by_call_status(self.company.id)
        
        # Verify by_user aggregation sums
        user_total_sum = sum(r['total_customers'] for r in by_user)
        user_converted_sum = sum(r['converted'] for r in by_user)
        
        self.assertEqual(
            user_total_sum,
            total_count,
            f"Sum of user totals should equal overall total"
        )
        self.assertEqual(
            user_converted_sum,
            converted_count,
            f"Sum of user conversions should equal overall conversions"
        )
        
        # Verify by_status aggregation sums
        status_total_sum = sum(r['total_customers'] for r in by_status)
        status_converted_sum = sum(r['converted'] for r in by_status)
        
        self.assertEqual(
            status_total_sum,
            total_count,
            f"Sum of status totals should equal overall total"
        )
        self.assertEqual(
            status_converted_sum,
            converted_count,
            f"Sum of status conversions should equal overall conversions"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()



class TestPendingConversionsCountProperties(TestCase):
    """
    Property-based tests for pending conversions count

    **Validates: Requirements REQ-058**
    """

    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Pending PBT',
            code='TEST_PENDING_PBT',
            is_active=True
        )

        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_pending_pbt',
            email='test_pending_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )

    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_pending_conversions_count_formula(self, dataset):
        """
        **Property 44: Pending Conversions Count**

        For any company, the "Pending Conversions" count should equal
        the number of customers with is_converted=false.

        **Validates: Requirements REQ-058**
        """
        total_count, converted_count = dataset
        pending_count = total_count - converted_count

        # Create customers with unique phone numbers
        customers = []
        for i in range(total_count):
            # Generate unique phone number
            phone = f"+3000{str(i).zfill(10)}"

            # Determine if this customer should be converted
            is_converted = i < converted_count

            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=is_converted,
                converted_lead_id=str(20000 + i) if is_converted else None
            )
            customers.append(customer)

        # Get pending conversions count using the service
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify the count matches the formula
        self.assertEqual(
            result['pending_conversions'],
            pending_count,
            f"Pending conversions should be {pending_count}, got {result['pending_conversions']}"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}, got {result['total_customers']}"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Converted customers should be {converted_count}, got {result['converted_customers']}"
        )

        # Clean up
        for customer in customers:
            customer.delete()

    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_pending_conversions_all_pending(self, total_count):
        """
        **Property 44: Pending Conversions Count**

        For any set of customers where none are converted,
        the pending conversions count should equal total customers.

        **Validates: Requirements REQ-058**
        """
        # Create customers - none converted
        customers = []
        for i in range(total_count):
            phone = f"+3100{str(i).zfill(10)}"

            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=False,
                converted_lead_id=None
            )
            customers.append(customer)

        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify all customers are pending
        self.assertEqual(
            result['pending_conversions'],
            total_count,
            f"All {total_count} customers should be pending"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"No customers should be converted"
        )

        # Clean up
        for customer in customers:
            customer.delete()

    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_pending_conversions_none_pending(self, total_count):
        """
        **Property 44: Pending Conversions Count**

        For any set of customers where all are converted,
        the pending conversions count should be zero.

        **Validates: Requirements REQ-058**
        """
        # Create customers - all converted
        customers = []
        for i in range(total_count):
            phone = f"+3200{str(i).zfill(10)}"

            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=True,
                converted_lead_id=str(21000 + i)
            )
            customers.append(customer)

        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify no customers are pending
        self.assertEqual(
            result['pending_conversions'],
            0,
            f"No customers should be pending when all are converted"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            total_count,
            f"All {total_count} customers should be converted"
        )

        # Clean up
        for customer in customers:
            customer.delete()

    @settings(max_examples=10, deadline=None)
    def test_property_pending_conversions_zero_customers(self):
        """
        **Property 44: Pending Conversions Count**

        For a company with zero customers, the pending conversions count
        should be zero.

        **Validates: Requirements REQ-058**
        """
        # Ensure no customers exist for this company
        Customer.objects.filter(company=self.company).delete()

        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify zero customers and zero pending
        self.assertEqual(
            result['pending_conversions'],
            0,
            f"Pending conversions should be 0 when there are no customers"
        )
        self.assertEqual(
            result['total_customers'],
            0,
            f"Total customers should be 0"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"Converted customers should be 0"
        )

    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_pending_conversions_idempotent(self, dataset):
        """
        **Property 44: Pending Conversions Count**

        For any set of customers, calling get_pending_conversions_count
        multiple times should return the same result (idempotent reads).

        **Validates: Requirements REQ-058**
        """
        total_count, converted_count = dataset

        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+3300{str(i).zfill(10)}"
            is_converted = i < converted_count

            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(22000 + i) if is_converted else None
            )
            customers.append(customer)

        # Call get_pending_conversions_count multiple times
        result1 = AnalyticsService.get_pending_conversions_count(self.company.id)
        result2 = AnalyticsService.get_pending_conversions_count(self.company.id)
        result3 = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify all results are identical
        self.assertEqual(
            result1['pending_conversions'],
            result2['pending_conversions'],
            "Pending conversions should be consistent across calls"
        )
        self.assertEqual(
            result2['pending_conversions'],
            result3['pending_conversions'],
            "Pending conversions should be consistent across calls"
        )

        self.assertEqual(
            result1['total_customers'],
            result2['total_customers'],
            "Total customers should be consistent across calls"
        )
        self.assertEqual(
            result2['total_customers'],
            result3['total_customers'],
            "Total customers should be consistent across calls"
        )

        self.assertEqual(
            result1['converted_customers'],
            result2['converted_customers'],
            "Converted customers should be consistent across calls"
        )
        self.assertEqual(
            result2['converted_customers'],
            result3['converted_customers'],
            "Converted customers should be consistent across calls"
        )

        # Clean up
        for customer in customers:
            customer.delete()

    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=5, max_value=30),
        converted_count=st.integers(min_value=1, max_value=30)
    )
    def test_property_pending_conversions_company_isolation(self, total_count, converted_count):
        """
        **Property 44: Pending Conversions Count**

        For any company, the pending conversions count should only include
        customers belonging to that company (company data isolation).

        **Validates: Requirements REQ-058, REQ-072**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count

        pending_count = total_count - converted_count

        # Create a second company
        other_company = Company.objects.create(
            name='Other Company Pending PBT',
            code='OTHER_PENDING_PBT',
            is_active=True
        )

        # Create customers for our company
        our_customers = []
        for i in range(total_count):
            phone = f"+3400{str(i).zfill(10)}"
            is_converted = i < converted_count

            customer = Customer.objects.create(
                phone=phone,
                name=f"Our Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(23000 + i) if is_converted else None
            )
            our_customers.append(customer)

        # Create customers for other company (should not affect our count)
        other_customers = []
        for i in range(total_count):
            phone = f"+3500{str(i).zfill(10)}"

            customer = Customer.objects.create(
                phone=phone,
                name=f"Other Customer {i}",
                company=other_company,
                created_by=self.user,
                is_converted=False,  # All pending
                converted_lead_id=None
            )
            other_customers.append(customer)

        # Get pending conversions count for our company
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify only our company's customers are counted
        self.assertEqual(
            result['pending_conversions'],
            pending_count,
            f"Should only count pending customers from our company"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Should only count total customers from our company"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Should only count converted customers from our company"
        )

        # Clean up
        for customer in our_customers + other_customers:
            customer.delete()
        other_company.delete()

    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=2, max_value=20),
        converted_count=st.integers(min_value=1, max_value=19)
    )
    def test_property_pending_conversions_sum_invariant(self, total_count, converted_count):
        """
        **Property 44: Pending Conversions Count**

        For any company, pending_conversions + converted_customers
        should always equal total_customers (sum invariant).

        **Validates: Requirements REQ-058**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count >= total_count:
            converted_count = total_count - 1

        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+3600{str(i).zfill(10)}"
            is_converted = i < converted_count

            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(24000 + i) if is_converted else None
            )
            customers.append(customer)

        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)

        # Verify sum invariant
        sum_check = result['pending_conversions'] + result['converted_customers']
        self.assertEqual(
            sum_check,
            result['total_customers'],
            f"pending_conversions ({result['pending_conversions']}) + "
            f"converted_customers ({result['converted_customers']}) should equal "
            f"total_customers ({result['total_customers']})"
        )

        # Also verify the actual values
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Converted customers should be {converted_count}"
        )
        self.assertEqual(
            result['pending_conversions'],
            total_count - converted_count,
            f"Pending conversions should be {total_count - converted_count}"
        )

        # Clean up
        for customer in customers:
            customer.delete()




class TestPendingConversionsCountProperties(TestCase):
    """
    Property-based tests for pending conversions count
    
    **Validates: Requirements REQ-058**
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test data once for all property tests"""
        super().setUpClass()
        # Create a test company
        cls.company = Company.objects.create(
            name='Test Company Pending PBT',
            code='TEST_PENDING_PBT',
            is_active=True
        )
        
        # Create a test user
        cls.user = User.objects.create_user(
            username='test_user_pending_pbt',
            email='test_pending_pbt@example.com',
            password='testpass123',
            role='admin',
            company=cls.company
        )
    
    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_pending_conversions_count_formula(self, dataset):
        """
        **Property 44: Pending Conversions Count**
        
        For any company, the "Pending Conversions" count should equal
        the number of customers with is_converted=false.
        
        **Validates: Requirements REQ-058**
        """
        total_count, converted_count = dataset
        pending_count = total_count - converted_count
        
        # Create customers with unique phone numbers
        customers = []
        for i in range(total_count):
            # Generate unique phone number
            phone = f"+3000{str(i).zfill(10)}"
            
            # Determine if this customer should be converted
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user,
                is_converted=is_converted,
                converted_lead_id=str(20000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Get pending conversions count using the service
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify the count matches the formula
        self.assertEqual(
            result['pending_conversions'],
            pending_count,
            f"Pending conversions should be {pending_count}, got {result['pending_conversions']}"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}, got {result['total_customers']}"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Converted customers should be {converted_count}, got {result['converted_customers']}"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_pending_conversions_all_pending(self, total_count):
        """
        **Property 44: Pending Conversions Count**
        
        For any set of customers where none are converted,
        the pending conversions count should equal total customers.
        
        **Validates: Requirements REQ-058**
        """
        # Create customers - none converted
        customers = []
        for i in range(total_count):
            phone = f"+3100{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=False,
                converted_lead_id=None
            )
            customers.append(customer)
        
        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify all customers are pending
        self.assertEqual(
            result['pending_conversions'],
            total_count,
            f"All {total_count} customers should be pending"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"No customers should be converted"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(total_count=st.integers(min_value=1, max_value=50))
    def test_property_pending_conversions_none_pending(self, total_count):
        """
        **Property 44: Pending Conversions Count**
        
        For any set of customers where all are converted,
        the pending conversions count should be zero.
        
        **Validates: Requirements REQ-058**
        """
        # Create customers - all converted
        customers = []
        for i in range(total_count):
            phone = f"+3200{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=True,
                converted_lead_id=str(21000 + i)
            )
            customers.append(customer)
        
        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify no customers are pending
        self.assertEqual(
            result['pending_conversions'],
            0,
            f"No customers should be pending when all are converted"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            total_count,
            f"All {total_count} customers should be converted"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    def test_property_pending_conversions_zero_customers(self):
        """
        **Property 44: Pending Conversions Count**
        
        For a company with zero customers, the pending conversions count
        should be zero.
        
        **Validates: Requirements REQ-058**
        """
        # Ensure no customers exist for this company
        Customer.objects.filter(company=self.company).delete()
        
        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify zero customers and zero pending
        self.assertEqual(
            result['pending_conversions'],
            0,
            f"Pending conversions should be 0 when there are no customers"
        )
        self.assertEqual(
            result['total_customers'],
            0,
            f"Total customers should be 0"
        )
        self.assertEqual(
            result['converted_customers'],
            0,
            f"Converted customers should be 0"
        )
    
    @settings(max_examples=10, deadline=None)
    @given(dataset=customer_conversion_dataset())
    def test_property_pending_conversions_idempotent(self, dataset):
        """
        **Property 44: Pending Conversions Count**
        
        For any set of customers, calling get_pending_conversions_count
        multiple times should return the same result (idempotent reads).
        
        **Validates: Requirements REQ-058**
        """
        total_count, converted_count = dataset
        
        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+3300{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(22000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Call get_pending_conversions_count multiple times
        result1 = AnalyticsService.get_pending_conversions_count(self.company.id)
        result2 = AnalyticsService.get_pending_conversions_count(self.company.id)
        result3 = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify all results are identical
        self.assertEqual(
            result1['pending_conversions'],
            result2['pending_conversions'],
            "Pending conversions should be consistent across calls"
        )
        self.assertEqual(
            result2['pending_conversions'],
            result3['pending_conversions'],
            "Pending conversions should be consistent across calls"
        )
        
        self.assertEqual(
            result1['total_customers'],
            result2['total_customers'],
            "Total customers should be consistent across calls"
        )
        self.assertEqual(
            result2['total_customers'],
            result3['total_customers'],
            "Total customers should be consistent across calls"
        )
        
        self.assertEqual(
            result1['converted_customers'],
            result2['converted_customers'],
            "Converted customers should be consistent across calls"
        )
        self.assertEqual(
            result2['converted_customers'],
            result3['converted_customers'],
            "Converted customers should be consistent across calls"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=5, max_value=30),
        converted_count=st.integers(min_value=1, max_value=30)
    )
    def test_property_pending_conversions_company_isolation(self, total_count, converted_count):
        """
        **Property 44: Pending Conversions Count**
        
        For any company, the pending conversions count should only include
        customers belonging to that company (company data isolation).
        
        **Validates: Requirements REQ-058, REQ-072**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count > total_count:
            converted_count = total_count
        
        pending_count = total_count - converted_count
        
        # Create a second company
        other_company = Company.objects.create(
            name='Other Company Pending PBT',
            code='OTHER_PENDING_PBT',
            is_active=True
        )
        
        # Create customers for our company
        our_customers = []
        for i in range(total_count):
            phone = f"+3400{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Our Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(23000 + i) if is_converted else None
            )
            our_customers.append(customer)
        
        # Create customers for other company (should not affect our count)
        other_customers = []
        for i in range(total_count):
            phone = f"+3500{str(i).zfill(10)}"
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Other Customer {i}",
                company=other_company,
                created_by=self.user,
                is_converted=False,  # All pending
                converted_lead_id=None
            )
            other_customers.append(customer)
        
        # Get pending conversions count for our company
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify only our company's customers are counted
        self.assertEqual(
            result['pending_conversions'],
            pending_count,
            f"Should only count pending customers from our company"
        )
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Should only count total customers from our company"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Should only count converted customers from our company"
        )
        
        # Clean up
        for customer in our_customers + other_customers:
            customer.delete()
        other_company.delete()
    
    @settings(max_examples=10, deadline=None)
    @given(
        total_count=st.integers(min_value=2, max_value=20),
        converted_count=st.integers(min_value=1, max_value=19)
    )
    def test_property_pending_conversions_sum_invariant(self, total_count, converted_count):
        """
        **Property 44: Pending Conversions Count**
        
        For any company, pending_conversions + converted_customers
        should always equal total_customers (sum invariant).
        
        **Validates: Requirements REQ-058**
        """
        # Ensure converted_count doesn't exceed total_count
        if converted_count >= total_count:
            converted_count = total_count - 1
        
        # Create customers
        customers = []
        for i in range(total_count):
            phone = f"+3600{str(i).zfill(10)}"
            is_converted = i < converted_count
            
            customer = Customer.objects.create(
                phone=phone,
                name=f"Customer {i}",
                company=self.company,
                created_by=self.user,
                is_converted=is_converted,
                converted_lead_id=str(24000 + i) if is_converted else None
            )
            customers.append(customer)
        
        # Get pending conversions count
        result = AnalyticsService.get_pending_conversions_count(self.company.id)
        
        # Verify sum invariant
        sum_check = result['pending_conversions'] + result['converted_customers']
        self.assertEqual(
            sum_check,
            result['total_customers'],
            f"pending_conversions ({result['pending_conversions']}) + "
            f"converted_customers ({result['converted_customers']}) should equal "
            f"total_customers ({result['total_customers']})"
        )
        
        # Also verify the actual values
        self.assertEqual(
            result['total_customers'],
            total_count,
            f"Total customers should be {total_count}"
        )
        self.assertEqual(
            result['converted_customers'],
            converted_count,
            f"Converted customers should be {converted_count}"
        )
        self.assertEqual(
            result['pending_conversions'],
            total_count - converted_count,
            f"Pending conversions should be {total_count - converted_count}"
        )
        
        # Clean up
        for customer in customers:
            customer.delete()
