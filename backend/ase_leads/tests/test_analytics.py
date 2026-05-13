"""
Unit tests for analytics views.

Tests cover:
- Authentication and permission checks (401 for unauthenticated, 403 for non-marketing)
- Role restrictions (team_performance, pipeline, conversion only for admin/marketing_lead)
- my_performance returns role-specific data
- Period filtering works
- Caching works
- Correct metric calculations
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

User = get_user_model()


class AnalyticsViewsTestBase(TestCase):
    """Base class with shared setup for analytics tests."""

    def setUp(self):
        self.client = APIClient()
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
            username="admin_analytics",
            email="admin_analytics@test.com",
            password="testpass123",
            role="admin",
            company=self.ase_company,
        )

        # Create marketing teams
        self.bre_team = Team.objects.create(
            name="BRE Team Analytics",
            team_type="marketing",
            marketing_category="bre",
            company=self.ase_company,
        )
        self.boe_team = Team.objects.create(
            name="BOE Team Analytics",
            team_type="marketing",
            marketing_category="boe",
            company=self.ase_company,
        )
        self.cre_team = Team.objects.create(
            name="CRE Team Analytics",
            team_type="marketing",
            marketing_category="cre",
            company=self.ase_company,
        )
        self.marketing_lead_team = Team.objects.create(
            name="Marketing Lead Team Analytics",
            team_type="marketing",
            marketing_category="marketing_lead",
            company=self.ase_company,
        )

        # Create marketing users
        self.bre_user = User.objects.create_user(
            username="bre_analytics",
            email="bre_analytics@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.bre_team,
        )
        self.boe_user = User.objects.create_user(
            username="boe_analytics",
            email="boe_analytics@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.boe_team,
        )
        self.cre_user = User.objects.create_user(
            username="cre_analytics",
            email="cre_analytics@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.cre_team,
        )
        self.marketing_lead_user = User.objects.create_user(
            username="lead_analytics",
            email="lead_analytics@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.marketing_lead_team,
        )

        # Create non-marketing user
        self.non_marketing_user = User.objects.create_user(
            username="non_marketing_analytics",
            email="non_marketing_analytics@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
        )

        # Create test data
        self._create_test_leads()

    def _create_test_leads(self):
        """Create test leads with various statuses and timestamps."""
        today = timezone.now()

        # New leads
        self.new_lead = ASELead.objects.create(
            company_name="New Analytics Co",
            contact_person="Ana New",
            phone="5550000001",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Qualified lead (researched by BRE)
        self.qualified_lead = ASELead.objects.create(
            company_name="Qualified Analytics Co",
            contact_person="Ana Qualified",
            phone="5550000002",
            industry="finance",
            status="qualified",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            research_completed_at=today,
            lead_score=80,
        )

        # Contacted lead (contacted by BOE)
        self.contacted_lead = ASELead.objects.create(
            company_name="Contacted Analytics Co",
            contact_person="Ana Contacted",
            phone="5550000003",
            industry="healthcare",
            status="contacted",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            research_completed_at=today - timedelta(days=5),
            contacted_by=self.boe_user,
            first_contact_at=today,
            response_time_hours=Decimal('3.0'),
        )

        # Proposal sent lead (managed by CRE)
        self.proposal_lead = ASELead.objects.create(
            company_name="Proposal Analytics Co",
            contact_person="Ana Proposal",
            phone="5550000004",
            industry="retail",
            status="proposal_sent",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            managed_by=self.cre_user,
            first_contact_at=today - timedelta(days=10),
            proposal_sent_at=today,
            estimated_project_value=Decimal('50000.00'),
        )

        # Won lead
        self.won_lead = ASELead.objects.create(
            company_name="Won Analytics Co",
            contact_person="Ana Won",
            phone="5550000005",
            industry="technology",
            status="won",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            contacted_by=self.boe_user,
            managed_by=self.cre_user,
            first_contact_at=today - timedelta(days=20),
            proposal_sent_at=today - timedelta(days=7),
            deal_closed_at=today,
            estimated_project_value=Decimal('100000.00'),
        )

        # Lost lead
        self.lost_lead = ASELead.objects.create(
            company_name="Lost Analytics Co",
            contact_person="Ana Lost",
            phone="5550000006",
            industry="finance",
            status="lost",
            company=self.ase_company,
            created_by=self.admin_user,
            researched_by=self.bre_user,
            disqualification_reason="Budget too low",
            research_completed_at=today,
        )

        # Activities
        ASELeadActivity.objects.create(
            lead=self.contacted_lead,
            user=self.boe_user,
            activity_type='call',
            title='Analytics test call',
            created_at=today,
        )
        ASELeadActivity.objects.create(
            lead=self.contacted_lead,
            user=self.boe_user,
            activity_type='email',
            title='Analytics test email',
            created_at=today,
        )
        ASELeadActivity.objects.create(
            lead=self.proposal_lead,
            user=self.cre_user,
            activity_type='meeting',
            title='Analytics test meeting',
            created_at=today,
        )

    def tearDown(self):
        cache.clear()


# ══════════════════════════════════════════════════════════════════════════════
# Team Performance Tests
# ══════════════════════════════════════════════════════════════════════════════

class TeamPerformanceViewTest(AnalyticsViewsTestBase):
    """Tests for the team_performance view."""

    def setUp(self):
        super().setUp()
        self.url = reverse('ase-leads-team-performance')

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users get 401."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Non-marketing users get 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bre_user_denied(self):
        """BRE users cannot access team performance."""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_boe_user_denied(self):
        """BOE users cannot access team performance."""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users cannot access team performance."""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access(self):
        """Admin users can access team performance."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_access(self):
        """Marketing lead can access team performance."""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_returns_all_role_metrics(self):
        """Response contains BRE, BOE, CRE sections."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        self.assertIn('bre', data)
        self.assertIn('boe', data)
        self.assertIn('cre', data)
        self.assertIn('period', data)

    def test_bre_metrics_correct(self):
        """BRE team metrics are calculated correctly."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        bre = data['bre']
        self.assertIn('member_count', bre)
        self.assertIn('metrics', bre)
        self.assertIn('top_performer', bre)
        self.assertGreater(bre['metrics']['leads_researched'], 0)

    def test_period_filtering(self):
        """Period query param filters results."""
        self.client.force_authenticate(user=self.admin_user)

        # Default (month)
        response = self.client.get(self.url)
        data_month = response.json()
        self.assertEqual(data_month['period'], 'month')

        cache.clear()

        # Week
        response = self.client.get(self.url, {'period': 'week'})
        data_week = response.json()
        self.assertEqual(data_week['period'], 'week')

        cache.clear()

        # Today
        response = self.client.get(self.url, {'period': 'today'})
        data_today = response.json()
        self.assertEqual(data_today['period'], 'today')

    def test_caching_works(self):
        """Results are cached for subsequent requests."""
        self.client.force_authenticate(user=self.admin_user)

        # First request
        response1 = self.client.get(self.url)
        data1 = response1.json()

        # Create new lead
        ASELead.objects.create(
            company_name="Cache Test Co",
            contact_person="Cache Person",
            phone="5559999999",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Second request should return cached data
        response2 = self.client.get(self.url)
        data2 = response2.json()
        self.assertEqual(data1, data2)


# ══════════════════════════════════════════════════════════════════════════════
# My Performance Tests
# ══════════════════════════════════════════════════════════════════════════════

class MyPerformanceViewTest(AnalyticsViewsTestBase):
    """Tests for the my_performance view."""

    def setUp(self):
        super().setUp()
        self.url = reverse('ase-leads-my-performance')

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users get 401."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Non-marketing users get 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bre_user_gets_bre_metrics(self):
        """BRE user gets BRE-specific performance metrics."""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['role'], 'bre')
        self.assertIn('leads_researched', data)
        self.assertIn('qualified', data)
        self.assertIn('disqualified', data)
        self.assertIn('qualification_rate', data)
        self.assertIn('avg_lead_score', data)

    def test_boe_user_gets_boe_metrics(self):
        """BOE user gets BOE-specific performance metrics."""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['role'], 'boe')
        self.assertIn('calls_made', data)
        self.assertIn('emails_sent', data)
        self.assertIn('leads_contacted', data)
        self.assertIn('contact_rate', data)
        self.assertIn('avg_response_time', data)

    def test_cre_user_gets_cre_metrics(self):
        """CRE user gets CRE-specific performance metrics."""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['role'], 'cre')
        self.assertIn('proposals_sent', data)
        self.assertIn('meetings_held', data)
        self.assertIn('deals_won', data)
        self.assertIn('win_rate', data)
        self.assertIn('avg_deal_size', data)
        self.assertIn('revenue', data)

    def test_marketing_lead_gets_lead_metrics(self):
        """Marketing lead gets team-wide summary."""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['role'], 'marketing_lead')
        self.assertIn('total_leads', data)
        self.assertIn('deals_won', data)
        self.assertIn('revenue', data)
        self.assertIn('overall_conversion', data)

    def test_admin_gets_lead_metrics(self):
        """Admin gets marketing_lead performance view."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['role'], 'marketing_lead')

    def test_bre_metrics_calculation(self):
        """BRE metrics are calculated correctly."""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        data = response.json()

        # BRE user researched: qualified_lead, contacted_lead, proposal_lead, won_lead, lost_lead
        # But only those with research_completed_at in this month
        self.assertGreater(data['leads_researched'], 0)
        self.assertGreater(data['qualified'], 0)

    def test_boe_metrics_calculation(self):
        """BOE metrics are calculated correctly."""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        data = response.json()

        # BOE user has 1 call and 1 email activity, 1 contacted lead
        self.assertEqual(data['calls_made'], 1)
        self.assertEqual(data['emails_sent'], 1)
        self.assertEqual(data['leads_contacted'], 1)

    def test_cre_metrics_calculation(self):
        """CRE metrics are calculated correctly."""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        data = response.json()

        # CRE user has 2 proposals sent (proposal_lead + won_lead both have proposal_sent_at)
        # 1 meeting, 1 won deal
        self.assertEqual(data['proposals_sent'], 2)
        self.assertEqual(data['meetings_held'], 1)
        self.assertEqual(data['deals_won'], 1)
        self.assertEqual(data['revenue'], 100000.0)

    def test_period_filtering(self):
        """Period query param filters results."""
        self.client.force_authenticate(user=self.bre_user)

        response = self.client.get(self.url, {'period': 'today'})
        data = response.json()
        self.assertEqual(data['period'], 'today')

    def test_caching_per_user(self):
        """Cache is user-specific."""
        # BRE user
        self.client.force_authenticate(user=self.bre_user)
        response1 = self.client.get(self.url)
        data1 = response1.json()
        self.assertEqual(data1['role'], 'bre')

        # BOE user should not get BRE cached data
        self.client.force_authenticate(user=self.boe_user)
        response2 = self.client.get(self.url)
        data2 = response2.json()
        self.assertEqual(data2['role'], 'boe')


