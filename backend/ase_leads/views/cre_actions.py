"""
CRE Proposal/Meeting/Deal Stage Action Views

POST /api/ase-leads/{id}/send-proposal/
POST /api/ase-leads/{id}/schedule-meeting/
POST /api/ase-leads/{id}/update-stage/

These endpoints allow CRE (Client Research Executive) users to manage proposals,
meetings, and deal stages for leads in their pipeline. Each action:
  - Validates the lead exists
  - Validates the user has CRE access (cre, marketing_lead, or admin)
  - Performs the requested operation with appropriate side effects
  - Returns the updated lead or created activity data

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - User must have CRE role (marketing_category='cre'), or be admin/marketing_lead
"""

from decimal import Decimal, InvalidOperation

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadSerializer, ASELeadActivitySerializer


# Valid stage transitions for update_deal_stage
VALID_STAGES = ['contacted', 'proposal_sent', 'negotiating', 'won', 'lost']

# Valid stage transitions: from_status -> [allowed_to_statuses]
VALID_STAGE_TRANSITIONS = {
    'contacted': ['proposal_sent', 'nurturing', 'lost'],
    'proposal_sent': ['negotiating', 'won', 'lost'],
    'negotiating': ['won', 'lost'],
    'nurturing': ['contacted', 'proposal_sent', 'lost'],
}


