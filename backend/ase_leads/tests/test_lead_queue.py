"""
Unit tests for my_lead_queue view function.

Tests cover:
- Authentication and permission checks
- Role-based filtering (admin, marketing_lead, BRE, BOE, CRE)
- Query parameter filtering (status, priority, industry, engagement_level, search)
- Ordering/sorting functionality
- Pagination
- Company scoping
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Company
from teams.models import Team
from ase_leads.models import ASELead

User = get_user_model()


class MyLeadQueueViewTest(TestCase):
    """Tests for the my_lead_queue view function"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.url = reverse('ase-leads-my-queue')

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

        # Create test leads with different statuses
        self.lead_new = ASELead.objects.create(
            company_name="New Lead Co",
            contact_person="John New",
            phone="1111111111",
            industry="technology",
            status="new",
            priority="high",
            engagement_level="cold",
            lead_score=50,
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.lead_qualified = ASELead.objects.create(
            company_name="Qualified Lead Co",
            contact_person="Jane Qualified",
            phone="2222222222",
            industry="healthcare",
            status="qualified",
            priority="medium",
            engagement_level="warm",
            lead_score=70,
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.lead_contacted = ASELead.objects.create(
            company_name="Contacted Lead Co",
            contact_person="Bob Contacted",
            phone="3333333333",
            industry="finance",
            status="contacted",
            priority="high",
            engagement_level="hot",
            lead_score=80,
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.lead_nurturing = ASELead.objects.create(
            company_name="Nurturing Lead Co",
            contact_person="Alice Nurturing",
            phone="4444444444",
            industry="technology",
            status="nurturing",
            priority="low",
            engagement_level="warm",
            lead_score=60,
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.lead_proposal_sent = ASELead.objects.create(
            company_name="Proposal Lead Co",
            contact_person="Charlie Proposal",
            phone="5555555555",
            industry="retail",
            status="proposal_sent",
            priority="urgent",
            engagement_level="very_hot",
            lead_score=90,
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.lead_negotiating = ASELead.objects.create(
            company_name="Negotiating Lead Co",
            contact_person="David Negotiating",
            phone="6666666666",
            industry="manufacturing",
            status="negotiating",
            priority="high",
            engagement_level="hot",
            lead_score=85,
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create a lead for another company
        self.other_company_lead = ASELead.objects.create(
            company_name="Other Company Lead",
            contact_person="Other Person",
            phone="9999999999",
            industry="technology",
            status="new",
            priority="high",
            company=self.other_company,
            created_by=self.admin_user,
        )

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Users without marketing team should be denied"""
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

    def test_non_ase_company_user_denied(self):
        """Users from non-ASE companies should be denied"""
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

    # ------------------------------------------------------------------
    # Admin Access Tests
    # ------------------------------------------------------------------

    def test_admin_sees_all_company_leads(self):
        """Admin should see all leads from their company"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Admin should see all ASE company leads (6 total)
        self.assertEqual(response.data['count'], 6)
        
        # Should not see other company's lead
        lead_ids = [lead['id'] for lead in response.data['results']]
        self.assertNotIn(self.other_company_lead.id, lead_ids)

    # ------------------------------------------------------------------
    # Role-Based Filtering Tests
    # ------------------------------------------------------------------

    def test_bre_sees_only_new_and_qualified_leads(self):
        """BRE should only see leads with status 'new' or 'qualified'"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # BRE should see 2 leads (new and qualified)
        self.assertEqual(response.data['count'], 2)
        
        lead_ids = [lead['id'] for lead in response.data['results']]
        self.assertIn(self.lead_new.id, lead_ids)
        self.assertIn(self.lead_qualified.id, lead_ids)
        self.assertNotIn(self.lead_contacted.id, lead_ids)
        self.assertNotIn(self.lead_proposal_sent.id, lead_ids)

    def test_boe_sees_qualified_contacted_nurturing_leads(self):
        """BOE should see leads with status 'qualified', 'contacted', or 'nurturing'"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # BOE should see 3 leads (qualified, contacted, nurturing)
        self.assertEqual(response.data['count'], 3)
        
        lead_ids = [lead['id'] for lead in response.data['results']]
        self.assertIn(self.lead_qualified.id, lead_ids)
        self.assertIn(self.lead_contacted.id, lead_ids)
        self.assertIn(self.lead_nurturing.id, lead_ids)
        self.assertNotIn(self.lead_new.id, lead_ids)
        self.assertNotIn(self.lead_proposal_sent.id, lead_ids)

    def test_cre_sees_contacted_proposal_negotiating_leads(self):
        """CRE should see leads with status 'contacted', 'proposal_sent', or 'negotiating'"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # CRE should see 3 leads (contacted, proposal_sent, negotiating)
        self.assertEqual(response.data['count'], 3)
        
        lead_ids = [lead['id'] for lead in response.data['results']]
        self.assertIn(self.lead_contacted.id, lead_ids)
        self.assertIn(self.lead_proposal_sent.id, lead_ids)
        self.assertIn(self.lead_negotiating.id, lead_ids)
        self.assertNotIn(self.lead_new.id, lead_ids)
        self.assertNotIn(self.lead_qualified.id, lead_ids)

    def test_marketing_lead_sees_all_leads(self):
        """Marketing Lead should see all leads (full funnel visibility)"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Marketing Lead should see all 6 ASE company leads
        self.assertEqual(response.data['count'], 6)

    # ------------------------------------------------------------------
    # Filtering Tests
    # ------------------------------------------------------------------

    def test_filter_by_status(self):
        """Test filtering by status parameter"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'status': 'new'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'new')

    def test_filter_by_priority(self):
        """Test filtering by priority parameter"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'priority': 'high'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return leads with high priority
        for lead in response.data['results']:
            self.assertEqual(lead['priority'], 'high')

    def test_filter_by_industry(self):
        """Test filtering by industry parameter"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'industry': 'technology'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return 2 technology leads
        self.assertEqual(response.data['count'], 2)
        for lead in response.data['results']:
            self.assertEqual(lead['industry'], 'technology')

    def test_filter_by_engagement_level(self):
        """Test filtering by engagement_level parameter"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'engagement_level': 'hot'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return leads with hot engagement level
        for lead in response.data['results']:
            self.assertEqual(lead['engagement_level'], 'hot')

    def test_search_by_company_name(self):
        """Test search by company name"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'search': 'Qualified'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should find the "Qualified Lead Co"
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['company_name'], 'Qualified Lead Co')

    def test_search_by_contact_person(self):
        """Test search by contact person"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'search': 'Bob'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should find "Bob Contacted"
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['contact_person'], 'Bob Contacted')

    def test_search_by_phone(self):
        """Test search by phone number"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'search': '5555555555'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should find the lead with phone 5555555555
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['phone'], '5555555555')

    def test_combined_filters(self):
        """Test combining multiple filters"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {
            'status': 'contacted',
            'priority': 'high',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should find the contacted lead with high priority
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'contacted')
        self.assertEqual(response.data['results'][0]['priority'], 'high')

    # ------------------------------------------------------------------
    # Ordering/Sorting Tests
    # ------------------------------------------------------------------

    def test_default_ordering_by_created_at_desc(self):
        """Test default ordering is by created_at descending"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Results should be ordered by created_at descending (newest first)
        results = response.data['results']
        self.assertGreaterEqual(len(results), 2)
        # The last created lead should be first
        self.assertEqual(results[0]['id'], self.lead_negotiating.id)

    def test_ordering_by_priority(self):
        """Test ordering by priority"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'ordering': 'priority'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Results should be ordered by priority
        results = response.data['results']
        self.assertGreater(len(results), 0)

    def test_ordering_by_lead_score_desc(self):
        """Test ordering by lead_score descending"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'ordering': '-lead_score'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Results should be ordered by lead_score descending
        results = response.data['results']
        if len(results) >= 2:
            # First lead should have higher or equal score than second
            self.assertGreaterEqual(results[0]['lead_score'], results[1]['lead_score'])

    def test_ordering_by_company_name(self):
        """Test ordering by company_name"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'ordering': 'company_name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Results should be ordered alphabetically by company_name
        results = response.data['results']
        if len(results) >= 2:
            self.assertLessEqual(results[0]['company_name'], results[1]['company_name'])

    def test_invalid_ordering_falls_back_to_default(self):
        """Test that invalid ordering parameter falls back to default"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'ordering': 'invalid_field'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should still return results with default ordering
        self.assertGreater(response.data['count'], 0)

    # ------------------------------------------------------------------
    # Pagination Tests
    # ------------------------------------------------------------------

    def test_pagination_default_page_size(self):
        """Test default pagination page size"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Response should have pagination fields
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)

    def test_pagination_custom_page_size(self):
        """Test custom page size parameter"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'page_size': 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return only 2 results per page
        self.assertLessEqual(len(response.data['results']), 2)
        
        # Total count should still be 6
        self.assertEqual(response.data['count'], 6)

    def test_pagination_second_page(self):
        """Test accessing second page"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'page': 2, 'page_size': 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return results from second page
        self.assertGreater(len(response.data['results']), 0)

    # ------------------------------------------------------------------
    # Response Structure Tests
    # ------------------------------------------------------------------

    def test_response_includes_required_fields(self):
        """Test that response includes all required fields"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check first result has required fields
        if len(response.data['results']) > 0:
            lead = response.data['results'][0]
            required_fields = [
                'id', 'company_name', 'contact_person', 'phone', 'status',
                'priority', 'industry', 'engagement_level', 'lead_score',
                'created_at', 'assigned_to_name', 'created_by_name',
            ]
            for field in required_fields:
                self.assertIn(field, lead)

    def test_response_includes_computed_fields(self):
        """Test that response includes computed fields"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check first result has computed fields
        if len(response.data['results']) > 0:
            lead = response.data['results'][0]
            computed_fields = [
                'contact_display', 'days_since_created', 'days_in_current_status',
                'is_overdue', 'engagement_score', 'status_display',
            ]
            for field in computed_fields:
                self.assertIn(field, lead)

    # ------------------------------------------------------------------
    # Edge Cases
    # ------------------------------------------------------------------

    def test_empty_result_set(self):
        """Test when no leads match the filters"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.get(self.url, {'status': 'won'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return empty results
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(len(response.data['results']), 0)

    def test_role_based_filter_with_additional_status_filter(self):
        """Test that role-based filtering works with additional status filter"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url, {'status': 'new'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # BRE with status=new filter should only see new leads
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'new')

    def test_role_based_filter_excludes_out_of_scope_status(self):
        """Test that role-based filtering excludes out-of-scope status even if requested"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.get(self.url, {'status': 'proposal_sent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # BRE cannot see proposal_sent leads, so result should be empty
        self.assertEqual(response.data['count'], 0)
