"""
Tests for ASE Leads app
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from accounts.models import Company
from .models import ASELead

User = get_user_model()


class ASELeadModelTest(TestCase):
    """Test cases for ASELead model"""
    
    def setUp(self):
        """Set up test data"""
        # Create a test company
        self.company = Company.objects.create(
            name="ASE Technologies",
            code="ASE"
        )
        
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            company=self.company
        )
    
    def test_lead_score_valid_range(self):
        """Test that lead_score accepts valid values in 0-100 range"""
        # Test minimum valid value
        lead_min = ASELead.objects.create(
            company_name="Test Company Min",
            contact_person="John Doe",
            phone="1234567890",
            industry="technology",
            company=self.company,
            created_by=self.user,
            lead_score=0
        )
        lead_min.full_clean()  # Should not raise ValidationError
        self.assertEqual(lead_min.lead_score, 0)
        
        # Test maximum valid value
        lead_max = ASELead.objects.create(
            company_name="Test Company Max",
            contact_person="Jane Doe",
            phone="0987654321",
            industry="technology",
            company=self.company,
            created_by=self.user,
            lead_score=100
        )
        lead_max.full_clean()  # Should not raise ValidationError
        self.assertEqual(lead_max.lead_score, 100)
        
        # Test mid-range value
        lead_mid = ASELead.objects.create(
            company_name="Test Company Mid",
            contact_person="Bob Smith",
            phone="5555555555",
            industry="technology",
            company=self.company,
            created_by=self.user,
            lead_score=50
        )
        lead_mid.full_clean()  # Should not raise ValidationError
        self.assertEqual(lead_mid.lead_score, 50)
    
    def test_lead_score_below_minimum(self):
        """Test that lead_score rejects values below 0"""
        lead = ASELead.objects.create(
            company_name="Test Company Invalid",
            contact_person="Invalid User",
            phone="1111111111",
            industry="technology",
            company=self.company,
            created_by=self.user,
            lead_score=-1
        )
        
        with self.assertRaises(ValidationError) as context:
            lead.full_clean()
        
        # Check that the error is for lead_score field
        self.assertIn('lead_score', context.exception.message_dict)
    
    def test_lead_score_above_maximum(self):
        """Test that lead_score rejects values above 100"""
        lead = ASELead.objects.create(
            company_name="Test Company Invalid Max",
            contact_person="Invalid User Max",
            phone="2222222222",
            industry="technology",
            company=self.company,
            created_by=self.user,
            lead_score=101
        )
        
        with self.assertRaises(ValidationError) as context:
            lead.full_clean()
        
        # Check that the error is for lead_score field
        self.assertIn('lead_score', context.exception.message_dict)
    
    def test_lead_score_default_value(self):
        """Test that lead_score has default value of 0"""
        lead = ASELead.objects.create(
            company_name="Test Company Default",
            contact_person="Default User",
            phone="3333333333",
            industry="technology",
            company=self.company,
            created_by=self.user
        )
        
        self.assertEqual(lead.lead_score, 0)
