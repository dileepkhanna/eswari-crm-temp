"""
Unit tests for BOE call/email logging action views.

Tests cover:
- log_call endpoint:
  - Authentication and permission checks
  - Role-based access (BOE, admin, marketing_lead allowed; BRE, CRE denied)
  - Input validation (title required, call_duration_minutes non-negative)
  - Successful call logging (activity created, metrics updated, engagement updated)
  - 404 for non-existent leads

- log_email endpoint:
  - Authentication and permission checks
  - Role-based access (BOE, admin, marketing_lead allowed; BRE, CRE denied)
  - Input validation (title required, email_subject required)
  - Successful email logging (activity created, metrics updated, engagement updated)
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


class LogCallViewTest(TestCase):
    """Tests for the log_call view function"""

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

        # Create test lead in 'qualified' status (BOE's pipeline)
        self.qualified_lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="qualified",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
            total_calls_made=0,
            total_emails_sent=0,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-log-call', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.qualified_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to log calls"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to log calls"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_boe_user_can_log_call(self):
        """BOE users should be able to log calls"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Initial outreach call', 'call_duration_minutes': 5},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'call')

    def test_admin_can_log_call(self):
        """Admin users should be able to log calls"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Admin call', 'call_duration_minutes': 10},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'call')

    def test_marketing_lead_can_log_call(self):
        """Marketing Lead users should be able to log calls"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Lead call', 'call_duration_minutes': 15},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'call')

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_title_required(self):
        """title is required"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'call_duration_minutes': 5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_title_rejected(self):
        """Empty title should be rejected"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': '   '},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_call_duration_must_be_integer(self):
        """call_duration_minutes must be a valid integer"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call', 'call_duration_minutes': 'not_a_number'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_call_duration_cannot_be_negative(self):
        """call_duration_minutes cannot be negative"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call', 'call_duration_minutes': -5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_call_duration_zero_accepted(self):
        """call_duration_minutes of 0 should be accepted"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Quick call', 'call_duration_minutes': 0},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # 404 Tests
    # ------------------------------------------------------------------

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(99999),
            {'title': 'Test call'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Call Logging Tests
    # ------------------------------------------------------------------

    def test_log_call_creates_activity(self):
        """Logging a call should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {
                'title': 'Follow-up call',
                'description': 'Discussed project requirements',
                'call_duration_minutes': 15,
                'call_outcome': 'answered',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activity = ASELeadActivity.objects.filter(
            lead=self.qualified_lead,
            activity_type='call',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.boe_user)
        self.assertEqual(activity.title, 'Follow-up call')
        self.assertEqual(activity.description, 'Discussed project requirements')
        self.assertEqual(activity.call_duration_minutes, 15)
        self.assertEqual(activity.call_outcome, 'answered')

    def test_log_call_increments_total_calls_made(self):
        """Logging a call should increment lead.total_calls_made"""
        self.client.force_authenticate(user=self.boe_user)
        self.assertEqual(self.qualified_lead.total_calls_made, 0)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'First call'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.total_calls_made, 1)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Second call'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.total_calls_made, 2)

    def test_log_call_updates_last_engagement_type(self):
        """Logging a call should set last_engagement_type to 'call'"""
        self.client.force_authenticate(user=self.boe_user)
        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.last_engagement_type, 'call')

    def test_log_call_updates_last_engagement_date(self):
        """Logging a call should update last_engagement_date"""
        self.client.force_authenticate(user=self.boe_user)
        self.assertIsNone(self.qualified_lead.last_engagement_date)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test call'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertIsNotNone(self.qualified_lead.last_engagement_date)

    def test_log_call_with_followup(self):
        """Logging a call with follow-up fields should work"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {
                'title': 'Call with followup',
                'requires_followup': True,
                'followup_date': '2025-12-01T10:00:00Z',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activity = ASELeadActivity.objects.filter(
            lead=self.qualified_lead,
            activity_type='call',
        ).first()
        self.assertTrue(activity.requires_followup)
        self.assertIsNotNone(activity.followup_date)

    def test_log_call_without_optional_fields(self):
        """Logging a call with only title should succeed"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Quick call'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Quick call')
        self.assertIsNone(response.data['call_duration_minutes'])
        self.assertIsNone(response.data['call_outcome'])


