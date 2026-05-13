"""
BOE Call/Email Logging Action Views

POST /api/ase-leads/{id}/log-call/
POST /api/ase-leads/{id}/log-email/

These endpoints allow BOE (Business Outreach Executive) users to log calls and
emails against leads that are in their pipeline stage. Both actions:
  - Validate the lead exists
  - Validate the user has BOE access (boe, marketing_lead, or admin)
  - Create an ASELeadActivity entry (type='call' or type='email')
  - Increment the relevant lead metric (total_calls_made or total_emails_sent)
  - Update last_engagement_type and last_engagement_date
  - Return the created activity data

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - User must have BOE role (marketing_category='boe'), or be admin/marketing_lead
"""

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadActivitySerializer


def _has_boe_access(user):
    """
    Check if the user has BOE-level access to log calls/emails.

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
def log_call(request, pk):
    """
    Log a call against a lead.

    Request body:
      - title (required, string): Brief summary of the call
      - description (optional, string): Detailed notes about the call
      - call_duration_minutes (optional, integer): Duration of the call in minutes
      - call_outcome (optional, string): Outcome of the call (answered, voicemail, etc.)
      - requires_followup (optional, boolean): Whether a follow-up is needed
      - followup_date (optional, datetime): When the follow-up is due

    Validations:
      - Lead must exist (404 if not found)
      - User must have BOE access (403 if not)
      - title must be provided (400 if missing)
      - call_duration_minutes must be a non-negative integer if provided (400 if invalid)

    Side effects:
      - Creates ASELeadActivity (type='call')
      - Increments lead.total_calls_made
      - Updates lead.last_engagement_type = 'call'
      - Updates lead.last_engagement_date = now

    Returns:
      201 with serialized activity data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_boe_access(user):
        return Response(
            {'error': 'Only BOE, Marketing Lead, or Admin users can log calls.'},
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
    description = request.data.get('description', '')
    call_duration_minutes = request.data.get('call_duration_minutes')
    call_outcome = request.data.get('call_outcome', '')
    requires_followup = request.data.get('requires_followup', False)
    followup_date = request.data.get('followup_date')

    if not title:
        return Response(
            {'error': 'title is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate call_duration_minutes if provided
    if call_duration_minutes is not None:
        try:
            call_duration_minutes = int(call_duration_minutes)
        except (TypeError, ValueError):
            return Response(
                {'error': 'call_duration_minutes must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if call_duration_minutes < 0:
            return Response(
                {'error': 'call_duration_minutes cannot be negative.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── 4. Create activity log entry ─────────────────────────────────────────
    now = timezone.now()

    # Parse followup_date if provided as a string
    parsed_followup_date = None
    if followup_date:
        if isinstance(followup_date, str):
            parsed_followup_date = parse_datetime(followup_date)
        else:
            parsed_followup_date = followup_date

    activity = ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='call',
        title=title,
        description=description if description else None,
        call_duration_minutes=call_duration_minutes,
        call_outcome=call_outcome if call_outcome else None,
        requires_followup=bool(requires_followup),
        followup_date=parsed_followup_date,
    )

    # ── 5. Update lead metrics ────────────────────────────────────────────────
    lead.total_calls_made = (lead.total_calls_made or 0) + 1
    lead.last_engagement_type = 'call'
    lead.last_engagement_date = now
    lead.save(update_fields=['total_calls_made', 'last_engagement_type', 'last_engagement_date'])

    # ── 6. Return created activity data ──────────────────────────────────────
    serializer = ASELeadActivitySerializer(activity, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def log_email(request, pk):
    """
    Log an email against a lead.

    Request body:
      - title (required, string): Brief summary of the email
      - description (optional, string): Detailed notes about the email
      - email_subject (required, string): Subject line of the email
      - requires_followup (optional, boolean): Whether a follow-up is needed
      - followup_date (optional, datetime): When the follow-up is due

    Validations:
      - Lead must exist (404 if not found)
      - User must have BOE access (403 if not)
      - title must be provided (400 if missing)
      - email_subject must be provided (400 if missing)

    Side effects:
      - Creates ASELeadActivity (type='email')
      - Increments lead.total_emails_sent
      - Updates lead.last_engagement_type = 'email'
      - Updates lead.last_engagement_date = now

    Returns:
      201 with serialized activity data on success
    """
    user = request.user

    # ── 1. Role check ─────────────────────────────────────────────────────────
    if not _has_boe_access(user):
        return Response(
            {'error': 'Only BOE, Marketing Lead, or Admin users can log emails.'},
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
    description = request.data.get('description', '')
    email_subject = request.data.get('email_subject', '').strip() if request.data.get('email_subject') else ''
    requires_followup = request.data.get('requires_followup', False)
    followup_date = request.data.get('followup_date')

    if not title:
        return Response(
            {'error': 'title is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email_subject:
        return Response(
            {'error': 'email_subject is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Create activity log entry ─────────────────────────────────────────
    now = timezone.now()

    # Parse followup_date if provided as a string
    parsed_followup_date = None
    if followup_date:
        if isinstance(followup_date, str):
            parsed_followup_date = parse_datetime(followup_date)
        else:
            parsed_followup_date = followup_date

    activity = ASELeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type='email',
        title=title,
        description=description if description else None,
        email_subject=email_subject,
        requires_followup=bool(requires_followup),
        followup_date=parsed_followup_date,
    )

    # ── 5. Update lead metrics ────────────────────────────────────────────────
    lead.total_emails_sent = (lead.total_emails_sent or 0) + 1
    lead.last_engagement_type = 'email'
    lead.last_engagement_date = now
    lead.save(update_fields=['total_emails_sent', 'last_engagement_type', 'last_engagement_date'])

    # ── 6. Return created activity data ──────────────────────────────────────
    serializer = ASELeadActivitySerializer(activity, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)
