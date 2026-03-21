"""
Unit tests for ConversionService

This test suite verifies the conversion functionality including single conversion,
bulk conversion, data preparation, and audit logging.

**Validates: Requirements REQ-028 through REQ-041, REQ-071**
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from customers.services import ConversionService, ValidationService
from customers.models import Customer, ConversionAuditLog
from leads.models import Lead
from accounts.models import Company

User = get_user_model()


class TestConversionServiceSingleConversion(TestCase):
    """
    Unit tests for single customer-to-lead conversion
    
    **Validates: Requirements REQ-028, REQ-029, REQ-031, REQ-033, REQ-034, REQ-035, REQ-036**
    """
    
    def setUp(self):
        """Set up test data"""
        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST"
        )
        
        # Create user with company
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            company=self.company
        )
        
        # Create customer
        self.customer = Customer.objects.create(
            name="John Doe",
            phone="1234567890",
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            notes="Interested in 3BHK apartment"
        )
    
    def test_convert_single_success(self):
        """Should successfully convert customer to lead"""
        lead_data = {
            'email': 'john@example.com',
            'requirement_type': 'apartment',
            'bhk_requirement': '3',
            'budget_min': 5000000,
            'budget_max': 7000000,
            'preferred_location': 'Downtown',
            'status': 'hot'
        }
        
        lead = ConversionService.convert_single(self.customer, lead_data, self.user)
        
        # Verify lead was created
        self.assertIsNotNone(lead)
        self.assertEqual(lead.name, "John Doe")
        self.assertEqual(lead.phone, "1234567890")
        self.assertEqual(lead.email, "john@example.com")
        self.assertEqual(lead.source, "customer_conversion")
        self.assertEqual(lead.company, self.company)
        
        # Verify customer was marked as converted
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_converted)
        self.assertEqual(self.customer.converted_lead_id, str(lead.id))
        
        # Verify audit log was created
        audit_log = ConversionAuditLog.objects.filter(customer_id=self.customer.id).first()
        self.assertIsNotNone(audit_log)
        self.assertTrue(audit_log.success)
        self.assertEqual(audit_log.lead_id, lead.id)
    
    def test_convert_single_with_notes_transfer(self):
        """Should copy customer notes to lead description"""
        lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': 3000000,
            'budget_max': 5000000,
            'preferred_location': 'Suburb',
            'status': 'warm'
        }
        
        lead = ConversionService.convert_single(self.customer, lead_data, self.user)
        
        # Verify notes were transferred
        self.assertIn("Interested in 3BHK apartment", lead.description)
    
    def test_convert_single_prevents_duplicate(self):
        """Should prevent converting already-converted customer"""
        # First conversion
        lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': 3000000,
            'budget_max': 5000000,
            'preferred_location': 'Downtown',
            'status': 'warm'
        }
        
        ConversionService.convert_single(self.customer, lead_data, self.user)
        
        # Attempt second conversion
        with self.assertRaises(ValueError) as context:
            ConversionService.convert_single(self.customer, lead_data, self.user)
        
        self.assertIn("already been converted", str(context.exception))
    
    def test_convert_single_validates_budget_range(self):
        """Should validate budget_min <= budget_max"""
        lead_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': 7000000,  # Invalid: min > max
            'budget_max': 5000000,
            'preferred_location': 'Downtown',
            'status': 'warm'
        }
        
        with self.assertRaises(ValueError) as context:
            ConversionService.convert_single(self.customer, lead_data, self.user)
        
        self.assertIn("budget", str(context.exception).lower())


class TestConversionServiceBulkConversion(TestCase):
    """
    Unit tests for bulk customer-to-lead conversion
    
    **Validates: Requirements REQ-037, REQ-038, REQ-039, REQ-040, REQ-041**
    """
    
    def setUp(self):
        """Set up test data"""
        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST"
        )
        
        # Create user with company
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            company=self.company
        )
        
        # Create multiple customers
        self.customers = []
        for i in range(5):
            customer = Customer.objects.create(
                name=f"Customer {i}",
                phone=f"123456789{i}",
                company=self.company,
                created_by=self.user,
                assigned_to=self.user
            )
            self.customers.append(customer)
    
    def test_convert_bulk_success(self):
        """Should successfully convert multiple customers"""
        customer_ids = [c.id for c in self.customers]
        default_values = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2',
            'budget_min': 3000000,
            'budget_max': 5000000,
            'preferred_location': 'Downtown',
            'status': 'warm'
        }
        
        result = ConversionService.convert_bulk(customer_ids, default_values, self.user)
        
        # Verify summary
        self.assertEqual(result['total'], 5)
        self.assertEqual(result['success_count'], 5)
        self.assertEqual(result['skipped_count'], 0)
        self.assertEqual(result['error_count'], 0)
        
        # Verify all customers were converted
        for customer in self.customers:
            customer.refresh_from_db()
            self.assertTrue(customer.is_converted)
            
            # Verify lead was created with default values
            lead = Lead.objects.get(id=int(customer.converted_lead_id))
            self.assertEqual(lead.requirement_type, 'apartment')
            self.assertEqual(lead.bhk_requirement, '2')
    
    def test_convert_bulk_skips_already_converted(self):
        """Should skip already-converted customers"""
        # Convert first customer manually
        self.customers[0].is_converted = True
        self.customers[0].converted_lead_id = "999"
        self.customers[0].save()
        
        customer_ids = [c.id for c in self.customers]
        default_values = {
            'requirement_type': 'villa',
            'bhk_requirement': '3',
            'budget_min': 5000000,
            'budget_max': 8000000,
            'preferred_location': 'Suburb',
            'status': 'hot'
        }
        
        result = ConversionService.convert_bulk(customer_ids, default_values, self.user)
        
        # Verify summary
        self.assertEqual(result['total'], 5)
        self.assertEqual(result['success_count'], 4)  # 4 out of 5
        self.assertEqual(result['skipped_count'], 1)  # 1 already converted
        self.assertEqual(result['error_count'], 0)
    
    def test_convert_bulk_capacity_limit(self):
        """Should enforce 100 customer limit"""
        customer_ids = list(range(1, 102))  # 101 IDs
        default_values = {}
        
        with self.assertRaises(ValueError) as context:
            ConversionService.convert_bulk(customer_ids, default_values, self.user)
        
        self.assertIn("100", str(context.exception))


class TestConversionServiceDataPreparation(TestCase):
    """
    Unit tests for lead data preparation
    
    **Validates: Requirements REQ-029, REQ-031, REQ-032, REQ-036**
    """
    
    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name="Test Company",
            code="TEST"
        )
        
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            company=self.company
        )
        
        self.customer = Customer.objects.create(
            name="Jane Smith",
            phone="9876543210",
            company=self.company,
            created_by=self.user,
            assigned_to=self.user,
            notes="Looking for villa near beach"
        )
    
    def test_prepare_lead_data_merges_correctly(self):
        """Should merge customer data with additional fields"""
        additional_data = {
            'email': 'jane@example.com',
            'requirement_type': 'villa',
            'bhk_requirement': '4',
            'budget_min': 10000000,
            'budget_max': 15000000
        }
        
        lead_data = ConversionService.prepare_lead_data(self.customer, additional_data)
        
        # Verify customer data is included
        self.assertEqual(lead_data['name'], "Jane Smith")
        self.assertEqual(lead_data['phone'], "9876543210")
        self.assertEqual(lead_data['company'], self.company)
        self.assertEqual(lead_data['source'], "customer_conversion")
        
        # Verify additional data is included
        self.assertEqual(lead_data['email'], 'jane@example.com')
        self.assertEqual(lead_data['requirement_type'], 'villa')
        
        # Verify notes are transferred to description
        self.assertIn("Looking for villa near beach", lead_data['description'])
    
    def test_prepare_lead_data_assigns_to_customer_user(self):
        """Should assign lead to customer's assigned_to user"""
        additional_data = {
            'requirement_type': 'apartment',
            'bhk_requirement': '2'
        }
        
        lead_data = ConversionService.prepare_lead_data(self.customer, additional_data)
        
        self.assertEqual(lead_data['assigned_to'], self.user)