# ══════════════════════════════════════════════════════════════════════════════
# Pipeline Overview Tests
# ══════════════════════════════════════════════════════════════════════════════

class PipelineOverviewViewTest(AnalyticsViewsTestBase):
    """Tests for the pipeline_overview view."""

    def setUp(self):
        super().setUp()
        self.url = reverse('ase-leads-pipeline-overview')

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users get 401."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Non-marketing users get 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bre_user_denied(self):
        """BRE users cannot access pipeline overview."""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access(self):
        """Admin users can access pipeline overview."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_access(self):
        """Marketing lead can access pipeline overview."""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pipeline_counts_correct(self):
        """Pipeline returns correct counts per status."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        pipeline = data['pipeline']
        self.assertEqual(pipeline['new']['count'], 1)
        self.assertEqual(pipeline['qualified']['count'], 1)
        self.assertEqual(pipeline['contacted']['count'], 1)
        self.assertEqual(pipeline['proposal_sent']['count'], 1)
        self.assertEqual(pipeline['won']['count'], 1)
        self.assertEqual(pipeline['lost']['count'], 1)

    def test_pipeline_total_value(self):
        """Pipeline returns total_value for each stage."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        pipeline = data['pipeline']
        # proposal_sent lead has estimated_project_value=50000
        self.assertEqual(pipeline['proposal_sent']['total_value'], 50000.0)
        # won lead has estimated_project_value=100000
        self.assertEqual(pipeline['won']['total_value'], 100000.0)

    def test_caching_works(self):
        """Results are cached."""
        self.client.force_authenticate(user=self.admin_user)

        response1 = self.client.get(self.url)
        data1 = response1.json()

        # Add a new lead
        ASELead.objects.create(
            company_name="Pipeline Cache Test",
            contact_person="Cache Test",
            phone="5558888888",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Should return cached data
        response2 = self.client.get(self.url)
        data2 = response2.json()
        self.assertEqual(data1, data2)


# ══════════════════════════════════════════════════════════════════════════════
# Conversion Rates Tests
# ══════════════════════════════════════════════════════════════════════════════

class ConversionRatesViewTest(AnalyticsViewsTestBase):
    """Tests for the conversion_rates view."""

    def setUp(self):
        super().setUp()
        self.url = reverse('ase-leads-conversion-rates')

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users get 401."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Non-marketing users get 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bre_user_denied(self):
        """BRE users cannot access conversion rates."""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_boe_user_denied(self):
        """BOE users cannot access conversion rates."""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users cannot access conversion rates."""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access(self):
        """Admin users can access conversion rates."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_access(self):
        """Marketing lead can access conversion rates."""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_conversion_rates_structure(self):
        """Response contains all expected conversion rate fields."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        self.assertIn('new_to_qualified', data)
        self.assertIn('qualified_to_contacted', data)
        self.assertIn('contacted_to_proposal', data)
        self.assertIn('proposal_to_won', data)
        self.assertIn('overall_conversion', data)
        self.assertIn('counts', data)
        self.assertIn('period', data)

    def test_conversion_rates_calculation(self):
        """Conversion rates are calculated correctly."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        data = response.json()

        # We have 6 leads created this month (new_leads count)
        counts = data['counts']
        self.assertGreater(counts['new'], 0)
        # overall_conversion = won / new * 100
        if counts['new'] > 0 and counts['won'] > 0:
            expected_overall = round((counts['won'] / counts['new']) * 100, 1)
            self.assertEqual(data['overall_conversion'], expected_overall)

    def test_period_filtering(self):
        """Period query param filters results."""
        self.client.force_authenticate(user=self.admin_user)

        # Default (month)
        response = self.client.get(self.url)
        data = response.json()
        self.assertEqual(data['period'], 'month')

        cache.clear()

        # Week
        response = self.client.get(self.url, {'period': 'week'})
        data = response.json()
        self.assertEqual(data['period'], 'week')

        cache.clear()

        # Quarter
        response = self.client.get(self.url, {'period': 'quarter'})
        data = response.json()
        self.assertEqual(data['period'], 'quarter')

    def test_caching_works(self):
        """Results are cached."""
        self.client.force_authenticate(user=self.admin_user)

        response1 = self.client.get(self.url)
        data1 = response1.json()

        # Add a new lead
        ASELead.objects.create(
            company_name="Conversion Cache Test",
            contact_person="Cache Test",
            phone="5557777777",
            industry="technology",
            status="new",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Should return cached data
        response2 = self.client.get(self.url)
        data2 = response2.json()
        self.assertEqual(data1, data2)

    def test_zero_division_handled(self):
        """Zero division is handled gracefully when no leads exist."""
        # Admin bypasses company/team checks, so use admin with other_company
        # which has no leads at all
        other_admin = User.objects.create_user(
            username="other_admin_conv",
            email="other_admin_conv@test.com",
            password="testpass123",
            role="admin",
            company=self.other_company,
        )

        self.client.force_authenticate(user=other_admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # All rates should be 0, not errors
        self.assertEqual(data['new_to_qualified'], 0)
        self.assertEqual(data['qualified_to_contacted'], 0)
        self.assertEqual(data['contacted_to_proposal'], 0)
        self.assertEqual(data['proposal_to_won'], 0)
        self.assertEqual(data['overall_conversion'], 0)
