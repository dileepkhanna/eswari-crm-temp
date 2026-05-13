"""
Unit tests for CRE proposal/meeting/deal stage action views.

Tests cover:
- send_proposal endpoint:
  - Authentication and permission checks
  - Role-based access (CRE, admin, marketing_lead allowed; BRE, BOE denied)
  - Status validation (must be contacted/nurturing)
  - Input validation (proposal_value must be valid decimal)
  - Successful proposal sending with all side effects verified
  - 404 for non-existent leads

- schedule_meeting endpoint:
  - Authentication and permission checks
  - Role-based access (CRE, admin, marketing_lead allowed; BRE, BOE denied)
  - Input validation (title required, meeting_date required and valid)
  - Successful meeting scheduling with all side effects verified
  - 404 for non-existent leads

- update_deal_stage endpoint:
  - Authentication and permission checks
  - Role-based access (CRE, admin, marketing_lead allowed; BRE, BOE denied)
  - Input validation (stage required, must be valid)
  - Valid stage transitions
  - Invalid stage transitions rejected
  - deal_closed_at set for won/lost
  - 404 for non-existent leads
"""

from decimal import Decimal

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


class SendProposalViewTest(TestCase):
    """Tests for the send_proposal view function"""

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

        # Create test lead in 'contacted' status (CRE's pipeline)
        self.contacted_lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="contacted",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'nurturing' status
        self.nurturing_lead = ASELead.objects.create(
            company_name="Nurturing Lead Co",
            contact_person="Jane Test",
            phone="2222222222",
            industry="healthcare",
            status="nurturing",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'new' status (not valid for proposal)
        self.new_lead = ASELead.objects.create(
            company_name="New Lead Co",
            contact_person="Bob Test",
            phone="3333333333",
            industry="finance",
            status="new",
            priority="low",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-send-proposal', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to send proposals"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_boe_user_denied(self):
        """BOE users should not be able to send proposals"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_cre_user_can_send_proposal(self):
        """CRE users should be able to send proposals"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'proposal_sent')

    def test_admin_can_send_proposal(self):
        """Admin users should be able to send proposals"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'proposal_sent')

    def test_marketing_lead_can_send_proposal(self):
        """Marketing Lead users should be able to send proposals"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'proposal_sent')

    # ------------------------------------------------------------------
    # Status Validation Tests
    # ------------------------------------------------------------------

    def test_contacted_status_allowed(self):
        """Lead in 'contacted' status should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_nurturing_status_allowed(self):
        """Lead in 'nurturing' status should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.nurturing_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_new_status_rejected(self):
        """Lead in 'new' status should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.new_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_proposal_sent_status_rejected(self):
        """Lead already in 'proposal_sent' status should be rejected"""
        self.contacted_lead.status = 'proposal_sent'
        self.contacted_lead.save()
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_invalid_proposal_value_rejected(self):
        """Invalid proposal_value should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'proposal_value': 'not_a_number'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_negative_proposal_value_rejected(self):
        """Negative proposal_value should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'proposal_value': -1000},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # 404 Tests
    # ------------------------------------------------------------------

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Proposal Sending Tests
    # ------------------------------------------------------------------

    def test_send_proposal_updates_status(self):
        """Sending a proposal should update lead status to 'proposal_sent'"""
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(self._get_url(self.contacted_lead.pk))
        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.status, 'proposal_sent')

    def test_send_proposal_sets_managed_by(self):
        """Sending a proposal should set managed_by to current user"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertIsNone(self.contacted_lead.managed_by)
        self.client.post(self._get_url(self.contacted_lead.pk))
        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.managed_by, self.cre_user)

    def test_send_proposal_does_not_overwrite_managed_by(self):
        """If managed_by is already set, it should not be overwritten"""
        self.contacted_lead.managed_by = self.marketing_lead_user
        self.contacted_lead.save()
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(self._get_url(self.contacted_lead.pk))
        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.managed_by, self.marketing_lead_user)

    def test_send_proposal_sets_proposal_sent_at(self):
        """Sending a proposal should set proposal_sent_at"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertIsNone(self.contacted_lead.proposal_sent_at)
        self.client.post(self._get_url(self.contacted_lead.pk))
        self.contacted_lead.refresh_from_db()
        self.assertIsNotNone(self.contacted_lead.proposal_sent_at)

    def test_send_proposal_updates_estimated_project_value(self):
        """Sending a proposal with proposal_value should update estimated_project_value"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'proposal_value': '500000.00'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.estimated_project_value, Decimal('500000.00'))

    def test_send_proposal_creates_activity(self):
        """Sending a proposal should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'notes': 'Sent comprehensive proposal'},
        )
        activity = ASELeadActivity.objects.filter(
            lead=self.contacted_lead,
            activity_type='status_change',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.cre_user)
        self.assertEqual(activity.title, 'Proposal Sent')

    def test_send_proposal_without_optional_fields(self):
        """Sending a proposal with no optional fields should succeed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ScheduleMeetingViewTest(TestCase):
    """Tests for the schedule_meeting view function"""

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

        # Create test lead in 'proposal_sent' status (CRE's pipeline)
        self.proposal_lead = ASELead.objects.create(
            company_name="Proposal Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="proposal_sent",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
            total_meetings_held=0,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-schedule-meeting', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.proposal_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to schedule meetings"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_boe_user_denied(self):
        """BOE users should not be able to schedule meetings"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_cre_user_can_schedule_meeting(self):
        """CRE users should be able to schedule meetings"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Demo meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'meeting')

    def test_admin_can_schedule_meeting(self):
        """Admin users should be able to schedule meetings"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Admin meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_marketing_lead_can_schedule_meeting(self):
        """Marketing Lead users should be able to schedule meetings"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Lead meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_title_required(self):
        """title is required"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_title_rejected(self):
        """Empty title should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': '   ', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_meeting_date_required(self):
        """meeting_date is required"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_invalid_meeting_date_rejected(self):
        """Invalid meeting_date should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting', 'meeting_date': 'not-a-date'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_meeting_attendees_must_be_list(self):
        """meeting_attendees must be a list"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {
                'title': 'Test meeting',
                'meeting_date': '2025-12-01T10:00:00Z',
                'meeting_attendees': 'not-a-list',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # 404 Tests
    # ------------------------------------------------------------------

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(99999),
            {'title': 'Test meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Meeting Scheduling Tests
    # ------------------------------------------------------------------

    def test_schedule_meeting_creates_activity(self):
        """Scheduling a meeting should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {
                'title': 'Proposal Review Meeting',
                'meeting_date': '2025-12-01T10:00:00Z',
                'description': 'Review proposal with client',
                'meeting_attendees': ['John', 'Jane'],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activity = ASELeadActivity.objects.filter(
            lead=self.proposal_lead,
            activity_type='meeting',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.cre_user)
        self.assertEqual(activity.title, 'Proposal Review Meeting')
        self.assertEqual(activity.description, 'Review proposal with client')
        self.assertEqual(activity.meeting_attendees, ['John', 'Jane'])
        self.assertIsNotNone(activity.meeting_date)

    def test_schedule_meeting_increments_total_meetings_held(self):
        """Scheduling a meeting should increment lead.total_meetings_held"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertEqual(self.proposal_lead.total_meetings_held, 0)

        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'First meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.proposal_lead.refresh_from_db()
        self.assertEqual(self.proposal_lead.total_meetings_held, 1)

        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Second meeting', 'meeting_date': '2025-12-02T10:00:00Z'},
        )
        self.proposal_lead.refresh_from_db()
        self.assertEqual(self.proposal_lead.total_meetings_held, 2)

    def test_schedule_meeting_updates_last_engagement_type(self):
        """Scheduling a meeting should set last_engagement_type to 'meeting'"""
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.proposal_lead.refresh_from_db()
        self.assertEqual(self.proposal_lead.last_engagement_type, 'meeting')

    def test_schedule_meeting_updates_last_engagement_date(self):
        """Scheduling a meeting should update last_engagement_date"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertIsNone(self.proposal_lead.last_engagement_date)

        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Test meeting', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.proposal_lead.refresh_from_db()
        self.assertIsNotNone(self.proposal_lead.last_engagement_date)

    def test_schedule_meeting_without_optional_fields(self):
        """Scheduling a meeting with only title and meeting_date should succeed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'title': 'Quick sync', 'meeting_date': '2025-12-01T10:00:00Z'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Quick sync')


class UpdateDealStageViewTest(TestCase):
    """Tests for the update_deal_stage view function"""

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

        # Create test lead in 'proposal_sent' status
        self.proposal_lead = ASELead.objects.create(
            company_name="Proposal Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="proposal_sent",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'contacted' status
        self.contacted_lead = ASELead.objects.create(
            company_name="Contacted Lead Co",
            contact_person="Jane Test",
            phone="2222222222",
            industry="healthcare",
            status="contacted",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'negotiating' status
        self.negotiating_lead = ASELead.objects.create(
            company_name="Negotiating Lead Co",
            contact_person="Bob Test",
            phone="3333333333",
            industry="finance",
            status="negotiating",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-update-stage', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.proposal_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to update deal stages"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_boe_user_denied(self):
        """BOE users should not be able to update deal stages"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_cre_user_can_update_stage(self):
        """CRE users should be able to update deal stages"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'negotiating')

    def test_admin_can_update_stage(self):
        """Admin users should be able to update deal stages"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_update_stage(self):
        """Marketing Lead users should be able to update deal stages"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_stage_required(self):
        """stage is required"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(self._get_url(self.proposal_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_stage_rejected(self):
        """Empty stage should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': '   '},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_stage_rejected(self):
        """Invalid stage value should be rejected"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'invalid_stage'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    # ------------------------------------------------------------------
    # Stage Transition Validation Tests
    # ------------------------------------------------------------------

    def test_valid_transition_contacted_to_proposal_sent(self):
        """contacted -> proposal_sent should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'stage': 'proposal_sent'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.status, 'proposal_sent')

    def test_valid_transition_proposal_sent_to_negotiating(self):
        """proposal_sent -> negotiating should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.proposal_lead.refresh_from_db()
        self.assertEqual(self.proposal_lead.status, 'negotiating')

    def test_valid_transition_negotiating_to_won(self):
        """negotiating -> won should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.negotiating_lead.pk),
            {'stage': 'won'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.negotiating_lead.refresh_from_db()
        self.assertEqual(self.negotiating_lead.status, 'won')

    def test_valid_transition_negotiating_to_lost(self):
        """negotiating -> lost should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.negotiating_lead.pk),
            {'stage': 'lost'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.negotiating_lead.refresh_from_db()
        self.assertEqual(self.negotiating_lead.status, 'lost')

    def test_valid_transition_proposal_sent_to_won(self):
        """proposal_sent -> won should be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'won'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.proposal_lead.refresh_from_db()
        self.assertEqual(self.proposal_lead.status, 'won')

    def test_invalid_transition_contacted_to_negotiating(self):
        """contacted -> negotiating should NOT be allowed (must go through proposal_sent)"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_invalid_transition_contacted_to_won(self):
        """contacted -> won should NOT be allowed"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'stage': 'won'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # 404 Tests
    # ------------------------------------------------------------------

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(99999),
            {'stage': 'negotiating'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Side Effects Tests
    # ------------------------------------------------------------------

    def test_deal_closed_at_set_for_won(self):
        """deal_closed_at should be set when stage is 'won'"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertIsNone(self.negotiating_lead.deal_closed_at)
        self.client.post(
            self._get_url(self.negotiating_lead.pk),
            {'stage': 'won'},
        )
        self.negotiating_lead.refresh_from_db()
        self.assertIsNotNone(self.negotiating_lead.deal_closed_at)

    def test_deal_closed_at_set_for_lost(self):
        """deal_closed_at should be set when stage is 'lost'"""
        self.client.force_authenticate(user=self.cre_user)
        self.assertIsNone(self.negotiating_lead.deal_closed_at)
        self.client.post(
            self._get_url(self.negotiating_lead.pk),
            {'stage': 'lost'},
        )
        self.negotiating_lead.refresh_from_db()
        self.assertIsNotNone(self.negotiating_lead.deal_closed_at)

    def test_deal_closed_at_not_set_for_negotiating(self):
        """deal_closed_at should NOT be set when stage is 'negotiating'"""
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        self.proposal_lead.refresh_from_db()
        self.assertIsNone(self.proposal_lead.deal_closed_at)

    def test_update_stage_creates_activity(self):
        """Updating deal stage should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.cre_user)
        self.client.post(
            self._get_url(self.proposal_lead.pk),
            {'stage': 'negotiating'},
        )
        activity = ASELeadActivity.objects.filter(
            lead=self.proposal_lead,
            activity_type='status_change',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.cre_user)
        self.assertIn('proposal_sent', activity.title)
        self.assertIn('negotiating', activity.title)
