"""
Unit tests for Task CRUD views.

Tests cover:
- Authentication and permission checks (401 for unauthenticated, 403 for non-marketing users)
- my_tasks returns only user's tasks
- Filtering by status, priority, task_type
- Ordering
- Pagination
- create_task validation (required fields, lead exists, assigned_to exists)
- update_task permission (only creator/assignee/admin)
- complete_task sets status and completed_at
- overdue_tasks returns only overdue tasks
"""

from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Company
from teams.models import Team
from ase_leads.models import ASELead
from ase_leads.models.task import ASELeadTask

User = get_user_model()


class TaskViewsBaseTestCase(TestCase):
    """Base test case with common setup for task views."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create companies
        self.ase_company = Company.objects.create(
            name="ASE Technologies",
            code="ASE",
        )
        self.other_company = Company.objects.create(
            name="Other Corp",
            code="OTHER",
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

        # Create admin user
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            role="admin",
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

        # Create a non-marketing user (no team)
        self.non_marketing_user = User.objects.create_user(
            username="non_marketing",
            email="nonmarketing@test.com",
            password="testpass123",
            role="employee",
            company=self.other_company,
        )

        # Create test lead
        self.lead = ASELead.objects.create(
            company_name="Test Lead Co",
            contact_person="John Test",
            phone="1234567890",
            industry="technology",
            status="new",
            priority="high",
            company=self.ase_company,
            created_by=self.admin_user,
        )

        # Create tasks
        self.now = timezone.now()
        self.task1 = ASELeadTask.objects.create(
            lead=self.lead,
            assigned_to=self.bre_user,
            created_by=self.admin_user,
            task_type='call',
            title='Call the lead',
            priority='high',
            status='pending',
            due_date=self.now + timedelta(days=1),
        )
        self.task2 = ASELeadTask.objects.create(
            lead=self.lead,
            assigned_to=self.bre_user,
            created_by=self.bre_user,
            task_type='email',
            title='Send email',
            priority='medium',
            status='in_progress',
            due_date=self.now + timedelta(days=3),
        )
        self.task3 = ASELeadTask.objects.create(
            lead=self.lead,
            assigned_to=self.boe_user,
            created_by=self.bre_user,
            task_type='meeting',
            title='Schedule meeting',
            priority='low',
            status='pending',
            due_date=self.now + timedelta(days=5),
        )
        # Overdue task
        self.overdue_task = ASELeadTask.objects.create(
            lead=self.lead,
            assigned_to=self.bre_user,
            created_by=self.admin_user,
            task_type='followup',
            title='Overdue followup',
            priority='urgent',
            status='pending',
            due_date=self.now - timedelta(days=2),
        )


class MyTasksViewTest(TaskViewsBaseTestCase):
    """Tests for the my_tasks view."""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401."""
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_returns_403(self):
        """Non-marketing users should return 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_only_users_tasks(self):
        """Should return only tasks assigned to the requesting user."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # bre_user has task1, task2, and overdue_task (3 tasks)
        self.assertEqual(response.data['count'], 3)
        task_ids = [t['id'] for t in response.data['results']]
        self.assertIn(self.task1.id, task_ids)
        self.assertIn(self.task2.id, task_ids)
        self.assertNotIn(self.task3.id, task_ids)

    def test_filter_by_status(self):
        """Should filter tasks by status."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url, {'status': 'pending'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # bre_user has task1 (pending) and overdue_task (pending)
        self.assertEqual(response.data['count'], 2)

    def test_filter_by_priority(self):
        """Should filter tasks by priority."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url, {'priority': 'high'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.task1.id)

    def test_filter_by_task_type(self):
        """Should filter tasks by task_type."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url, {'task_type': 'call'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.task1.id)

    def test_ordering_by_due_date_ascending(self):
        """Default ordering should be due_date ascending."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        # Overdue task has earliest due_date, then task1, then task2
        self.assertEqual(results[0]['id'], self.overdue_task.id)
        self.assertEqual(results[1]['id'], self.task1.id)
        self.assertEqual(results[2]['id'], self.task2.id)

    def test_ordering_by_due_date_descending(self):
        """Should order by due_date descending when specified."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url, {'ordering': '-due_date'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['id'], self.task2.id)
        self.assertEqual(results[-1]['id'], self.overdue_task.id)

    def test_ordering_by_created_at(self):
        """Should order by created_at when specified."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url, {'ordering': '-created_at'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not error
        self.assertEqual(len(response.data['results']), 3)

    def test_pagination(self):
        """Should paginate results."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)
        self.assertEqual(response.data['page'], 1)

    def test_admin_can_access(self):
        """Admin should be able to access my_tasks."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-my-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateTaskViewTest(TaskViewsBaseTestCase):
    """Tests for the create_task view."""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401."""
        url = reverse('ase-leads-create-task')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_returns_403(self):
        """Non-marketing users should return 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        url = reverse('ase-leads-create-task')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_task_success(self):
        """Should create a task with valid data."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': self.boe_user.id,
            'task_type': 'call',
            'title': 'New call task',
            'description': 'Call the lead to discuss proposal',
            'priority': 'high',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New call task')
        self.assertEqual(response.data['task_type'], 'call')
        self.assertEqual(response.data['priority'], 'high')
        self.assertEqual(response.data['created_by'], self.bre_user.id)

    def test_create_task_missing_lead_id(self):
        """Should return 400 if lead_id is missing."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'assigned_to': self.boe_user.id,
            'task_type': 'call',
            'title': 'New call task',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('lead_id', response.data['error'])

    def test_create_task_missing_assigned_to(self):
        """Should return 400 if assigned_to is missing."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'task_type': 'call',
            'title': 'New call task',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('assigned_to', response.data['error'])

    def test_create_task_missing_title(self):
        """Should return 400 if title is missing."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': self.boe_user.id,
            'task_type': 'call',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data['error'])

    def test_create_task_missing_due_date(self):
        """Should return 400 if due_date is missing."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': self.boe_user.id,
            'task_type': 'call',
            'title': 'New call task',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('due_date', response.data['error'])

    def test_create_task_invalid_task_type(self):
        """Should return 400 if task_type is invalid."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': self.boe_user.id,
            'task_type': 'invalid_type',
            'title': 'New task',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('task_type', response.data['error'])

    def test_create_task_lead_not_found(self):
        """Should return 400 if lead does not exist."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': 99999,
            'assigned_to': self.boe_user.id,
            'task_type': 'call',
            'title': 'New call task',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Lead not found', response.data['error'])

    def test_create_task_assigned_user_not_found(self):
        """Should return 400 if assigned_to user does not exist."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': 99999,
            'task_type': 'call',
            'title': 'New call task',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Assigned user not found', response.data['error'])

    def test_create_task_default_priority(self):
        """Should default priority to 'medium' if not provided."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-create-task')
        data = {
            'lead_id': self.lead.id,
            'assigned_to': self.boe_user.id,
            'task_type': 'email',
            'title': 'Send email',
            'due_date': (self.now + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['priority'], 'medium')


class UpdateTaskViewTest(TaskViewsBaseTestCase):
    """Tests for the update_task view."""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401."""
        url = reverse('ase-leads-update-task', args=[self.task1.id])
        response = self.client.patch(url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_task_not_found_returns_404(self):
        """Should return 404 if task does not exist."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-update-task', args=[99999])
        response = self.client.patch(url, {'title': 'Updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_creator_can_update(self):
        """Task creator should be able to update."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-update-task', args=[self.task1.id])
        response = self.client.patch(url, {'title': 'Updated title'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated title')

    def test_assignee_can_update(self):
        """Task assignee should be able to update."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-update-task', args=[self.task1.id])
        response = self.client.patch(url, {'description': 'New description'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'New description')

    def test_admin_can_update(self):
        """Admin should be able to update any task."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-update-task', args=[self.task3.id])
        response = self.client.patch(url, {'priority': 'urgent'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'urgent')

    def test_other_user_cannot_update(self):
        """User who is neither creator nor assignee should get 403."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-update-task', args=[self.task1.id])
        response = self.client.patch(url, {'title': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_multiple_fields(self):
        """Should update multiple fields at once."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-update-task', args=[self.task1.id])
        new_due = (self.now + timedelta(days=10)).isoformat()
        response = self.client.patch(url, {
            'title': 'Multi update',
            'priority': 'low',
            'status': 'in_progress',
            'due_date': new_due,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Multi update')
        self.assertEqual(response.data['priority'], 'low')
        self.assertEqual(response.data['status'], 'in_progress')


class CompleteTaskViewTest(TaskViewsBaseTestCase):
    """Tests for the complete_task view."""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401."""
        url = reverse('ase-leads-complete-task', args=[self.task1.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_task_not_found_returns_404(self):
        """Should return 404 if task does not exist."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-complete-task', args=[99999])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_assignee_can_complete(self):
        """Task assignee should be able to complete the task."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-complete-task', args=[self.task1.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')
        self.assertIsNotNone(response.data['completed_at'])

    def test_admin_can_complete(self):
        """Admin should be able to complete any task."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('ase-leads-complete-task', args=[self.task3.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')
        self.assertIsNotNone(response.data['completed_at'])

    def test_non_assignee_cannot_complete(self):
        """User who is not the assignee should get 403."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-complete-task', args=[self.task1.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_complete_sets_completed_at(self):
        """Completing a task should set completed_at timestamp."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-complete-task', args=[self.task2.id])
        before = timezone.now()
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify in database
        self.task2.refresh_from_db()
        self.assertEqual(self.task2.status, 'completed')
        self.assertIsNotNone(self.task2.completed_at)
        self.assertGreaterEqual(self.task2.completed_at, before)


class OverdueTasksViewTest(TaskViewsBaseTestCase):
    """Tests for the overdue_tasks view."""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401."""
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_marketing_user_returns_403(self):
        """Non-marketing users should return 403."""
        self.client.force_authenticate(user=self.non_marketing_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_only_overdue_tasks(self):
        """Should return only overdue tasks for the user."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only overdue_task should be returned (due_date in the past, status pending)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.overdue_task.id)

    def test_excludes_completed_tasks(self):
        """Should not return completed tasks even if overdue."""
        # Mark overdue task as completed
        self.overdue_task.status = 'completed'
        self.overdue_task.completed_at = timezone.now()
        self.overdue_task.save()

        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_excludes_cancelled_tasks(self):
        """Should not return cancelled tasks even if overdue."""
        self.overdue_task.status = 'cancelled'
        self.overdue_task.save()

        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_does_not_return_other_users_tasks(self):
        """Should not return overdue tasks assigned to other users."""
        self.client.force_authenticate(user=self.boe_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # boe_user has no overdue tasks
        self.assertEqual(response.data['count'], 0)

    def test_pagination_format(self):
        """Should return paginated response format."""
        self.client.force_authenticate(user=self.bre_user)
        url = reverse('ase-leads-overdue-tasks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)
