"""
BRE Qualification Action Views

POST /api/ase-leads/{id}/qualify/
POST /api/ase-leads/{id}/disqualify/

These endpoints allow BRE (Business Research Executive) users to qualify or
disqualify leads that are currently in 'new' status. Both actions:
  - Validate the lead exists and is in 'new' status
  - Update the lead's status and relevant fields
  - Set researched_by to the current user
  - Set research_completed_at to the current timestamp
  - Create an ASELeadActivity entry (type='status_change')
  - Return the updated lead data

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - User must have BRE role (marketing_category='bre'), or be admin/marketing_lead
"""

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadSerializer


def _has_bre_access(user):
    """
    Check if the user has BRE-level access to qualify/disqualify leads.

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


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def qualify_lead(request, pk):
    """
    Qualify a lead — moves it from 'new' to 'qualified' status.

    Request body:
      - lead_score (required, integer 0-100): Quality score assigned by BRE
      - qualification_notes (optional, string): Research notes and findings

    Validations:
      - Lead must exist (404 if not found)
      - Lead must be in 'new' status (400 if not)
      - User must have BRE access (403 if not)
      - lead_score must be provided and between 0-100 (400 if invalid)

    Side effects:
      - Updates lead status to 'qualified'
      - Sets researched_by to current user
      - Sets research_completed_at to now
      - Updates lead_score and qualification_notes
      - Creates ASELeadActivity (type='status_change')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_bre_access(user):
        return Response(
            {'error': 'Only BRE, Marketing Lead, or Admin users can qualify leads.'},
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
    if lead.status != 'new':
        return Response(
            {'error': f"Lead must be in 'new' status to qualify. Current status: '{lead.status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Input validation ───────────────────────────────────────────────────
    lead_score = request.data.get('lead_score')
    qualification_notes = request.data.get('qualification_notes', '')

    if lead_score is None:
        return Response(
            {'error': 'lead_score is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lead_score = int(lead_score)
    except (TypeError, ValueError):
        return Response(
            {'error': 'lead_score must be an integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if lead_score < 0 or lead_score > 100:
        return Response(
            {'error': 'lead_score must be between 0 and 100.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Update the lead ────────────────────────────────────────────────────
    now = timezone.now()
    lead.status = 'qualified'
    lead.researched_by = user
    lead.research_completed_at = now
    lead.lead_score = lead_score
    if qualification_notes:
        lead.qualification_notes = qualification_notes
    lead.save()

    # ── 6. Create activity log entry ─────────────────────────────────────────
    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='status_change',
        title='Lead Qualified',
        description=f"Lead qualified with score {lead_score}/100."
                    + (f" Notes: {qualification_notes}" if qualification_notes else ""),
        outcome='qualified',
    )

    # ── 7. Return updated lead data ──────────────────────────────────────────
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def disqualify_lead(request, pk):
    """
    Disqualify a lead — moves it from 'new' to 'lost' status.

    Request body:
      - disqualification_reason (required, string): Reason for disqualification

    Validations:
      - Lead must exist (404 if not found)
      - Lead must be in 'new' status (400 if not)
      - User must have BRE access (403 if not)
      - disqualification_reason must be provided (400 if missing)

    Side effects:
      - Updates lead status to 'lost'
      - Sets researched_by to current user
      - Sets research_completed_at to now
      - Sets disqualification_reason
      - Creates ASELeadActivity (type='status_change')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_bre_access(user):
        return Response(
            {'error': 'Only BRE, Marketing Lead, or Admin users can disqualify leads.'},
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
    if lead.status != 'new':
        return Response(
            {'error': f"Lead must be in 'new' status to disqualify. Current status: '{lead.status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Input validation ───────────────────────────────────────────────────
    disqualification_reason = request.data.get('disqualification_reason', '').strip()

    if not disqualification_reason:
        return Response(
            {'error': 'disqualification_reason is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Update the lead ────────────────────────────────────────────────────
    now = timezone.now()
    lead.status = 'lost'
    lead.researched_by = user
    lead.research_completed_at = now
    lead.disqualification_reason = disqualification_reason
    lead.save()

    # ── 6. Create activity log entry ─────────────────────────────────────────
    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='status_change',
        title='Lead Disqualified',
        description=f"Lead disqualified. Reason: {disqualification_reason}",
        outcome='disqualified',
    )

    # ── 7. Return updated lead data ──────────────────────────────────────────
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)
