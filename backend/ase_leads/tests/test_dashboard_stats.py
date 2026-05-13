"""
Unit tests for dashboard_stats view function.

Tests cover:
- Authentication and permission checks
- Role-based statistics (admin, marketing_lead, BRE, BOE, CRE)
- Metric calculations (today, week, month)
- Performance metrics
- Caching functionality
- Company scoping
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from accounts.models import Company
from teams.models import Team
from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.models.task import ASELeadTask

User = get_user_model()


class DashboardStatsViewTest(TestCase):
    """Tests for the dashboard_stats view function"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.url = reverse('ase-leads-dashboard-stats')

        # Clear cache before each test
        cache.clear()

        # Create companies
        self.ase_company = Company.objects.create(
            name="ASE Technologies",
            code="ASE",
        )
        self.other_company = Company.objects.create(
            name="Other Corp",
            code="OTHER",
        )

        # Create admin user
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            role="admin",
            company=self.ase_company,
        )

        # Create marketing teams
        self.bre_team = Team.objects.create(
            name="BRE Team",
            team_type="marketing",
            marketing_category="bre",
            company=self.ase_company,
        )
        self.boe_team = Team.objects.create(
            name="BOE Team",
            team_type="marketing",
            marketing_category="boe",
            company=self.ase_company,
        )
        self.cre_team = Team.objects.create(
            name="CRE Team",
            team_type="marketing",
            marketing_category="cre",
            company=self.ase_company,
        )
        self.marketing_lead_team = Team.objects.create(
            name="Marketing Lead Team",
            team_type="marketing",
            marketing_category="marketing_lead",
            company=self.ase_company,
        )

        # Create marketing users
        self.bre_user = User.objects.create_user(
            username="bre_user",
            email="bre@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.bre_team,
        )
        self.boe_user = User.objects.create_user(
            username="boe_user",
            email="boe@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.boe_team,
        )
        self.cre_user = User.objects.create_user(
            username="cre_user",
            email="cre@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.cre_team,
        )
        self.marketing_lead_user = User.objects.create_user(
            username="marketing_lead",
            email="lead@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.marketing_lead_team,
        )

        # Create test leads
        self._create_test_leads()

    def _create_test_leads(self):
        """Create test leads with various statuses and timestamps"""
        today = timezone.now()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # New leads (for BRE)
        self.new_lead_1 = ASELead.objects.create(
            company_name="New Company 1",
            contact_person="John Doe",
            phone="1234567890",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
            created_at=today,
        )
        self.new_lead_2 = ASELead.objects.create(
            company_name="New Company 2",
            contact_person="Jane Smith",
            phone="1234567891",
            industry="healthcare",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
            created_at=yesterday,
        )

        # Qualified leads (researched by BRE)
        self.qualified_lead_1 = ASELead.objects.create(
            company_name="Qualified Company 1",
            contact_person="Bob Johnson",
            phone="1234567892",
            industry="finance",
            status="qualified",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            research_completed_at=today,
            lead_score=75,
        )
        self.qualified_lead_2 = ASELead.objects.create(
            company_name="Qualified Company 2",
            contact_person="Alice Brown",
            phone="1234567893",
            industry="retail",
            status="qualified",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            research_completed_at=week_ago,
            lead_score=80,
        )

        # Contacted leads (contacted by BOE)
        self.contacted_lead_1 = ASELead.objects.create(
            company_name="Contacted Company 1",
            contact_person="Charlie Wilson",
            phone="1234567894",
            industry="technology",
            status="contacted",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            first_contact_at=today,
            engagement_level="warm",
            last_engagement_date=today,
            response_time_hours=Decimal('2.5'),
        )
        self.contacted_lead_2 = ASELead.objects.create(
            company_name="Contacted Company 2",
            contact_person="Diana Martinez",
            phone="1234567895",
            industry="healthcare",
            status="contacted",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            first_contact_at=week_ago,
            engagement_level="hot",
            last_engagement_date=week_ago,
            response_time_hours=Decimal('1.5'),
        )

        # Proposal sent leads (managed by CRE)
        self.proposal_lead_1 = ASELead.objects.create(
            company_name="Proposal Company 1",
            contact_person="Edward Davis",
            phone="1234567896",
            industry="finance",
            status="proposal_sent",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            managed_by=self.cre_user,
            proposal_sent_at=today,
            estimated_project_value=Decimal('50000.00'),
        )
        self.proposal_lead_2 = ASELead.objects.create(
            company_name="Proposal Company 2",
            contact_person="Fiona Garcia",
            phone="1234567897",
            industry="retail",
            status="proposal_sent",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            managed_by=self.cre_user,
            proposal_sent_at=week_ago,
            estimated_project_value=Decimal('75000.00'),
        )

        # Won leads (closed by CRE)
        self.won_lead_1 = ASELead.objects.create(
            company_name="Won Company 1",
            contact_person="George Rodriguez",
            phone="1234567898",
            industry="technology",
            status="won",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            managed_by=self.cre_user,
            first_contact_at=month_ago,
            proposal_sent_at=week_ago,
            deal_closed_at=today,
            estimated_project_value=Decimal('100000.00'),
        )

        # Create activities for BOE user
        ASELeadActivity.objects.create(
            lead=self.contacted_lead_1,
            user=self.boe_user,
            activity_type='call',
            title='Initial call',
            call_duration_minutes=15,
            created_at=today,
        )
        ASELeadActivity.objects.create(
            lead=self.contacted_lead_1,
            user=self.boe_user,
            activity_type='email',
            title='Follow-up email',
            email_subject='Follow up on our call',
            created_at=today,
        )

        # Create activities for CRE user
        ASELeadActivity.objects.create(
            lead=self.proposal_lead_1,
            user=self.cre_user,
            activity_type='meeting',
            title='Proposal presentation',
            meeting_date=today,
            created_at=today,
        )

    def tearDown(self):
        """Clean up after each test"""
        cache.clear()

    # ══════════════════════════════════════════════════════════════════════════
    # Authentication & Permission Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access dashboard stats"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Test that non-marketing users are denied access"""
        # Create a user without marketing team
        non_marketing_user = User.objects.create_user(
            username="non_marketing",
            email="non@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
        )
        self.client.force_authenticate(user=non_marketing_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_company_user_denied(self):
        """Test that users from other companies are denied access"""
        other_user = User.objects.create_user(
            username="other_user",
            email="other@test.com",
            password="testpass123",
            role="employee",
            company=self.other_company,
        )
        self.client.force_authenticate(user=other_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ══════════════════════════════════════════════════════════════════════════
    # BRE Dashboard Stats Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_bre_dashboard_stats(self):
        """Test BRE user gets correct dashboard statistics"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check role
        self.assertEqual(data['role'], 'bre')
        self.assertEqual(data['role_display'], 'Business Research Executive')
        
        # Check research queue
        self.assertIn('research_queue', data)
        self.assertEqual(data['research_queue']['total'], 2)  # 2 new leads
        
        # Check today's metrics
        self.assertIn('today', data)
        self.assertEqual(data['today']['researched'], 1)  # 1 researched today
        self.assertEqual(data['today']['qualified'], 1)  # 1 qualified today
        
        # Check performance metrics
        self.assertIn('performance', data)
        self.assertIn('qualification_rate', data['performance'])
        self.assertIn('avg_lead_score', data['performance'])
        self.assertIn('quality_score', data['performance'])

    def test_bre_qualification_rate_calculation(self):
        """Test BRE qualification rate is calculated correctly"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # 2 qualified out of 2 researched = 100%
        self.assertEqual(data['performance']['qualification_rate'], 100.0)

    def test_bre_avg_lead_score_calculation(self):
        """Test BRE average lead score is calculated correctly"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # Average of 75 and 80 = 77.5
        self.assertEqual(data['performance']['avg_lead_score'], 77.5)

    # ══════════════════════════════════════════════════════════════════════════
    # BOE Dashboard Stats Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_boe_dashboard_stats(self):
        """Test BOE user gets correct dashboard statistics"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check role
        self.assertEqual(data['role'], 'boe')
        self.assertEqual(data['role_display'], 'Business Outreach Executive')
        
        # Check call queue
        self.assertIn('call_queue', data)
        # Should include qualified, contacted, nurturing leads
        # We have 2 qualified + 2 contacted = 4
        self.assertEqual(data['call_queue']['total'], 4)
        
        # Check today's metrics
        self.assertIn('today', data)
        self.assertEqual(data['today']['calls'], 1)  # 1 call today
        self.assertEqual(data['today']['emails'], 1)  # 1 email today
        self.assertEqual(data['today']['contacted'], 1)  # 1 contacted today
        
        # Check daily targets
        self.assertIn('daily_targets', data)
        self.assertEqual(data['daily_targets']['calls'], 40)
        self.assertEqual(data['daily_targets']['emails'], 30)
        self.assertEqual(data['daily_targets']['contacts'], 20)
        
        # Check performance metrics
        self.assertIn('performance', data)
        self.assertIn('contact_rate', data['performance'])
        self.assertIn('warm_conversion', data['performance'])
        self.assertIn('avg_response_time_hours', data['performance'])

    def test_boe_contact_rate_calculation(self):
        """Test BOE contact rate is calculated correctly"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # 2 contacted / 1 call this month = 200% (can be > 100% if multiple contacts per call)
        # Actually, we have 1 call activity but 2 leads contacted
        self.assertGreater(data['performance']['contact_rate'], 0)

    def test_boe_avg_response_time_calculation(self):
        """Test BOE average response time is calculated correctly"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # Average of 2.5 and 1.5 = 2.0
        self.assertEqual(data['performance']['avg_response_time_hours'], 2.0)

    # ══════════════════════════════════════════════════════════════════════════
    # CRE Dashboard Stats Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_cre_dashboard_stats(self):
        """Test CRE user gets correct dashboard statistics"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check role
        self.assertEqual(data['role'], 'cre')
        self.assertEqual(data['role_display'], 'Client Research Executive')
        
        # Check pipeline
        self.assertIn('pipeline', data)
        self.assertEqual(data['pipeline']['warm_leads'], 0)  # No contacted leads managed by CRE
        self.assertEqual(data['pipeline']['proposals_sent'], 2)  # 2 proposal_sent leads
        self.assertEqual(data['pipeline']['negotiating'], 0)  # No negotiating leads
        
        # Check expected revenue
        # 50000 + 75000 = 125000 (from proposal_sent leads)
        self.assertEqual(data['pipeline']['expected_revenue'], 125000.0)
        
        # Check today's metrics
        self.assertIn('today', data)
        self.assertEqual(data['today']['proposals'], 1)  # 1 proposal sent today
        self.assertEqual(data['today']['meetings'], 1)  # 1 meeting today
        
        # Check performance metrics
        self.assertIn('performance', data)
        self.assertIn('proposal_win_rate', data['performance'])
        self.assertIn('avg_deal_size', data['performance'])
        self.assertIn('avg_sales_cycle_days', data['performance'])

    def test_cre_proposal_win_rate_calculation(self):
        """Test CRE proposal win rate is calculated correctly"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # 1 won / 1 proposal this month = 100%
        # (only 1 proposal was sent this month, the other was a week ago)
        self.assertGreater(data['performance']['proposal_win_rate'], 0)

    def test_cre_avg_deal_size_calculation(self):
        """Test CRE average deal size is calculated correctly"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        
        data = response.json()
        # Only 1 won deal this month with value 100000
        self.assertEqual(data['performance']['avg_deal_size'], 100000.0)

    # ══════════════════════════════════════════════════════════════════════════
    # Marketing Lead Dashboard Stats Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_marketing_lead_dashboard_stats(self):
        """Test Marketing Lead user gets correct dashboard statistics"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check role
        self.assertEqual(data['role'], 'marketing_lead')
        self.assertEqual(data['role_display'], 'Marketing Team Lead')
        
        # Check team metrics
        self.assertIn('team_metrics', data)
        self.assertGreater(data['team_metrics']['total_leads'], 0)
        self.assertGreater(data['team_metrics']['qualified'], 0)
        
        # Check team performance
        self.assertIn('team_performance', data)
        self.assertIn('bre', data['team_performance'])
        self.assertIn('boe', data['team_performance'])
        self.assertIn('cre', data['team_performance'])
        
        # Check pipeline
        self.assertIn('pipeline', data)
        self.assertEqual(data['pipeline']['new'], 2)
        self.assertEqual(data['pipeline']['qualified'], 2)
        
        # Check action items
        self.assertIn('action_items', data)
        self.assertIn('leads_needing_assignment', data['action_items'])
        self.assertIn('proposals_pending_review', data['action_items'])
        self.assertIn('high_value_deals', data['action_items'])

    def test_admin_sees_marketing_lead_dashboard(self):
        """Test admin user sees Marketing Lead dashboard"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Admin should see Marketing Lead dashboard
        self.assertEqual(data['role'], 'marketing_lead')
        self.assertIn('team_metrics', data)
        self.assertIn('team_performance', data)

    def test_marketing_lead_team_performance_metrics(self):
        """Test Marketing Lead team performance metrics are calculated correctly"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        
        data = response.json()
        
        # BRE team performance
        bre_perf = data['team_performance']['bre']
        self.assertGreater(bre_perf['researched'], 0)
        self.assertGreater(bre_perf['qualified'], 0)
        self.assertGreater(bre_perf['qualification_rate'], 0)
        
        # BOE team performance
        boe_perf = data['team_performance']['boe']
        self.assertGreater(boe_perf['calls'], 0)
        self.assertGreater(boe_perf['contacted'], 0)
        
        # CRE team performance
        cre_perf = data['team_performance']['cre']
        self.assertGreater(cre_perf['proposals'], 0)
        self.assertGreater(cre_perf['won'], 0)

    # ══════════════════════════════════════════════════════════════════════════
    # Caching Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_caching_works(self):
        """Test that dashboard stats are cached"""
        self.client.force_authenticate(user=self.bre_user)
        
        # First request - should hit database
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        data1 = response1.json()
        
        # Create a new lead (should not affect cached result)
        ASELead.objects.create(
            company_name="New Lead After Cache",
            contact_person="Test Person",
            phone="9999999999",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
        )
        
        # Second request - should return cached data
        response2 = self.client.get(self.url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        data2 = response2.json()
        
        # Data should be identical (cached)
        self.assertEqual(data1, data2)
        
        # Clear cache
        cache.clear()
        
        # Third request - should hit database again
        response3 = self.client.get(self.url)
        self.assertEqual(response3.status_code, status.HTTP_200_OK)
        data3 = response3.json()
        
        # Research queue should now include the new lead
        self.assertEqual(data3['research_queue']['total'], 3)

    def test_cache_is_user_specific(self):
        """Test that cache is specific to each user"""
        # BRE user request
        self.client.force_authenticate(user=self.bre_user)
        response1 = self.client.get(self.url)
        data1 = response1.json()
        self.assertEqual(data1['role'], 'bre')
        
        # BOE user request (should not get BRE cached data)
        self.client.force_authenticate(user=self.boe_user)
        response2 = self.client.get(self.url)
        data2 = response2.json()
        self.assertEqual(data2['role'], 'boe')
        
        # Data should be different
        self.assertNotEqual(data1, data2)

    # ══════════════════════════════════════════════════════════════════════════
    # Company Scoping Tests
    # ══════════════════════════════════════════════════════════════════════════

    def test_stats_scoped_to_company(self):
        """Test that stats are scoped to user's company"""
        # Create a lead for another company
        other_lead = ASELead.objects.create(
            company_name="Other Company Lead",
            contact_person="Other Person",
            phone="8888888888",
            industry="technology",
            status="new",
            company=self.other_company,
            created_by=self.admin_user,
        )
        
        # BRE user should only see ASE company leads
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        data = response.json()
        
        # Should not include the other company's lead
        self.assertEqual(data['research_queue']['total'], 2)  # Only ASE leads

    # ══════════════════════════════════════════════════════════════════════════
    # Edge Cases
    # ══════════════════════════════════════════════════════════════════════════

    def test_empty_stats_for_new_user(self):
        """Test that new users with no activity get zero stats"""
        # Create a new BRE user with no leads
        new_bre_user = User.objects.create_user(
            username="new_bre",
            email="newbre@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.bre_team,
        )
        
        self.client.force_authenticate(user=new_bre_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should have zero metrics
        self.assertEqual(data['today']['researched'], 0)
        self.assertEqual(data['today']['qualified'], 0)
        self.assertEqual(data['performance']['qualification_rate'], 0)

    def test_division_by_zero_handled(self):
        """Test that division by zero is handled gracefully"""
        # Create a new CRE user with no proposals
        new_cre_user = User.objects.create_user(
            username="new_cre",
            email="newcre@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.cre_team,
        )
        
        self.client.force_authenticate(user=new_cre_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should have zero win rate (not error)
        self.assertEqual(data['performance']['proposal_win_rate'], 0)