def _has_cre_access(user):
    """
    Check if the user has CRE-level access to manage proposals and deals.

    Returns True for:
      - Admin users (full system access)
      - Marketing Lead users (full funnel management)
      - CRE users (their primary responsibility)
    """
    if user.role == 'admin':
        return True

    if not hasattr(user, 'team') or user.team is None:
        return False

    marketing_category = user.team.marketing_category
    return marketing_category in ('cre', 'marketing_lead')


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def send_proposal(request, pk):
    """
    Send a proposal for a lead.

    Request body:
      - proposal_value (optional, decimal): Value of the proposal
      - notes (optional, string): Notes about the proposal

    Validations:
      - Lead must exist (404 if not found)
      - User must have CRE access (403 if not)
      - Lead must be in 'contacted' or 'nurturing' status (400 if not)

    Side effects:
      - Updates lead status to 'proposal_sent'
      - Sets managed_by to current user (if not already set)
      - Sets proposal_sent_at to now
      - Updates estimated_project_value if proposal_value provided
      - Creates ASELeadActivity (type='status_change', title='Proposal Sent')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_cre_access(user):
        return Response(
            {'error': 'Only CRE, Marketing Lead, or Admin users can send proposals.'},
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

    # ── 3. Status validation ─────────────────────────────────────────────────
    if lead.status not in ('contacted', 'nurturing'):
        return Response(
            {'error': 'Lead must be in "contacted" or "nurturing" status to send a proposal.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Input validation ───────────────────────────────────────────────────
    proposal_value = request.data.get('proposal_value')
    notes = request.data.get('notes', '')

    if proposal_value is not None:
        try:
            proposal_value = Decimal(str(proposal_value))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {'error': 'proposal_value must be a valid decimal number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if proposal_value < 0:
            return Response(
                {'error': 'proposal_value cannot be negative.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── 5. Update lead ────────────────────────────────────────────────────────
    now = timezone.now()

    lead.status = 'proposal_sent'
    lead.proposal_sent_at = now

    if not lead.managed_by:
        lead.managed_by = user

    if proposal_value is not None:
        lead.estimated_project_value = proposal_value

    update_fields = ['status', 'proposal_sent_at', 'managed_by']
    if proposal_value is not None:
        update_fields.append('estimated_project_value')

    lead.save(update_fields=update_fields)

    # ── 6. Create activity log entry ─────────────────────────────────────────
    description = notes if notes else None
    if proposal_value is not None and not description:
        description = f'Proposal value: {proposal_value}'
    elif proposal_value is not None and description:
        description = f'{description}\nProposal value: {proposal_value}'

    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='status_change',
        title='Proposal Sent',
        description=description,
    )

    # ── 7. Return updated lead data ──────────────────────────────────────────
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def schedule_meeting(request, pk):
    """
    Schedule a meeting for a lead.

    Request body:
      - title (required, string): Title of the meeting
      - meeting_date (required, datetime): Date and time of the meeting
      - description (optional, string): Description or agenda
      - meeting_attendees (optional, list): List of attendees

    Validations:
      - Lead must exist (404 if not found)
      - User must have CRE access (403 if not)
      - title must be provided (400 if missing)
      - meeting_date must be provided and valid (400 if missing/invalid)

    Side effects:
      - Creates ASELeadActivity (type='meeting')
      - Increments lead.total_meetings_held
      - Updates lead.last_engagement_type = 'meeting'
      - Updates lead.last_engagement_date = now

    Returns:
      201 with serialized activity data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_cre_access(user):
        return Response(
            {'error': 'Only CRE, Marketing Lead, or Admin users can schedule meetings.'},
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

    # ── 3. Input validation ───────────────────────────────────────────────────
    title = request.data.get('title', '').strip() if request.data.get('title') else ''
    meeting_date = request.data.get('meeting_date')
    description = request.data.get('description', '')
    meeting_attendees = request.data.get('meeting_attendees', [])

    if not title:
        return Response(
            {'error': 'title is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not meeting_date:
        return Response(
            {'error': 'meeting_date is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Parse meeting_date if it's a string
    parsed_meeting_date = None
    if isinstance(meeting_date, str):
        parsed_meeting_date = parse_datetime(meeting_date)
        if parsed_meeting_date is None:
            return Response(
                {'error': 'meeting_date must be a valid datetime (ISO 8601 format).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        parsed_meeting_date = meeting_date

    # Validate meeting_attendees is a list
    if not isinstance(meeting_attendees, list):
        return Response(
            {'error': 'meeting_attendees must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Create activity log entry ─────────────────────────────────────────
    now = timezone.now()

    activity = ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='meeting',
        title=title,
        description=description if description else None,
        meeting_date=parsed_meeting_date,
        meeting_attendees=meeting_attendees,
    )

    # ── 5. Update lead metrics ────────────────────────────────────────────────
    lead.total_meetings_held = (lead.total_meetings_held or 0) + 1
    lead.last_engagement_type = 'meeting'
    lead.last_engagement_date = now
    lead.save(update_fields=['total_meetings_held', 'last_engagement_type', 'last_engagement_date'])

    # ── 6. Return created activity data ──────────────────────────────────────
    serializer = ASELeadActivitySerializer(activity, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def update_deal_stage(request, pk):
    """
    Update the deal stage for a lead.

    Request body:
      - stage (required, string): New stage - one of 'contacted', 'proposal_sent',
        'negotiating', 'won', 'lost'

    Validations:
      - Lead must exist (404 if not found)
      - User must have CRE access (403 if not)
      - stage must be provided and valid (400 if missing/invalid)
      - Stage transition must be valid (400 if not)

    Side effects:
      - Updates lead status to the new stage
      - Sets deal_closed_at if stage is 'won' or 'lost'
      - Creates ASELeadActivity (type='status_change')

    Returns:
      200 with serialized lead data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_cre_access(user):
        return Response(
            {'error': 'Only CRE, Marketing Lead, or Admin users can update deal stages.'},
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

    # ── 3. Input validation ───────────────────────────────────────────────────
    stage = request.data.get('stage', '').strip() if request.data.get('stage') else ''

    if not stage:
        return Response(
            {'error': 'stage is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if stage not in VALID_STAGES:
        return Response(
            {'error': f'stage must be one of: {", ".join(VALID_STAGES)}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Validate stage transition ─────────────────────────────────────────
    current_status = lead.status
    allowed_transitions = VALID_STAGE_TRANSITIONS.get(current_status, [])

    if stage not in allowed_transitions:
        return Response(
            {
                'error': f'Cannot transition from "{current_status}" to "{stage}". '
                         f'Allowed transitions: {", ".join(allowed_transitions) if allowed_transitions else "none"}.'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Update lead ────────────────────────────────────────────────────────
    now = timezone.now()
    old_status = lead.status
    lead.status = stage

    update_fields = ['status']

    if stage in ('won', 'lost'):
        lead.deal_closed_at = now
        update_fields.append('deal_closed_at')

    lead.save(update_fields=update_fields)

    # ── 6. Create activity log entry ─────────────────────────────────────────
    ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='status_change',
        title=f'Stage updated: {old_status} → {stage}',
        description=f'Deal stage changed from {old_status} to {stage}',
    )

    # ── 7. Return updated lead data ──────────────────────────────────────────
    serializer = ASELeadSerializer(lead, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)
