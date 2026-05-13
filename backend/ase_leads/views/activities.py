"""
Activity CRUD and Timeline Views

GET    /api/ase-leads/{id}/activities/
POST   /api/ase-leads/{id}/activities/
PATCH  /api/ase-leads/activities/{activity_id}/
DELETE /api/ase-leads/activities/{activity_id}/
GET    /api/ase-leads/{id}/timeline/

These endpoints provide full CRUD operations for lead activities and a
timeline view that returns all activities for a lead sorted chronologically.

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - Update/Delete: only the activity creator or admin can modify/remove
"""

from django.core.paginator import Paginator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadActivitySerializer


PAGE_SIZE = 20


def _paginate_queryset(queryset, request):
    """
    Helper to paginate a queryset and return a standardised response dict.

    Returns:
        dict with keys: results, count, page, total_pages
    """
    page_number = request.query_params.get('page', 1)
    try:
        page_number = int(page_number)
    except (TypeError, ValueError):
        page_number = 1

    paginator = Paginator(queryset, PAGE_SIZE)
    page = paginator.get_page(page_number)

    serializer = ASELeadActivitySerializer(page.object_list, many=True, context={'request': request})
    return {
        'results': serializer.data,
        'count': paginator.count,
        'page': page.number,
        'total_pages': paginator.num_pages,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def list_activities(request, pk):
    """
    List activities for a specific lead with optional filtering and pagination.

    Query Parameters:
      - activity_type (optional): Filter by activity type (call, email, meeting, etc.)
      - page (optional): Page number for pagination (default: 1)

    Returns:
      200 with paginated activity list
      404 if lead not found
    """
    # Fetch the lead
    try:
        lead = ASELead.objects.get(pk=pk)
    except ASELead.DoesNotExist:
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build queryset
    activities = ASELeadActivity.objects.filter(lead=lead).select_related('user', 'lead')

    # Filter by activity_type if provided
    activity_type = request.query_params.get('activity_type')
    if activity_type:
        activities = activities.filter(activity_type=activity_type)

    # Order by most recent first
    activities = activities.order_by('-created_at')

    # Paginate and return
    data = _paginate_queryset(activities, request)
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def create_activity(request, pk):
    """
    Create a new activity for a specific lead.

    Request body:
      - activity_type (required): One of call, email, meeting, note, status_change, assignment
      - title (required): Brief summary of the activity
      - description (optional): Detailed description
      - call_duration_minutes (optional): Duration of call in minutes
      - call_outcome (optional): Outcome of the call
      - email_subject (optional): Subject line of the email
      - meeting_date (optional): Scheduled meeting date/time
      - meeting_attendees (optional): List of attendees
      - requires_followup (optional): Whether follow-up is needed
      - followup_date (optional): When follow-up is due

    Returns:
      201 with serialized activity on success
      400 if validation fails
      404 if lead not found
    """
    # Fetch the lead
    try:
        lead = ASELead.objects.get(pk=pk)
    except ASELead.DoesNotExist:
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Validate required fields
    activity_type = request.data.get('activity_type', '').strip() if request.data.get('activity_type') else ''
    title = request.data.get('title', '').strip() if request.data.get('title') else ''

    if not activity_type:
        return Response(
            {'error': 'activity_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_types = ['call', 'email', 'meeting', 'note', 'status_change', 'assignment']
    if activity_type not in valid_types:
        return Response(
            {'error': f'activity_type must be one of: {", ".join(valid_types)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not title:
        return Response(
            {'error': 'title is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Build activity data
    activity_data = {
        'lead': lead,
        'user': request.user,
        'activity_type': activity_type,
        'title': title,
    }

    # Optional fields
    description = request.data.get('description')
    if description:
        activity_data['description'] = description

    call_duration_minutes = request.data.get('call_duration_minutes')
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
        activity_data['call_duration_minutes'] = call_duration_minutes

    call_outcome = request.data.get('call_outcome')
    if call_outcome:
        activity_data['call_outcome'] = call_outcome

    email_subject = request.data.get('email_subject')
    if email_subject:
        activity_data['email_subject'] = email_subject

    meeting_date = request.data.get('meeting_date')
    if meeting_date:
        from django.utils.dateparse import parse_datetime
        if isinstance(meeting_date, str):
            parsed = parse_datetime(meeting_date)
            if parsed:
                activity_data['meeting_date'] = parsed
            else:
                activity_data['meeting_date'] = meeting_date
        else:
            activity_data['meeting_date'] = meeting_date

    meeting_attendees = request.data.get('meeting_attendees')
    if meeting_attendees is not None:
        activity_data['meeting_attendees'] = meeting_attendees

    requires_followup = request.data.get('requires_followup', False)
    activity_data['requires_followup'] = bool(requires_followup)

    followup_date = request.data.get('followup_date')
    if followup_date:
        from django.utils.dateparse import parse_datetime
        if isinstance(followup_date, str):
            parsed = parse_datetime(followup_date)
            if parsed:
                activity_data['followup_date'] = parsed
            else:
                activity_data['followup_date'] = followup_date
        else:
            activity_data['followup_date'] = followup_date

    # Create the activity
    activity = ASELeadActivity.objects.create(**activity_data)

    # Return serialized activity
    serializer = ASELeadActivitySerializer(activity, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def update_activity(request, activity_id):
    """
    Update an existing activity. Only the creator or admin can update.

    Request body: any subset of activity fields to update.

    Returns:
      200 with serialized activity on success
      403 if user is not the creator or admin
      404 if activity not found
    """
    # Fetch the activity
    try:
        activity = ASELeadActivity.objects.select_related('user', 'lead').get(pk=activity_id)
    except ASELeadActivity.DoesNotExist:
        return Response(
            {'error': 'Activity not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission check: only creator or admin can update
    user = request.user
    if user.role != 'admin' and activity.user_id != user.id:
        return Response(
            {'error': 'Only the activity creator or admin can update this activity.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Update only provided fields
    updatable_fields = [
        'title', 'description', 'outcome', 'call_duration_minutes',
        'call_outcome', 'email_subject', 'meeting_date', 'meeting_attendees',
        'requires_followup', 'followup_date', 'followup_completed',
    ]

    for field in updatable_fields:
        if field in request.data:
            value = request.data[field]
            # Special handling for call_duration_minutes
            if field == 'call_duration_minutes' and value is not None:
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    return Response(
                        {'error': 'call_duration_minutes must be an integer.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if value < 0:
                    return Response(
                        {'error': 'call_duration_minutes cannot be negative.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            # Special handling for meeting_date and followup_date
            if field in ('meeting_date', 'followup_date') and value and isinstance(value, str):
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(value)
                if parsed:
                    value = parsed
            # Special handling for requires_followup
            if field == 'requires_followup':
                value = bool(value)
            if field == 'followup_completed':
                value = bool(value)
            setattr(activity, field, value)

    activity.save()

    # Return serialized activity
    serializer = ASELeadActivitySerializer(activity, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def delete_activity(request, activity_id):
    """
    Delete an activity. Only the creator or admin can delete.

    Returns:
      204 on successful deletion
      403 if user is not the creator or admin
      404 if activity not found
    """
    # Fetch the activity
    try:
        activity = ASELeadActivity.objects.get(pk=activity_id)
    except ASELeadActivity.DoesNotExist:
        return Response(
            {'error': 'Activity not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission check: only creator or admin can delete
    user = request.user
    if user.role != 'admin' and activity.user_id != user.id:
        return Response(
            {'error': 'Only the activity creator or admin can delete this activity.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    activity.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def activity_timeline(request, pk):
    """
    Get the full activity timeline for a lead, sorted by most recent first.

    This endpoint returns ALL activities for the lead in chronological order
    (newest first), paginated at 20 per page.

    Query Parameters:
      - page (optional): Page number for pagination (default: 1)

    Returns:
      200 with paginated activity timeline
      404 if lead not found
    """
    # Fetch the lead
    try:
        lead = ASELead.objects.get(pk=pk)
    except ASELead.DoesNotExist:
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get all activities for this lead, sorted by most recent first
    activities = ASELeadActivity.objects.filter(lead=lead).select_related('user', 'lead').order_by('-created_at')

    # Paginate and return
    data = _paginate_queryset(activities, request)
    return Response(data, status=status.HTTP_200_OK)
