"""
Tests for customer import API endpoints
Tests the three import endpoints: import, preview, and template
"""
import io
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company
from customers.models import Customer

User = get_user_model()


class TestImportAPIEndpoints(TestCase):
    """Test customer import API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST"
        )
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="admin",
            company=self.company
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_import_customers_csv_success(self):
        """Test POST /api/customers/import/ with valid CSV"""
        # Create CSV content
        csv_content = "phone,name\n1234567890,John Doe\n9876543210,Jane Smith"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        # Make request
        response = self.client.post(
            '/api/customers/import/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['summary']['total_rows'], 2)
        self.assertEqual(response.data['summary']['success_count'], 2)
        self.assertEqual(response.data['summary']['error_count'], 0)
        
        # Verify customers were created
        self.assertEqual(Customer.objects.count(), 2)
        self.assertTrue(Customer.objects.filter(phone='1234567890').exists())
        self.assertTrue(Customer.objects.filter(phone='9876543210').exists())
    
    def test_import_customers_with_errors(self):
        """Test import with validation errors"""
        # Create CSV with invalid phone
        csv_content = "phone,name\n123,Invalid Phone\n9876543210,Valid Phone"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        # Make request
        response = self.client.post(
            '/api/customers/import/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['summary']['total_rows'], 2)
        self.assertEqual(response.data['summary']['success_count'], 1)
        self.assertEqual(response.data['summary']['error_count'], 1)
        self.assertEqual(len(response.data['summary']['errors']), 1)
        
        # Verify only valid customer was created
        self.assertEqual(Customer.objects.count(), 1)
        self.assertTrue(Customer.objects.filter(phone='9876543210').exists())
    
    def test_import_customers_no_file(self):
        """Test import without file"""
        response = self.client.post(
            '/api/customers/import/',
            {'import_type': 'csv'},
            format='multipart'
        )
        
        # Verify error response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('No file provided', response.data['error'])
    
    def test_import_preview_success(self):
        """Test POST /api/customers/import/preview/ with valid CSV"""
        # Create CSV content
        csv_content = "phone,name\n1234567890,John Doe\n123,Invalid Phone\n9876543210,Jane Smith"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        # Make request
        response = self.client.post(
            '/api/customers/import/preview/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_rows'], 3)
        self.assertEqual(response.data['valid_count'], 2)
        self.assertEqual(response.data['error_count'], 1)
        self.assertEqual(len(response.data['preview']), 3)
        
        # Verify preview data
        preview = response.data['preview']
        self.assertTrue(preview[0]['valid'])
        self.assertFalse(preview[1]['valid'])
        self.assertTrue(preview[2]['valid'])
        
        # Verify no customers were created (preview only)
        self.assertEqual(Customer.objects.count(), 0)
    
    def test_import_preview_limit_100_rows(self):
        """Test preview limits to first 100 rows"""
        # Create CSV with 150 rows
        csv_lines = ["phone,name"]
        for i in range(150):
            csv_lines.append(f"123456789{i:02d},Person {i}")
        csv_content = "\n".join(csv_lines)
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        # Make request
        response = self.client.post(
            '/api/customers/import/preview/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify response shows only 100 rows
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_rows'], 100)
        self.assertEqual(len(response.data['preview']), 100)
    
    def test_import_template_download(self):
        """Test GET /api/customers/import/template/ returns CSV template"""
        # Make request
        response = self.client.get('/api/customers/import/template/')
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('customer_import_template.csv', response['Content-Disposition'])
        
        # Verify CSV content
        content = response.content.decode('utf-8')
        self.assertEqual(content, "phone,name\n")
    
    def test_import_customers_company_isolation(self):
        """Test that imports respect company context"""
        # Create another company and user
        other_company = Company.objects.create(
            name="Other Company",
            code="OTHER"
        )
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
            role="admin",
            company=other_company
        )
        
        # Create customer in other company with different phone
        Customer.objects.create(
            phone="9999999999",
            name="Other Company Customer",
            company=other_company,
            created_by=other_user
        )
        
        # Import customer in our company
        csv_content = "phone,name\n1234567890,John Doe"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        response = self.client.post(
            '/api/customers/import/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify import succeeded
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['summary']['success_count'], 1)
        
        # Verify customer was created in correct company
        customer = Customer.objects.get(phone='1234567890')
        self.assertEqual(customer.company, self.company)
        self.assertEqual(customer.created_by, self.user)
    
    def test_import_customers_duplicate_in_same_company(self):
        """Test that duplicate phone in same company is rejected"""
        # Create existing customer
        Customer.objects.create(
            phone="1234567890",
            name="Existing Customer",
            company=self.company,
            created_by=self.user
        )
        
        # Try to import customer with same phone
        csv_content = "phone,name\n1234567890,John Doe"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'customers.csv'
        
        response = self.client.post(
            '/api/customers/import/',
            {
                'file': csv_file,
                'import_type': 'csv'
            },
            format='multipart'
        )
        
        # Verify import reported duplicate
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['summary']['success_count'], 0)
        self.assertEqual(response.data['summary']['error_count'], 1)
        self.assertIn('already exists', response.data['summary']['errors'][0]['error'])
        
        # Verify no new customer was created
        self.assertEqual(Customer.objects.filter(phone='1234567890').count(), 1)
