"""
Test that marketing team categories are restricted to ASE Technologies only.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from accounts.models import Company, User
from teams.models import Team


class ASEMarketingRestrictionTest(TestCase):
    """Test marketing category restrictions"""
    
    def setUp(self):
        """Set up test data"""
        # Create ASE Technologies
        self.ase_company = Company.objects.create(
            name='ASE Technologies',
            code='ASE',
            is_active=True
        )
        
        # Create another company (Capital Finance)
        self.other_company = Company.objects.create(
            name='Capital Finance',
            code='CAPITAL',
            is_active=True
        )
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin',
            company=self.ase_company
        )
    
    def test_marketing_category_allowed_for_ase(self):
        """Test that marketing categories work for ASE Technologies"""
        team = Team(
            name='BRE Team',
            team_type='marketing',
            marketing_category='bre',
            company=self.ase_company,
            description='Business Research Executive Team'
        )
        
        # Should not raise any error
        try:
            team.full_clean()
            team.save()
            self.assertTrue(True, "Marketing category allowed for ASE Technologies")
        except ValidationError:
            self.fail("Marketing category should be allowed for ASE Technologies")
    
    def test_marketing_category_blocked_for_other_companies(self):
        """Test that marketing categories are blocked for non-ASE companies"""
        team = Team(
            name='BRE Team',
            team_type='marketing',
            marketing_category='bre',
            company=self.other_company,  # Not ASE Technologies
            description='Business Research Executive Team'
        )
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            team.full_clean()
        
        self.assertIn('marketing_category', context.exception.message_dict)
        self.assertIn('only available for ASE Technologies', 
                     str(context.exception.message_dict['marketing_category']))
    
    def test_marketing_category_requires_marketing_team_type(self):
        """Test that marketing_category requires team_type='marketing'"""
        team = Team(
            name='Technical Team',
            team_type='technical',  # Wrong type
            marketing_category='bre',  # Should not be allowed
            company=self.ase_company,
            description='Technical Team'
        )
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            team.full_clean()
        
        self.assertIn('marketing_category', context.exception.message_dict)
        self.assertIn('team_type="marketing"', 
                     str(context.exception.message_dict['marketing_category']))
    
    def test_technical_team_without_marketing_category_works(self):
        """Test that technical teams work without marketing_category"""
        team = Team(
            name='Frontend Team',
            team_type='technical',
            company=self.ase_company,
            description='Frontend Development Team'
        )
        
        # Should not raise any error
        try:
            team.full_clean()
            team.save()
            self.assertTrue(True, "Technical team without marketing_category works")
        except ValidationError:
            self.fail("Technical team should work without marketing_category")
    
    def test_marketing_team_without_category_works(self):
        """Test that marketing teams can exist without a specific category"""
        team = Team(
            name='General Marketing Team',
            team_type='marketing',
            marketing_category=None,  # No specific category
            company=self.ase_company,
            description='General Marketing Team'
        )
        
        # Should not raise any error
        try:
            team.full_clean()
            team.save()
            self.assertTrue(True, "Marketing team without category works")
        except ValidationError:
            self.fail("Marketing team should work without specific category")
    
    def test_all_marketing_categories_for_ase(self):
        """Test that all marketing categories work for ASE Technologies"""
        categories = ['bre', 'boe', 'cre', 'marketing_lead']
        
        for category in categories:
            team = Team(
                name=f'{category.upper()} Team',
                team_type='marketing',
                marketing_category=category,
                company=self.ase_company,
                description=f'{category} Team'
            )
            
            try:
                team.full_clean()
                team.save()
                self.assertTrue(True, f"Category {category} works for ASE")
            except ValidationError:
                self.fail(f"Category {category} should work for ASE Technologies")
    
    def test_update_team_to_add_marketing_category_blocked_for_non_ase(self):
        """Test that updating a team to add marketing_category is blocked for non-ASE"""
        # Create a team without marketing_category
        team = Team.objects.create(
            name='Marketing Team',
            team_type='marketing',
            company=self.other_company,
            description='Marketing Team'
        )
        
        # Try to add marketing_category
        team.marketing_category = 'bre'
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            team.full_clean()
        
        self.assertIn('marketing_category', context.exception.message_dict)
        self.assertIn('only available for ASE Technologies', 
                     str(context.exception.message_dict['marketing_category']))


class ASEMarketingSerializerTest(TestCase):
    """Test marketing category restrictions in serializer"""
    
    def setUp(self):
        """Set up test data"""
        from teams.serializers import TeamSerializer
        
        self.TeamSerializer = TeamSerializer
        
        # Create companies
        self.ase_company = Company.objects.create(
            name='ASE Technologies',
            code='ASE',
            is_active=True
        )
        
        self.other_company = Company.objects.create(
            name='Capital Finance',
            code='CAPITAL',
            is_active=True
        )
    
    def test_serializer_validates_ase_restriction(self):
        """Test that serializer validates ASE restriction"""
        data = {
            'name': 'BRE Team',
            'team_type': 'marketing',
            'marketing_category': 'bre',
            'company': self.other_company.id,
            'description': 'BRE Team'
        }
        
        serializer = self.TeamSerializer(data=data)
        
        # Should not be valid
        self.assertFalse(serializer.is_valid())
        self.assertIn('marketing_category', serializer.errors)
        self.assertIn('only available for ASE Technologies', 
                     str(serializer.errors['marketing_category']))
    
    def test_serializer_allows_ase_marketing_category(self):
        """Test that serializer allows marketing_category for ASE"""
        data = {
            'name': 'BRE Team',
            'team_type': 'marketing',
            'marketing_category': 'bre',
            'company': self.ase_company.id,
            'description': 'BRE Team'
        }
        
        serializer = self.TeamSerializer(data=data)
        
        # Should be valid
        self.assertTrue(serializer.is_valid(), serializer.errors)
