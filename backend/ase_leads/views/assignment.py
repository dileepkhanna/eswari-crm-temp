"""
Lead Assignment Action Views

POST /api/ase-leads/{id}/assign-to-boe/
POST /api/ase-leads/{id}/assign-to-cre/

These endpoints allow authorized users to assign leads to BOE or CRE team
members as they progress through the marketing pipeline.

assign_to_boe:
  - Validates the lead exists and is in 'qualified' status
  - Validates user has BRE or admin/marketing_lead access
  - Accepts: user_id (required) - the BOE user to assign to
  - Validates the target user exists and is a BOE team member
  - Sets lead.contacted_by to the target user
  - Updates lead.assigned_to to the target user
  - Creates an ASELeadActivity entry (type='assignment', title='Assigned to BOE')
  - Returns updated lead data

assign_to_cre:
  - Validates the lead exists and is in 'contacted' or 'nurturing' status
  - Validates user has BOE or admin/marketing_lead access
  - Accepts: user_id (required) - the CRE user to assign to
  - Validates the target user exists and is a CRE team member
  - Sets lead.managed_by to the target user
  - Updates lead.assigned_to to the target user
  - Creates an ASELeadActivity entry (type='assignment', title='Assigned to CRE')
  - Returns updated lead data

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - assign_to_boe: User must have BRE role, or be admin/marketing_lead
  - assign_to_cre: User must have BOE role, or be admin/marketing_lead
"""

from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadSerializer

User = get_user_model()


def _has_bre_access(user):
    """
    Check if the user has BRE-level access to assign leads to BOE.

    Returns True for:
      - Admin users (full system access)
      - Marketing Lead users (full funnel management)
      - BRE users (their primary responsibility)
    """
    if user.role == 'admin':
        return True

    if not hasattr(user, 'team') or user.team is None:
        return False

    marketing_category = user.team.marketing_category
    return marketing_category in ('bre', 'marketing_lead')