class LogEmailViewTest(TestCase):
    """Tests for the log_email view function"""

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

        # Create test lead in 'qualified' status (BOE's pipeline)
        self.qualified_lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            industry="technology",
            status="qualified",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
            total_calls_made=0,
            total_emails_sent=0,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-log-email', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.qualified_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to log emails"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email', 'email_subject': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to log emails"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email', 'email_subject': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_boe_user_can_log_email(self):
        """BOE users should be able to log emails"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Initial outreach email', 'email_subject': 'Introduction to ASE Services'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'email')

    def test_admin_can_log_email(self):
        """Admin users should be able to log emails"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Admin email', 'email_subject': 'Follow up'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'email')

    def test_marketing_lead_can_log_email(self):
        """Marketing Lead users should be able to log emails"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Lead email', 'email_subject': 'Partnership Opportunity'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'email')

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_title_required(self):
        """title is required"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'email_subject': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_title_rejected(self):
        """Empty title should be rejected"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': '   ', 'email_subject': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_subject_required(self):
        """email_subject is required"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_email_subject_rejected(self):
        """Empty email_subject should be rejected"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email', 'email_subject': '   '},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # 404 Tests
    # ------------------------------------------------------------------

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(99999),
            {'title': 'Test email', 'email_subject': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Email Logging Tests
    # ------------------------------------------------------------------

    def test_log_email_creates_activity(self):
        """Logging an email should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {
                'title': 'Service introduction email',
                'description': 'Sent overview of our digital marketing services',
                'email_subject': 'ASE Technologies - Digital Marketing Services',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activity = ASELeadActivity.objects.filter(
            lead=self.qualified_lead,
            activity_type='email',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.boe_user)
        self.assertEqual(activity.title, 'Service introduction email')
        self.assertEqual(activity.description, 'Sent overview of our digital marketing services')
        self.assertEqual(activity.email_subject, 'ASE Technologies - Digital Marketing Services')

    def test_log_email_increments_total_emails_sent(self):
        """Logging an email should increment lead.total_emails_sent"""
        self.client.force_authenticate(user=self.boe_user)
        self.assertEqual(self.qualified_lead.total_emails_sent, 0)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'First email', 'email_subject': 'Hello'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.total_emails_sent, 1)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Second email', 'email_subject': 'Follow up'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.total_emails_sent, 2)

    def test_log_email_updates_last_engagement_type(self):
        """Logging an email should set last_engagement_type to 'email'"""
        self.client.force_authenticate(user=self.boe_user)
        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email', 'email_subject': 'Hello'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.last_engagement_type, 'email')

    def test_log_email_updates_last_engagement_date(self):
        """Logging an email should update last_engagement_date"""
        self.client.force_authenticate(user=self.boe_user)
        self.assertIsNone(self.qualified_lead.last_engagement_date)

        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Test email', 'email_subject': 'Hello'},
        )
        self.qualified_lead.refresh_from_db()
        self.assertIsNotNone(self.qualified_lead.last_engagement_date)

    def test_log_email_with_followup(self):
        """Logging an email with follow-up fields should work"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {
                'title': 'Email with followup',
                'email_subject': 'Proposal Details',
                'requires_followup': True,
                'followup_date': '2025-12-01T10:00:00Z',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activity = ASELeadActivity.objects.filter(
            lead=self.qualified_lead,
            activity_type='email',
        ).first()
        self.assertTrue(activity.requires_followup)
        self.assertIsNotNone(activity.followup_date)

    def test_log_email_without_optional_fields(self):
        """Logging an email with only title and email_subject should succeed"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'title': 'Quick email', 'email_subject': 'Brief intro'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Quick email')
        self.assertEqual(response.data['email_subject'], 'Brief intro')
