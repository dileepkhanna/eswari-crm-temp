"""
Unit tests for Lead Assignment action views.

Tests cover:
- assign_to_boe endpoint:
  - Authentication and permission checks
  - Role-based access (BRE, admin, marketing_lead allowed; BOE, CRE denied)
  - Input validation (user_id required, target user must exist, target must be BOE)
  - Status validation (only 'qualified' leads can be assigned to BOE)
  - Successful assignment with all side effects verified
  - 404 for non-existent leads

- assign_to_cre endpoint:
  - Authentication and permission checks
  - Role-based access (BOE, admin, marketing_lead allowed; BRE, CRE denied)
  - Input validation (user_id required, target user must exist, target must be CRE)
  - Status validation (only 'contacted' or 'nurturing' leads can be assigned to CRE)
  - Successful assignment with all side effects verified
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


class AssignToBOEViewTest(TestCase):
    """Tests for the assign_to_boe view function"""

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
            first_name="Bob",
            last_name="Outreach",
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

        # Create test lead in 'qualified' status
        self.qualified_lead = ASELead.objects.create(
            company_name="Qualified Lead Co",
            contact_person="John Qualified",
            phone="1111111111",
            industry="technology",
            status="qualified",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'new' status (not assignable to BOE)
        self.new_lead = ASELead.objects.create(
            company_name="New Lead Co",
            contact_person="Jane New",
            phone="2222222222",
            industry="healthcare",
            status="new",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'contacted' status (not assignable to BOE)
        self.contacted_lead = ASELead.objects.create(
            company_name="Contacted Lead Co",
            contact_person="Jim Contacted",
            phone="3333333333",
            industry="finance",
            status="contacted",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-assign-to-boe', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.qualified_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_boe_user_denied(self):
        """BOE users should not be able to assign leads to BOE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to assign leads to BOE"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_bre_user_can_assign_to_boe(self):
        """BRE users should be able to assign leads to BOE"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_assign_to_boe(self):
        """Admin users should be able to assign leads to BOE"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_assign_to_boe(self):
        """Marketing Lead users should be able to assign leads to BOE"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_user_id_required(self):
        """user_id is required"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('user_id', response.data['error'])

    def test_user_id_must_be_integer(self):
        """user_id must be a valid integer"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': 'not_a_number'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_target_user_must_exist(self):
        """Target user must exist"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': 99999},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('not found', response.data['error'])

    def test_target_user_must_be_boe(self):
        """Target user must be a BOE team member"""
        self.client.force_authenticate(user=self.bre_user)
        # Try to assign to a CRE user
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('BOE', response.data['error'])

    # ------------------------------------------------------------------
    # Status Validation Tests
    # ------------------------------------------------------------------

    def test_cannot_assign_new_lead_to_boe(self):
        """Only leads in 'qualified' status can be assigned to BOE"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cannot_assign_contacted_lead_to_boe(self):
        """Leads in 'contacted' status cannot be assigned to BOE"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(99999),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Assignment Tests
    # ------------------------------------------------------------------

    def test_assign_sets_contacted_by(self):
        """Assigning to BOE should set contacted_by to the target user"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )

        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.contacted_by, self.boe_user)

    def test_assign_sets_assigned_to(self):
        """Assigning to BOE should set assigned_to to the target user"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )

        self.qualified_lead.refresh_from_db()
        self.assertEqual(self.qualified_lead.assigned_to, self.boe_user)

    def test_assign_creates_activity_log(self):
        """Assigning to BOE should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.bre_user)
        self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )

        activity = ASELeadActivity.objects.filter(
            lead=self.qualified_lead,
            activity_type='assignment',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.bre_user)
        self.assertEqual(activity.title, 'Assigned to BOE')
        self.assertEqual(activity.outcome, 'assigned_to_boe')

    def test_assign_returns_updated_lead_data(self):
        """Assigning to BOE should return the updated lead data"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.boe_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['assigned_to'], self.boe_user.pk)
        self.assertEqual(response.data['contacted_by'], self.boe_user.pk)


