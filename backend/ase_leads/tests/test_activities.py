"""
Unit tests for Activity CRUD and Timeline views.

Tests cover:
- list_activities endpoint:
  - Authentication and permission checks
  - Returns activities for a lead
  - Filtering by activity_type
  - Pagination
  - 404 for non-existent lead

- create_activity endpoint:
  - Authentication and permission checks
  - Successful activity creation
  - Validation (activity_type required, title required, invalid type)
  - 404 for non-existent lead

- update_activity endpoint:
  - Only creator or admin can update
  - Partial update works
  - 403 for non-creator/non-admin
  - 404 for non-existent activity

- delete_activity endpoint:
  - Only creator or admin can delete
  - 403 for non-creator/non-admin
  - 404 for non-existent activity

- activity_timeline endpoint:
  - Returns all activities sorted by -created_at
  - Pagination
  - 404 for non-existent lead
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


class ActivityCRUDTestBase(TestCase):
    """Base class with shared setup for activity tests."""

    def setUp(self):
        self.client = APIClient()

        # Create company
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
        self.boe_team = Team.objects.create(
            name="BOE Team",
            team_type="marketing",
            marketing_category="boe",
            company=self.ase_company,
        )
        self.bre_team = Team.objects.create(
            name="BRE Team",
            team_type="marketing",
            marketing_category="bre",
            company=self.ase_company,
        )

        # Create marketing users
        self.boe_user = User.objects.create_user(
            username="boe_user",
            email="boe@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.boe_team,
        )
        self.boe_user2 = User.objects.create_user(
            username="boe_user2",
            email="boe2@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
            team=self.boe_team,
        )

        # Create test lead
        self.lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1111111111",
            status="qualified",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create some activities
        self.activity1 = ASELeadActivity.objects.create(
            lead=self.lead,
            user=self.boe_user,
            activity_type='call',
            title='First call',
            call_duration_minutes=5,
        )
        self.activity2 = ASELeadActivity.objects.create(
            lead=self.lead,
            user=self.boe_user,
            activity_type='email',
            title='Follow-up email',
            email_subject='Hello',
        )
        self.activity3 = ASELeadActivity.objects.create(
            lead=self.lead,
            user=self.admin_user,
            activity_type='note',
            title='Admin note',
        )


class ListActivitiesViewTest(ActivityCRUDTestBase):
    """Tests for the list_activities view function."""

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated users should get 401."""
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_denied(self):
        """Users without marketing team assignment should be denied."""
        non_marketing_user = User.objects.create_user(
            username="regular",
            email="regular@test.com",
            password="testpass123",
            role="employee",
            company=self.ase_company,
        )
        self.client.force_authenticate(user=non_marketing_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_activities_success(self):
        """Authenticated marketing user can list activities for a lead."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        self.assertIn('results', response.data)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)

    def test_list_activities_filter_by_type(self):
        """Can filter activities by activity_type query param."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url, {'activity_type': 'call'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['activity_type'], 'call')

    def test_list_activities_filter_email(self):
        """Can filter activities by email type."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url, {'activity_type': 'email'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['activity_type'], 'email')

    def test_list_activities_pagination(self):
        """Pagination metadata is returned correctly."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url, {'page': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['total_pages'], 1)

    def test_list_activities_lead_not_found(self):
        """Returns 404 for non-existent lead."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_activities(self):
        """Admin can list activities for any lead."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-list-activities', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)


class CreateActivityViewTest(ActivityCRUDTestBase):
    """Tests for the create_activity view function."""

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated users should get 401."""
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_activity_success(self):
        """Authenticated marketing user can create an activity."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {
            'activity_type': 'note',
            'title': 'New note activity',
            'description': 'Some description',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'note')
        self.assertEqual(response.data['title'], 'New note activity')
        # Verify it was created in the database
        self.assertTrue(
            ASELeadActivity.objects.filter(title='New note activity').exists()
        )

    def test_create_activity_missing_activity_type(self):
        """Returns 400 if activity_type is missing."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {'title': 'Some title'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('activity_type', response.data['error'])

    def test_create_activity_invalid_activity_type(self):
        """Returns 400 if activity_type is not a valid choice."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {'activity_type': 'invalid_type', 'title': 'Some title'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('activity_type', response.data['error'])

    def test_create_activity_missing_title(self):
        """Returns 400 if title is missing."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {'activity_type': 'note'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data['error'])

    def test_create_activity_lead_not_found(self):
        """Returns 404 for non-existent lead."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': 99999})
        data = {'activity_type': 'note', 'title': 'Test'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_activity_with_optional_fields(self):
        """Can create activity with all optional fields."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {
            'activity_type': 'call',
            'title': 'Call with client',
            'description': 'Discussed project scope',
            'call_duration_minutes': 15,
            'call_outcome': 'answered',
            'requires_followup': True,
            'followup_date': '2026-12-01T10:00:00Z',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['call_duration_minutes'], 15)
        self.assertEqual(response.data['call_outcome'], 'answered')
        self.assertTrue(response.data['requires_followup'])

    def test_create_activity_sets_user(self):
        """Activity user is set to the request user."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {'activity_type': 'note', 'title': 'My note'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        activity = ASELeadActivity.objects.get(title='My note')
        self.assertEqual(activity.user_id, self.boe_user.id)

    def test_admin_can_create_activity(self):
        """Admin can create activities."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-create-activity', kwargs={'pk': self.lead.pk})
        data = {'activity_type': 'note', 'title': 'Admin note 2'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class UpdateActivityViewTest(ActivityCRUDTestBase):
    """Tests for the update_activity view function."""

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated users should get 401."""
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': self.activity1.pk})
        response = self.client.patch(url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_creator_can_update(self):
        """Activity creator can update their own activity."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': self.activity1.pk})
        data = {'title': 'Updated call title'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated call title')

    def test_admin_can_update_any_activity(self):
        """Admin can update any activity regardless of creator."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': self.activity1.pk})
        data = {'title': 'Admin updated title'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Admin updated title')

    def test_non_creator_non_admin_denied(self):
        """Non-creator, non-admin user gets 403."""
        self.client.force_authenticate(user=self.boe_user2)
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': self.activity1.pk})
        data = {'title': 'Unauthorized update'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_activity_not_found(self):
        """Returns 404 for non-existent activity."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': 99999})
        data = {'title': 'Test'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partial_update_only_changes_provided_fields(self):
        """PATCH only updates the fields that are provided."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-update-activity', kwargs={'activity_id': self.activity1.pk})
        original_type = self.activity1.activity_type
        data = {'description': 'Added description'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.activity1.refresh_from_db()
        self.assertEqual(self.activity1.description, 'Added description')
        self.assertEqual(self.activity1.activity_type, original_type)


class DeleteActivityViewTest(ActivityCRUDTestBase):
    """Tests for the delete_activity view function."""

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated users should get 401."""
        url = reverse('ase-leads-delete-activity', kwargs={'activity_id': self.activity1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_creator_can_delete(self):
        """Activity creator can delete their own activity."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-delete-activity', kwargs={'activity_id': self.activity1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ASELeadActivity.objects.filter(pk=self.activity1.pk).exists())

    def test_admin_can_delete_any_activity(self):
        """Admin can delete any activity regardless of creator."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-delete-activity', kwargs={'activity_id': self.activity1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_creator_non_admin_denied(self):
        """Non-creator, non-admin user gets 403."""
        self.client.force_authenticate(user=self.boe_user2)
        url = reverse('ase-leads-delete-activity', kwargs={'activity_id': self.activity1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_activity_not_found(self):
        """Returns 404 for non-existent activity."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-delete-activity', kwargs={'activity_id': 99999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ActivityTimelineViewTest(ActivityCRUDTestBase):
    """Tests for the activity_timeline view function."""

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated users should get 401."""
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_timeline_returns_all_activities(self):
        """Timeline returns all activities for the lead."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_timeline_sorted_by_created_at_desc(self):
        """Timeline activities are sorted by -created_at (newest first)."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        # Verify that results are sorted by created_at descending
        timestamps = [r['created_at'] for r in results]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_timeline_pagination(self):
        """Timeline supports pagination."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': self.lead.pk})
        response = self.client.get(url, {'page': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)
        self.assertIn('count', response.data)

    def test_timeline_lead_not_found(self):
        """Returns 404 for non-existent lead."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_view_timeline(self):
        """Admin can view timeline for any lead."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-activity-timeline', kwargs={'pk': self.lead.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
