"""
Unit tests for BRE qualification action views.

Tests cover:
- qualify_lead endpoint:
  - Authentication and permission checks
  - Role-based access (BRE, admin, marketing_lead allowed; BOE, CRE denied)
  - Input validation (lead_score required, 0-100 range)
  - Status validation (only 'new' leads can be qualified)
  - Successful qualification (status change, timestamps, activity log)
  - 404 for non-existent leads

- disqualify_lead endpoint:
  - Authentication and permission checks
  - Role-based access (BRE, admin, marketing_lead allowed; BOE, CRE denied)
  - Input validation (disqualification_reason required)
  - Status validation (only 'new' leads can be disqualified)
  - Successful disqualification (status change, timestamps, activity log)
  - 404 for non-existent leads
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Company
from teams.models import Team
from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity

User = get_user_model()


class QualifyLeadViewTest(TestCase):
    """Tests for the qualify_lead view function"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create companies
        self.ase_company = Company.objects.create(
            name="ASE Technologies",
            code="ASE",
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

        # Create test lead in 'new' status
        self.new_lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="new",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'qualified' status (not qualifiable)
        self.qualified_lead = ASELead.objects.create(
            company_name="Already Qualified Co",
            contact_person="Jane Qualified",
            phone="2222222222",
            industry="healthcare",
            status="qualified",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-qualify', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.new_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_boe_user_denied(self):
        """BOE users should not be able to qualify leads"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to qualify leads"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_bre_user_can_qualify(self):
        """BRE users should be able to qualify leads"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75, 'qualification_notes': 'Good prospect'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'qualified')

    def test_admin_can_qualify(self):
        """Admin users should be able to qualify leads"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 80},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'qualified')

    def test_marketing_lead_can_qualify(self):
        """Marketing Lead users should be able to qualify leads"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 85},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'qualified')

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_lead_score_required(self):
        """lead_score is required"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'qualification_notes': 'Some notes'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_lead_score_must_be_integer(self):
        """lead_score must be a valid integer"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 'not_a_number'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_lead_score_below_zero_rejected(self):
        """lead_score below 0 should be rejected"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': -5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lead_score_above_100_rejected(self):
        """lead_score above 100 should be rejected"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 150},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lead_score_boundary_zero_accepted(self):
        """lead_score of 0 should be accepted"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 0},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lead_score'], 0)

    def test_lead_score_boundary_100_accepted(self):
        """lead_score of 100 should be accepted"""
        # Need a fresh new lead since the previous test qualified self.new_lead
        fresh_lead = ASELead.objects.create(
            company_name="Fresh Lead Co",
            contact_person="Fresh Person",
            phone="7777777777",
            industry="technology",
            status="new",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(fresh_lead.pk),
            {'lead_score': 100},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lead_score'], 100)

    # ------------------------------------------------------------------
    # Status Validation Tests
    # ------------------------------------------------------------------

    def test_cannot_qualify_non_new_lead(self):
        """Only leads in 'new' status can be qualified"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'lead_score': 75},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(99999),
            {'lead_score': 75},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Qualification Tests
    # ------------------------------------------------------------------

    def test_qualify_updates_status(self):
        """Qualifying a lead should update its status to 'qualified'"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75, 'qualification_notes': 'Strong prospect'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.status, 'qualified')

    def test_qualify_sets_researched_by(self):
        """Qualifying a lead should set researched_by to current user"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75},
        )

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.researched_by, self.bre_user)

    def test_qualify_sets_research_completed_at(self):
        """Qualifying a lead should set research_completed_at"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75},
        )

        self.new_lead.refresh_from_db()
        self.assertIsNotNone(self.new_lead.research_completed_at)

    def test_qualify_sets_lead_score(self):
        """Qualifying a lead should set the lead_score"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 82},
        )

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.lead_score, 82)

    def test_qualify_sets_qualification_notes(self):
        """Qualifying a lead should set qualification_notes when provided"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75, 'qualification_notes': 'Excellent fit for our services'},
        )

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.qualification_notes, 'Excellent fit for our services')

    def test_qualify_creates_activity_log(self):
        """Qualifying a lead should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 75},
        )

        activity = ASELeadActivity.objects.filter(
            lead=self.new_lead,
            activity_type='status_change',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.bre_user)
        self.assertEqual(activity.title, 'Lead Qualified')
        self.assertEqual(activity.outcome, 'qualified')

    def test_qualify_without_notes(self):
        """Qualifying without qualification_notes should still succeed"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'lead_score': 60},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'qualified')


class DisqualifyLeadViewTest(TestCase):
    """Tests for the disqualify_lead view function"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create companies
        self.ase_company = Company.objects.create(
            name="ASE Technologies",
            code="ASE",
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

        # Create test lead in 'new' status
        self.new_lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="new",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'contacted' status (not disqualifiable)
        self.contacted_lead = ASELead.objects.create(
            company_name="Contacted Lead Co",
            contact_person="Jane Contacted",
            phone="2222222222",
            industry="healthcare",
            status="contacted",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-disqualify', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.new_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_boe_user_denied(self):
        """BOE users should not be able to disqualify leads"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to disqualify leads"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_bre_user_can_disqualify(self):
        """BRE users should be able to disqualify leads"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Company too small'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'lost')

    def test_admin_can_disqualify(self):
        """Admin users should be able to disqualify leads"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Duplicate entry'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'lost')

    def test_marketing_lead_can_disqualify(self):
        """Marketing Lead users should be able to disqualify leads"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Budget mismatch'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'lost')

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_disqualification_reason_required(self):
        """disqualification_reason is required"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_disqualification_reason_rejected(self):
        """Empty disqualification_reason should be rejected"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': '   '},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Status Validation Tests
    # ------------------------------------------------------------------

    def test_cannot_disqualify_non_new_lead(self):
        """Only leads in 'new' status can be disqualified"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(99999),
            {'disqualification_reason': 'Not a fit'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Disqualification Tests
    # ------------------------------------------------------------------

    def test_disqualify_updates_status(self):
        """Disqualifying a lead should update its status to 'lost'"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Company too small'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.status, 'lost')

    def test_disqualify_sets_researched_by(self):
        """Disqualifying a lead should set researched_by to current user"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.researched_by, self.bre_user)

    def test_disqualify_sets_research_completed_at(self):
        """Disqualifying a lead should set research_completed_at"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )

        self.new_lead.refresh_from_db()
        self.assertIsNotNone(self.new_lead.research_completed_at)

    def test_disqualify_sets_disqualification_reason(self):
        """Disqualifying a lead should set the disqualification_reason"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Budget too low for our services'},
        )

        self.new_lead.refresh_from_db()
        self.assertEqual(self.new_lead.disqualification_reason, 'Budget too low for our services')

    def test_disqualify_creates_activity_log(self):
        """Disqualifying a lead should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.new_lead.pk),
            {'disqualification_reason': 'Not a fit'},
        )

        activity = ASELeadActivity.objects.filter(
            lead=self.new_lead,
            activity_type='status_change',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.bre_user)
        self.assertEqual(activity.title, 'Lead Disqualified')
        self.assertEqual(activity.outcome, 'disqualified')