def _has_boe_access(user):
    """
    Check if the user has BOE-level access to assign leads to CRE.

    Returns True for:
      - Admin users (full system access)
      - Marketing Lead users (full funnel management)
      - BOE users (their primary responsibility)
    """
    if user.role == 'admin':
        return True

    if not hasattr(user, 'team') or user.team is None:
        return False

    marketing_category = user.team.marketing_category
    return marketing_category in ('boe', 'marketing_lead')


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def assign_to_boe(request, pk):
    """
    Assign a qualified lead to a BOE team member.

    Request body:
      - user_id (required, integer): ID of the BOE user to assign the lead to

    Validations:
      - Lead must exist (404 if not found)
      - Lead must be in 'qualified' status (400 if not)
      - User must have BRE access (403 if not)
      - user_id must be provided (400 if missing)
      - Target user must exist (400 if not found)
      - Target user must be a BOE team member (400 if not)

    Side effects:
      - Sets lead.contacted_by to the target user
      - Updates lead.assigned_to to the target user
      - Creates ASELeadActivity (type='assignment', title='Assigned to BOE')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_bre_access(user):
        return Response(
            {'error': 'Only BRE, Marketing Lead, or Admin users can assign leads to BOE.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Fetch the lead ─────────────────────────────────────────────────────
    try:
        lead = ASELead.objects.select_related(
            'company', 'assigned_to', 'created_by',
            'researched_by', 'contacted_by', 'managed_by',
        ).get(pk=pk)
    except ASELead.DoesNotExist:
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── 3. Status validation ──────────────────────────────────────────────────
    if lead.status != 'qualified':
        return Response(
            {'error': f"Lead must be in 'qualified' status to assign to BOE. Current status: '{lead.status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Input validation ───────────────────────────────────────────────────
    user_id = request.data.get('user_id')

    if user_id is None:
        return Response(
            {'error': 'user_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return Response(
            {'error': 'user_id must be an integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Validate target user ───────────────────────────────────────────────
    try:
        target_user = User.objects.select_related('team').get(pk=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Target user not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate target user is a BOE team member
    if not hasattr(target_user, 'team') or target_user.team is None:
        return Response(
            {'error': 'Target user is not assigned to any team.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if target_user.team.marketing_category != 'boe':
        return Response(
            {'error': 'Target user must be a BOE team member.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 6. Update the lead ────────────────────────────────────────────────────
    lead.contacted_by = target_user
    lead.assigned_to = target_user
    lead.save(update_fields=['contacted_by', 'assigned_to'])

    # ── 7. Create activity log entry ─────────────────────────────────────────
    target_name = f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username
    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='assignment',
        title='Assigned to BOE',
        description=f"Lead assigned to BOE team member: {target_name}",
        outcome='assigned_to_boe',
    )

    # ── 8. Return updated lead data ──────────────────────────────────────────
    # Re-fetch to get updated select_related data
    lead.refresh_from_db()
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def assign_to_cre(request, pk):
    """
    Assign a contacted/nurturing lead to a CRE team member.

    Request body:
      - user_id (required, integer): ID of the CRE user to assign the lead to

    Validations:
      - Lead must exist (404 if not found)
      - Lead must be in 'contacted' or 'nurturing' status (400 if not)
      - User must have BOE access (403 if not)
      - user_id must be provided (400 if missing)
      - Target user must exist (400 if not found)
      - Target user must be a CRE team member (400 if not)

    Side effects:
      - Sets lead.managed_by to the target user
      - Updates lead.assigned_to to the target user
      - Creates ASELeadActivity (type='assignment', title='Assigned to CRE')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_boe_access(user):
        return Response(
            {'error': 'Only BOE, Marketing Lead, or Admin users can assign leads to CRE.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Fetch the lead ─────────────────────────────────────────────────────
    try:
        lead = ASELead.objects.select_related(
            'company', 'assigned_to', 'created_by',
            'researched_by', 'contacted_by', 'managed_by',
        ).get(pk=pk)
    except ASELead.DoesNotExist:
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── 3. Status validation ──────────────────────────────────────────────────
    if lead.status not in ('contacted', 'nurturing'):
        return Response(
            {'error': f"Lead must be in 'contacted' or 'nurturing' status to assign to CRE. Current status: '{lead.status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Input validation ───────────────────────────────────────────────────
    user_id = request.data.get('user_id')

    if user_id is None:
        return Response(
            {'error': 'user_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return Response(
            {'error': 'user_id must be an integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Validate target user ───────────────────────────────────────────────
    try:
        target_user = User.objects.select_related('team').get(pk=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Target user not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate target user is a CRE team member or has manager/team_lead/admin role
    allowed_roles = ('manager', 'team_lead', 'admin')
    is_cre_member = (
        hasattr(target_user, 'team') and target_user.team is not None
        and target_user.team.marketing_category == 'cre'
    )
    is_allowed_role = target_user.role in allowed_roles

    if not is_cre_member and not is_allowed_role:
        return Response(
            {'error': 'Target user must be a CRE team member or have manager/team_lead/admin role.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 6. Update the lead ────────────────────────────────────────────────────
    lead.managed_by = target_user
    lead.assigned_to = target_user
    lead.save(update_fields=['managed_by', 'assigned_to'])

    # ── 7. Create activity log entry ─────────────────────────────────────────
    target_name = f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username
    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='assignment',
        title='Assigned to CRE',
        description=f"Lead assigned to CRE team member: {target_name}",
        outcome='assigned_to_cre',
    )

    # ── 8. Return updated lead data ──────────────────────────────────────────
    # Re-fetch to get updated select_related data
    lead.refresh_from_db()
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ══════════════════════════════════════════════════════════════════════════════
# Team Member List Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def boe_users(request):
    """
    List all BOE team members for assignment dropdowns.

    Returns a list of users who belong to a team with marketing_category='boe'.
    """
    from teams.models import Team

    company = request.user.company if request.user.role != 'admin' else None

    # Get BOE teams
    boe_teams_qs = Team.objects.filter(marketing_category='boe', is_active=True)
    if company:
        boe_teams_qs = boe_teams_qs.filter(company=company)

    boe_team_ids = boe_teams_qs.values_list('id', flat=True)

    # Get users in those teams
    users = User.objects.filter(team_id__in=boe_team_ids, is_active=True).values(
        'id', 'first_name', 'last_name', 'email', 'username'
    )

    return Response(list(users))


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def cre_users(request):
    """
    List all CRE team members and managers/team_leads/admins for assignment dropdowns.

    Returns a list of users who belong to a team with marketing_category='cre'
    (all roles), plus any users with manager/team_lead/admin roles.
    """
    from teams.models import Team
    from django.db.models import Q

    company = request.user.company if request.user.role != 'admin' else None

    # Get CRE teams
    cre_teams_qs = Team.objects.filter(marketing_category='cre', is_active=True)
    if company:
        cre_teams_qs = cre_teams_qs.filter(company=company)

    cre_team_ids = cre_teams_qs.values_list('id', flat=True)

    # Get all CRE team members (any role) + managers/team_leads/admins
    users_qs = User.objects.filter(is_active=True).filter(
        Q(team_id__in=cre_team_ids) | Q(role__in=['manager', 'team_lead', 'admin'])
    )
    if company:
        # Include users from same company OR admin/manager/team_lead users without a company
        users_qs = users_qs.filter(
            Q(company=company) | Q(company__isnull=True, role__in=['manager', 'team_lead', 'admin'])
        )

    users = users_qs.distinct().values('id', 'first_name', 'last_name', 'email', 'username', 'role')

    # Add 'name' field for frontend compatibility
    result = []
    for u in users:
        name = f"{u['first_name']} {u['last_name']}".strip() or u['username']
        role_label = u['role'].replace('_', ' ').title() if u['role'] != 'employee' else ''
        display_name = f"{name} ({role_label})" if role_label else name
        result.append({**u, 'name': display_name})

    return Response(result)