class AssignToCREViewTest(TestCase):
    """Tests for the assign_to_cre view function"""

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
            first_name="Claire",
            last_name="Relations",
        )
        self.marketing_lead_user = User.objects.create_user(
            username="marketing_lead",
            email="lead@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.marketing_lead_team,
        )

        # Create test lead in 'contacted' status
        self.contacted_lead = ASELead.objects.create(
            company_name="Contacted Lead Co",
            contact_person="John Contacted",
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
            contact_person="Jane Nurturing",
            phone="2222222222",
            industry="healthcare",
            status="nurturing",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'qualified' status (not assignable to CRE)
        self.qualified_lead = ASELead.objects.create(
            company_name="Qualified Lead Co",
            contact_person="Jim Qualified",
            phone="3333333333",
            industry="finance",
            status="qualified",
            priority="medium",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create test lead in 'new' status (not assignable to CRE)
        self.new_lead = ASELead.objects.create(
            company_name="New Lead Co",
            contact_person="Jack New",
            phone="4444444444",
            industry="retail",
            status="new",
            priority="low",
            company=self.ase_company,
            created_by=self.admin_user,
        )

    def _get_url(self, pk):
        return reverse('ase-leads-assign-to-cre', kwargs={'pk': pk})

    # ------------------------------------------------------------------
    # Authentication and Permission Tests
    # ------------------------------------------------------------------

    def test_unauthenticated_access_denied(self):
        """Unauthenticated users should be denied access"""
        response = self.client.post(self._get_url(self.contacted_lead.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bre_user_denied(self):
        """BRE users should not be able to assign leads to CRE"""
        self.client.force_authenticate(user=self.bre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cre_user_denied(self):
        """CRE users should not be able to assign leads to CRE"""
        self.client.force_authenticate(user=self.cre_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Role-Based Access Tests (Allowed)
    # ------------------------------------------------------------------

    def test_boe_user_can_assign_to_cre(self):
        """BOE users should be able to assign leads to CRE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_assign_to_cre(self):
        """Admin users should be able to assign leads to CRE"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marketing_lead_can_assign_to_cre(self):
        """Marketing Lead users should be able to assign leads to CRE"""
        self.client.force_authenticate(user=self.marketing_lead_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Input Validation Tests
    # ------------------------------------------------------------------

    def test_user_id_required(self):
        """user_id is required"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('user_id', response.data['error'])

    def test_user_id_must_be_integer(self):
        """user_id must be a valid integer"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': 'not_a_number'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_target_user_must_exist(self):
        """Target user must exist"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': 99999},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('not found', response.data['error'])

    def test_target_user_must_be_cre(self):
        """Target user must be a CRE team member"""
        self.client.force_authenticate(user=self.boe_user)
        # Try to assign to a BRE user
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.bre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('CRE', response.data['error'])

    # ------------------------------------------------------------------
    # Status Validation Tests
    # ------------------------------------------------------------------

    def test_can_assign_contacted_lead_to_cre(self):
        """Leads in 'contacted' status can be assigned to CRE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_assign_nurturing_lead_to_cre(self):
        """Leads in 'nurturing' status can be assigned to CRE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.nurturing_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_assign_qualified_lead_to_cre(self):
        """Leads in 'qualified' status cannot be assigned to CRE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.qualified_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cannot_assign_new_lead_to_cre(self):
        """Leads in 'new' status cannot be assigned to CRE"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.new_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_404_for_nonexistent_lead(self):
        """Should return 404 for non-existent lead"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(99999),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Successful Assignment Tests
    # ------------------------------------------------------------------

    def test_assign_sets_managed_by(self):
        """Assigning to CRE should set managed_by to the target user"""
        self.client.force_authenticate(user=self.boe_user)
        self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )

        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.managed_by, self.cre_user)

    def test_assign_sets_assigned_to(self):
        """Assigning to CRE should set assigned_to to the target user"""
        self.client.force_authenticate(user=self.boe_user)
        self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )

        self.contacted_lead.refresh_from_db()
        self.assertEqual(self.contacted_lead.assigned_to, self.cre_user)

    def test_assign_creates_activity_log(self):
        """Assigning to CRE should create an ASELeadActivity entry"""
        self.client.force_authenticate(user=self.boe_user)
        self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )

        activity = ASELeadActivity.objects.filter(
            lead=self.contacted_lead,
            activity_type='assignment',
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.boe_user)
        self.assertEqual(activity.title, 'Assigned to CRE')
        self.assertEqual(activity.outcome, 'assigned_to_cre')

    def test_assign_returns_updated_lead_data(self):
        """Assigning to CRE should return the updated lead data"""
        self.client.force_authenticate(user=self.boe_user)
        response = self.client.post(
            self._get_url(self.contacted_lead.pk),
            {'user_id': self.cre_user.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['assigned_to'], self.cre_user.pk)
        self.assertEqual(response.data['managed_by'], self.cre_user.pk)
