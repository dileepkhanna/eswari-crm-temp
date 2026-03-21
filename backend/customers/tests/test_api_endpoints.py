"""
Unit tests for Customer Management API Endpoints
Tests for Task 9: Customer management API endpoints with filtering and pagination
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from customers.models import Customer
from leads.models import Lead
from accounts.models import Company

User = get_user_model()


class TestCustomerListEndpoint(TestCase):
    """Tests for GET /api/customers/ endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST",
            is_active=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
    
    def test_list_customers_with_pagination(self):
        """Test customer list returns paginated results"""
        # Create 60 customers
        for i in range(60):
            Customer.objects.create(
                name=f"Customer {i}",
                phone=f"123456789{i:02d}",
                company=self.company,
                created_by=self.user
            )
        
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 60)
        self.assertEqual(len(response.data['results']), 50)  # Default page size
    
    def test_list_customers_with_custom_page_size(self):
        """Test customer list with custom page_size parameter"""
        # Create 30 customers
        for i in range(30):
            Customer.objects.create(
                name=f"Customer {i}",
                phone=f"123456789{i:02d}",
                company=self.company,
                created_by=self.user
            )
        
        response = self.client.get('/api/customers/?page_size=10')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 10)
    
    def test_filter_by_converted_true(self):
        """Test filtering customers by converted=true"""
        # Create converted and unconverted customers
        Customer.objects.create(
            name="Converted Customer",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        Customer.objects.create(
            name="Unconverted Customer",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        response = self.client.get('/api/customers/?converted=true')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertTrue(response.data['results'][0]['is_converted'])
    
    def test_filter_by_converted_false(self):
        """Test filtering customers by converted=false"""
        # Create converted and unconverted customers
        Customer.objects.create(
            name="Converted Customer",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        Customer.objects.create(
            name="Unconverted Customer",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        response = self.client.get('/api/customers/?converted=false')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertFalse(response.data['results'][0]['is_converted'])
    
    def test_filter_by_converted_all(self):
        """Test filtering customers by converted=all returns all customers"""
        # Create converted and unconverted customers
        Customer.objects.create(
            name="Converted Customer",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        Customer.objects.create(
            name="Unconverted Customer",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        response = self.client.get('/api/customers/?converted=all')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_filter_by_call_status(self):
        """Test filtering customers by call_status"""
        Customer.objects.create(
            name="Pending Customer",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            call_status="pending"
        )
        Customer.objects.create(
            name="Answered Customer",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            call_status="answered"
        )
        
        response = self.client.get('/api/customers/?call_status=pending')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['call_status'], 'pending')
    
    def test_search_by_name(self):
        """Test searching customers by name"""
        Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user
        )
        Customer.objects.create(
            name="Jane Smith",
            phone="1234567891",
            company=self.company,
            created_by=self.user
        )
        
        response = self.client.get('/api/customers/?search=John')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('John', response.data['results'][0]['name'])
    
    def test_search_by_phone(self):
        """Test searching customers by phone"""
        Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user
        )
        Customer.objects.create(
            name="Jane Smith",
            phone="9876543210",
            company=self.company,
            created_by=self.user
        )
        
        response = self.client.get('/api/customers/?search=987654')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('9876543210', response.data['results'][0]['phone'])
    
    def test_combined_filters(self):
        """Test combining multiple filters"""
        Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=False,
            call_status="pending"
        )
        Customer.objects.create(
            name="Jane Smith",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            is_converted=False,
            call_status="answered"
        )
        
        response = self.client.get(
            '/api/customers/?converted=false&call_status=pending&search=John'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'John Doe')
    
    def test_list_includes_conversion_fields(self):
        """Test that customer list includes is_converted and converted_lead_id fields"""
        Customer.objects.create(
            name="Test Customer",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        
        response = self.client.get('/api/customers/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_converted', response.data['results'][0])
        self.assertIn('converted_lead_id', response.data['results'][0])
        self.assertTrue(response.data['results'][0]['is_converted'])
        self.assertEqual(response.data['results'][0]['converted_lead_id'], '123')


class TestCustomerDetailEndpoint(TestCase):
    """Tests for GET /api/customers/{id}/ endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST",
            is_active=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
    
    def test_retrieve_customer_basic_fields(self):
        """Test retrieving customer returns all basic fields"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            call_status="pending",
            notes="Test notes"
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], customer.id)
        self.assertEqual(response.data['name'], 'John Doe')
        self.assertEqual(response.data['phone'], '1234567890')
        self.assertEqual(response.data['call_status'], 'pending')
        self.assertEqual(response.data['notes'], 'Test notes')
    
    def test_retrieve_unconverted_customer_no_lead(self):
        """Test retrieving unconverted customer has no converted_lead object"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_converted'])
        self.assertIsNone(response.data['converted_lead'])
    
    def test_retrieve_converted_customer_includes_lead(self):
        """Test retrieving converted customer includes converted_lead object"""
        # Create a lead first
        lead = Lead.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            requirement_type="apartment",
            bhk_requirement="3",
            budget_min=5000000,
            budget_max=7000000,
            preferred_location="Downtown",
            status="hot",
            source="customer_conversion"
        )
        
        # Create converted customer
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id=str(lead.id)
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_converted'])
        self.assertIsNotNone(response.data['converted_lead'])
        self.assertEqual(response.data['converted_lead']['id'], lead.id)
        self.assertEqual(response.data['converted_lead']['name'], 'John Doe')
        self.assertEqual(response.data['converted_lead']['status'], 'hot')
        self.assertEqual(response.data['converted_lead']['requirement_type'], 'apartment')
    
    def test_retrieve_converted_customer_lead_not_found(self):
        """Test retrieving converted customer with invalid lead_id returns None for converted_lead"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="99999"  # Non-existent lead
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_converted'])
        self.assertIsNone(response.data['converted_lead'])
    
    def test_customer_not_found(self):
        """Test retrieving non-existent customer returns 404"""
        response = self.client.get('/api/customers/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)



class TestConversionFormEndpoint(TestCase):
    """Tests for GET /api/customers/{id}/conversion-form/ endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST",
            is_active=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
    
    def test_conversion_form_returns_pre_filled_data(self):
        """Test conversion form endpoint returns pre-filled data from customer"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            notes="Interested in 3BHK apartment"
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/conversion-form/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('customer', response.data)
        self.assertIn('pre_filled', response.data)
        self.assertIn('can_convert', response.data)
        
        # Check customer data
        self.assertEqual(response.data['customer']['id'], customer.id)
        self.assertEqual(response.data['customer']['name'], 'John Doe')
        self.assertEqual(response.data['customer']['phone'], '1234567890')
        
        # Check pre-filled data
        self.assertEqual(response.data['pre_filled']['name'], 'John Doe')
        self.assertEqual(response.data['pre_filled']['phone'], '1234567890')
        self.assertEqual(response.data['pre_filled']['description'], 'Interested in 3BHK apartment')
        self.assertEqual(response.data['pre_filled']['source'], 'customer_conversion')
    
    def test_conversion_form_can_convert_true_for_unconverted(self):
        """Test conversion form shows can_convert=true for unconverted customer"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=False
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/conversion-form/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_convert'])
        self.assertIsNone(response.data['reason'])
    
    def test_conversion_form_can_convert_false_for_converted(self):
        """Test conversion form shows can_convert=false for already converted customer"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        
        response = self.client.get(f'/api/customers/{customer.id}/conversion-form/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_convert'])
        self.assertIsNotNone(response.data['reason'])
        self.assertIn('converted', response.data['reason'].lower())


class TestConvertToLeadEndpoint(TestCase):
    """Tests for POST /api/customers/{id}/convert-to-lead/ endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST",
            is_active=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
    
    def test_convert_customer_to_lead_success(self):
        """Test successful customer to lead conversion"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            notes="Interested in 3BHK"
        )
        
        lead_data = {
            'email': 'john@example.com',
            'address': '123 Main St',
            'requirement_type': 'apartment',
            'bhk_requirement': '3',
            'budget_min': 5000000,
            'budget_max': 7000000,
            'preferred_location': 'Downtown',
            'status': 'hot'
        }
        
        response = self.client.post(
            f'/api/customers/{customer.id}/convert-to-lead/',
            data=lead_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('lead', response.data)
        self.assertIn('customer', response.data)
        
        # Verify lead data
        lead = response.data['lead']
        self.assertEqual(lead['name'], 'John Doe')
        self.assertEqual(lead['phone'], '1234567890')
        self.assertEqual(lead['email'], 'john@example.com')
        self.assertEqual(lead['requirement_type'], 'apartment')
        self.assertEqual(lead['bhk_requirement'], '3')
        self.assertEqual(lead['status'], 'hot')
        self.assertEqual(lead['source'], 'customer_conversion')
        
        # Verify customer is marked as converted
        customer_data = response.data['customer']
        self.assertTrue(customer_data['is_converted'])
        self.assertIsNotNone(customer_data['converted_lead_id'])
    
    def test_convert_already_converted_customer_fails(self):
        """Test converting already converted customer returns error"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        
        lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '3',
            'budget_min': 5000000,
            'budget_max': 7000000,
            'preferred_location': 'Downtown',
            'status': 'hot'
        }
        
        response = self.client.post(
            f'/api/customers/{customer.id}/convert-to-lead/',
            data=lead_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'validation_error')
    
    def test_convert_with_invalid_budget_range_fails(self):
        """Test conversion with budget_min > budget_max fails"""
        customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user
        )
        
        lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '3',
            'budget_min': 7000000,  # Greater than max
            'budget_max': 5000000,
            'preferred_location': 'Downtown',
            'status': 'hot'
        }
        
        response = self.client.post(
            f'/api/customers/{customer.id}/convert-to-lead/',
            data=lead_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'validation_error')


class TestBulkConvertEndpoint(TestCase):
    """Tests for POST /api/customers/bulk-convert/ endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST",
            is_active=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
    
    def test_bulk_convert_success(self):
        """Test successful bulk conversion of multiple customers"""
        # Create 3 unconverted customers
        customers = []
        for i in range(3):
            customer = Customer.objects.create(
                name=f"Customer {i}",
                phone=f"123456789{i}",
                company=self.company,
                created_by=self.user
            )
            customers.append(customer)
        
        request_data = {
            'customer_ids': [c.id for c in customers],
            'default_values': {
                'requirement_type': 'apartment',
                'bhk_requirement': '2',
                'budget_min': 3000000,
                'budget_max': 5000000,
                'preferred_location': 'Downtown',
                'status': 'warm'
            }
        }
        
        response = self.client.post(
            '/api/customers/bulk-convert/',
            data=request_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('summary', response.data)
        
        summary = response.data['summary']
        self.assertEqual(summary['total'], 3)
        self.assertEqual(summary['success_count'], 3)
        self.assertEqual(summary['skipped_count'], 0)
        self.assertEqual(summary['error_count'], 0)
    
    def test_bulk_convert_skips_already_converted(self):
        """Test bulk conversion skips already converted customers"""
        # Create 2 unconverted and 1 converted customer
        customer1 = Customer.objects.create(
            name="Customer 1",
            phone="1234567890",
            company=self.company,
            created_by=self.user
        )
        customer2 = Customer.objects.create(
            name="Customer 2",
            phone="1234567891",
            company=self.company,
            created_by=self.user,
            is_converted=True,
            converted_lead_id="123"
        )
        customer3 = Customer.objects.create(
            name="Customer 3",
            phone="1234567892",
            company=self.company,
            created_by=self.user
        )
        
        request_data = {
            'customer_ids': [customer1.id, customer2.id, customer3.id],
            'default_values': {
                'requirement_type': 'apartment',
                'bhk_requirement': '2',
                'budget_min': 3000000,
                'budget_max': 5000000,
                'preferred_location': 'Downtown',
                'status': 'warm'
            }
        }
        
        response = self.client.post(
            '/api/customers/bulk-convert/',
            data=request_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        summary = response.data['summary']
        self.assertEqual(summary['total'], 3)
        self.assertEqual(summary['success_count'], 2)
        self.assertEqual(summary['skipped_count'], 1)
        self.assertEqual(summary['error_count'], 0)
    
    def test_bulk_convert_missing_customer_ids_fails(self):
        """Test bulk conversion without customer_ids returns error"""
        request_data = {
            'default_values': {
                'requirement_type': 'apartment',
                'bhk_requirement': '2',
                'budget_min': 3000000,
                'budget_max': 5000000,
                'status': 'warm'
            }
        }
        
        response = self.client.post(
            '/api/customers/bulk-convert/',
            data=request_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'validation_error')
    
    def test_bulk_convert_invalid_customer_ids_type_fails(self):
        """Test bulk conversion with non-array customer_ids returns error"""
        request_data = {
            'customer_ids': 'not-an-array',
            'default_values': {
                'requirement_type': 'apartment',
                'bhk_requirement': '2',
                'budget_min': 3000000,
                'budget_max': 5000000,
                'status': 'warm'
            }
        }
        
        response = self.client.post(
            '/api/customers/bulk-convert/',
            data=request_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'validation_error')
    
    def test_bulk_convert_exceeds_limit_fails(self):
        """Test bulk conversion with more than 100 customers fails"""
        # Create 101 customer IDs
        customer_ids = list(range(1, 102))
        
        request_data = {
            'customer_ids': customer_ids,
            'default_values': {
                'requirement_type': 'apartment',
                'bhk_requirement': '2',
                'budget_min': 3000000,
                'budget_max': 5000000,
                'status': 'warm'
            }
        }
        
        response = self.client.post(
            '/api/customers/bulk-convert/',
            data=request_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'validation_error')
        self.assertIn('100', response.data['message'])
