"""
Unit tests for ASEMarketingPermission.

Tests cover:
- Unauthenticated access is denied
- Admin has full access (has_permission and has_object_permission)
- Non-ASE company users are denied
- Users without a team are denied
- Users with a non-marketing team are denied
- Role-based object-level access for BRE, BOE, CRE, and Marketing Lead
"""

from unittest.mock import MagicMock, PropertyMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Company
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.models import ASELead

User = get_user_model()


def _make_request(user):
    """Helper: create a mock DRF request with the given user."""
    request = MagicMock()
    request.user = user
    return request


def _make_view():
    """Helper: create a minimal mock view."""
    return MagicMock()


class ASEMarketingPermissionHasPermissionTest(TestCase):
    """Tests for ASEMarketingPermission.has_permission"""

    def setUp(self):
        self.permission = ASEMarketingPermission()
        self.view = _make_view()

        # ASE Technologies company
        self.ase_company = Company.objects.create(
            name="ASE Technologies",
            code="ASE",
        )
        # Another company (not ASE)
        self.other_company = Company.objects.create(
            name="Other Corp",
            code="OTHER",
        )

    # ------------------------------------------------------------------
    # Unauthenticated
    # ------------------------------------------------------------------

    def test_unauthenticated_user_is_denied(self):
        """Unauthenticated users must be denied at view level."""
        user = MagicMock()
        user.is_authenticated = False
        request = _make_request(user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    def test_admin_is_allowed_regardless_of_company(self):
        """Admin role bypasses all company/team checks."""
        user = User.objects.create_user(
            username="admin_user",
            email="admin@test.com",
            password="pass",
            role="admin",
        )
        request = _make_request(user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    def test_admin_without_company_is_allowed(self):
        """Admin with no company assigned still gets full access."""
        user = User.objects.create_user(
            username="admin_nocompany",
            email="admin2@test.com",
            password="pass",
            role="admin",
            company=None,
        )
        request = _make_request(user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    # ------------------------------------------------------------------
    # Company checks
    # ------------------------------------------------------------------

    def test_user_without_company_is_denied(self):
        """Non-admin user with no company is denied."""
        user = User.objects.create_user(
            username="nocompany_user",
            email="nocompany@test.com",
            password="pass",
            role="employee",
            company=None,
        )
        request = _make_request(user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    def test_user_from_non_ase_company_is_denied(self):
        """Non-admin user from a non-ASE company is denied."""
        user = User.objects.create_user(
            username="other_user",
            email="other@test.com",
            password="pass",
            role="employee",
            company=self.other_company,
        )
        request = _make_request(user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    # ------------------------------------------------------------------
    # Team checks
    # ------------------------------------------------------------------

    def test_ase_user_without_team_is_denied(self):
        """ASE user with no team assignment is denied."""
        user = User.objects.create_user(
            username="noteam_user",
            email="noteam@test.com",
            password="pass",
            role="employee",
            company=self.ase_company,
        )
        # team is None by default
        request = _make_request(user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    def test_ase_user_with_non_marketing_team_is_denied(self):
        """ASE user in a technical team (no marketing_category) is denied."""
        from teams.models import Team

        tech_team = Team.objects.create(
            name="Frontend Dev",
            team_type="technical",
            company=self.ase_company,
        )
        user = User.objects.create_user(
            username="tech_user",
            email="tech@test.com",
            password="pass",
            role="employee",
            company=self.ase_company,
            team=tech_team,
        )
        request = _make_request(user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    def test_ase_user_with_marketing_team_is_allowed(self):
        """ASE user in a marketing team with a category is allowed."""
        from teams.models import Team

        marketing_team = Team.objects.create(
            name="BRE Team",
            team_type="marketing",
            marketing_category="bre",
            company=self.ase_company,
        )
        user = User.objects.create_user(
            username="bre_user",
            email="bre@test.com",
            password="pass",
            role="employee",
            company=self.ase_company,
            team=marketing_team,
        )
        request = _make_request(user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    def test_all_marketing_categories_are_allowed(self):
        """All four marketing categories (bre, boe, cre, marketing_lead) grant access."""
        from teams.models import Team

        for category in ['bre', 'boe', 'cre', 'marketing_lead']:
            team = Team.objects.create(
                name=f"{category} Team access",
                team_type="marketing",
                marketing_category=category,
                company=self.ase_company,
            )
            user = User.objects.create_user(
                username=f"{category}_access_user",
                email=f"{category}_access@test.com",
                password="pass",
                role="employee",
                company=self.ase_company,
                team=team,
            )
            request = _make_request(user)
            self.assertTrue(
                self.permission.has_permission(request, self.view),
                f"User with marketing_category='{category}' should be allowed",
            )


class ASEMarketingPermissionHasObjectPermissionTest(TestCase):
    """Tests for ASEMarketingPermission.has_object_permission"""

    def setUp(self):
        self.permission = ASEMarketingPermission()
        self.view = _make_view()

        self.ase_company = Company.objects.create(
            name="ASE Technologies Obj",
            code="ASE",
        )

        # Create a base admin user for lead creation
        self.admin_user = User.objects.create_user(
            username="admin_obj",
            email="adminobj@test.com",
            password="pass",
            role="admin",
        )

    def _make_lead(self, status):
        """Helper: create an ASELead with the given status."""
        return ASELead.objects.create(
            company_name=f"Lead Co {status}",
            contact_person="Test Person",
            phone=f"99{status[:6].ljust(8, '0')}",
            industry="technology",
            company=self.ase_company,
            created_by=self.admin_user,
            status=status,
        )

    def _make_marketing_user(self, category, username_suffix):
        """Helper: create an ASE marketing user with the given category."""
        from teams.models import Team

        team = Team.objects.create(
            name=f"{category} Team {username_suffix}",
            team_type="marketing",
            marketing_category=category,
            company=self.ase_company,
        )
        user = User.objects.create_user(
            username=f"{category}_{username_suffix}",
            email=f"{category}_{username_suffix}@test.com",
            password="pass",
            role="employee",
            company=self.ase_company,
            team=team,
        )
        return user

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    def test_admin_can_access_any_lead_status(self):
        """Admin can access leads in any status."""
        for status_value, _ in ASELead.STATUS_CHOICES:
            lead = self._make_lead(status_value)
            request = _make_request(self.admin_user)
            self.assertTrue(
                self.permission.has_object_permission(request, self.view, lead),
                f"Admin should access lead with status '{status_value}'",
            )

    # ------------------------------------------------------------------
    # Marketing Lead
    # ------------------------------------------------------------------

    def test_marketing_lead_can_access_any_status(self):
        """Marketing Lead has full access to all lead statuses."""
        user = self._make_marketing_user("marketing_lead", "ml1")
        for status_value, _ in ASELead.STATUS_CHOICES:
            lead = self._make_lead(status_value)
            request = _make_request(user)
            self.assertTrue(
                self.permission.has_object_permission(request, self.view, lead),
                f"Marketing Lead should access lead with status '{status_value}'",
            )

    # ------------------------------------------------------------------
    # BRE
    # ------------------------------------------------------------------

    def test_bre_can_access_new_leads(self):
        """BRE can access leads with status 'new'."""
        user = self._make_marketing_user("bre", "bre1")
        lead = self._make_lead("new")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_bre_can_access_qualified_leads(self):
        """BRE can access leads with status 'qualified'."""
        user = self._make_marketing_user("bre", "bre2")
        lead = self._make_lead("qualified")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_bre_cannot_access_contacted_leads(self):
        """BRE cannot access leads with status 'contacted'."""
        user = self._make_marketing_user("bre", "bre3")
        lead = self._make_lead("contacted")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    def test_bre_cannot_access_proposal_sent_leads(self):
        """BRE cannot access leads with status 'proposal_sent'."""
        user = self._make_marketing_user("bre", "bre4")
        lead = self._make_lead("proposal_sent")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    def test_bre_cannot_access_won_leads(self):
        """BRE cannot access leads with status 'won'."""
        user = self._make_marketing_user("bre", "bre5")
        lead = self._make_lead("won")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    # ------------------------------------------------------------------
    # BOE
    # ------------------------------------------------------------------

    def test_boe_can_access_qualified_leads(self):
        """BOE can access leads with status 'qualified'."""
        user = self._make_marketing_user("boe", "boe1")
        lead = self._make_lead("qualified")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_boe_can_access_contacted_leads(self):
        """BOE can access leads with status 'contacted'."""
        user = self._make_marketing_user("boe", "boe2")
        lead = self._make_lead("contacted")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_boe_can_access_nurturing_leads(self):
        """BOE can access leads with status 'nurturing'."""
        user = self._make_marketing_user("boe", "boe3")
        lead = self._make_lead("nurturing")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_boe_cannot_access_new_leads(self):
        """BOE cannot access leads with status 'new'."""
        user = self._make_marketing_user("boe", "boe4")
        lead = self._make_lead("new")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    def test_boe_cannot_access_proposal_sent_leads(self):
        """BOE cannot access leads with status 'proposal_sent'."""
        user = self._make_marketing_user("boe", "boe5")
        lead = self._make_lead("proposal_sent")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    # ------------------------------------------------------------------
    # CRE
    # ------------------------------------------------------------------

    def test_cre_can_access_contacted_leads(self):
        """CRE can access leads with status 'contacted'."""
        user = self._make_marketing_user("cre", "cre1")
        lead = self._make_lead("contacted")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_cre_can_access_proposal_sent_leads(self):
        """CRE can access leads with status 'proposal_sent'."""
        user = self._make_marketing_user("cre", "cre2")
        lead = self._make_lead("proposal_sent")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_cre_can_access_negotiating_leads(self):
        """CRE can access leads with status 'negotiating'."""
        user = self._make_marketing_user("cre", "cre3")
        lead = self._make_lead("negotiating")
        request = _make_request(user)
        self.assertTrue(self.permission.has_object_permission(request, self.view, lead))

    def test_cre_cannot_access_new_leads(self):
        """CRE cannot access leads with status 'new'."""
        user = self._make_marketing_user("cre", "cre4")
        lead = self._make_lead("new")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    def test_cre_cannot_access_qualified_leads(self):
        """CRE cannot access leads with status 'qualified'."""
        user = self._make_marketing_user("cre", "cre5")
        lead = self._make_lead("qualified")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    def test_cre_cannot_access_won_leads(self):
        """CRE cannot access leads with status 'won'."""
        user = self._make_marketing_user("cre", "cre6")
        lead = self._make_lead("won")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))

    # ------------------------------------------------------------------
    # Unknown / missing marketing category
    # ------------------------------------------------------------------

    def test_user_with_no_team_is_denied_at_object_level(self):
        """User with no team is denied at object level."""
        user = User.objects.create_user(
            username="noteam_obj",
            email="noteamobj@test.com",
            password="pass",
            role="employee",
            company=self.ase_company,
        )
        lead = self._make_lead("new")
        request = _make_request(user)
        self.assertFalse(self.permission.has_object_permission(request, self.view, lead))
