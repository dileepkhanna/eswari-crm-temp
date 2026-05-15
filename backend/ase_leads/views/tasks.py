"""
Task CRUD and Management Views

GET    /api/ase-leads/tasks/my-tasks/
POST   /api/ase-leads/tasks/
PATCH  /api/ase-leads/tasks/{id}/
POST   /api/ase-leads/tasks/{id}/complete/
GET    /api/ase-leads/tasks/overdue/

These endpoints provide task management for ASE marketing team members.

Access Control:
  - User must be authenticated
  - User must pass ASEMarketingPermission (company + team checks)
  - Update: only the task creator, assignee, or admin can modify
  - Complete: only the assignee or admin can complete
"""

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.task import ASELeadTask
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadTaskSerializer

User = get_user_model()

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

    serializer = ASELeadTaskSerializer(page.object_list, many=True, context={'request': request})
    return {
        'results': serializer.data,
        'count': paginator.count,
        'page': page.number,
        'total_pages': paginator.num_pages,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def my_tasks(request):
    """
    List tasks assigned to the current user with optional filtering and ordering.

    Query Parameters:
      - status (optional): Filter by task status (pending, in_progress, completed, cancelled)
      - priority (optional): Filter by priority (low, medium, high, urgent)
      - task_type (optional): Filter by task type (call, email, meeting, research, proposal, followup, other)
      - ordering (optional): Order by field (due_date, -due_date, priority, -priority, created_at, -created_at)
      - page (optional): Page number for pagination (default: 1)

    Returns:
      200 with paginated task list
    """
    # Admin, manager, and team_lead see all tasks; others see only their own
    if request.user.role in ('admin', 'manager', 'team_lead'):
        tasks = ASELeadTask.objects.all().select_related('lead', 'assigned_to', 'created_by')
    else:
        tasks = ASELeadTask.objects.filter(
            assigned_to=request.user
        ).select_related('lead', 'assigned_to', 'created_by')

    # Filter by status
    task_status = request.query_params.get('status')
    if task_status:
        tasks = tasks.filter(status=task_status)

    # Filter by priority
    priority = request.query_params.get('priority')
    if priority:
        tasks = tasks.filter(priority=priority)

    # Filter by task_type
    task_type = request.query_params.get('task_type')
    if task_type:
        tasks = tasks.filter(task_type=task_type)

    # Ordering: by default, pending/in_progress at top, completed next, cancelled at bottom
    # Within each group, newest first
    ordering = request.query_params.get('ordering', '')
    valid_orderings = [
        'due_date', '-due_date',
        'priority', '-priority',
        'created_at', '-created_at',
    ]
    if ordering in valid_orderings:
        tasks = tasks.order_by(ordering)
    else:
        # Custom status-based ordering: pending/in_progress → top, completed → middle, cancelled → bottom
        from django.db.models import Case, When, Value, IntegerField
        tasks = tasks.annotate(
            status_order=Case(
                When(status='pending', then=Value(0)),
                When(status='in_progress', then=Value(1)),
                When(status='completed', then=Value(2)),
                When(status='cancelled', then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

    # Paginate and return
    data = _paginate_queryset(tasks, request)
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def create_task(request):
    """
    Create a new task for a lead.

    Request body:
      - lead_id (optional): ID of the lead this task is for (standalone tasks don't need a lead)
      - assigned_to (optional): User ID of the person assigned to this task (defaults to current user)
      - task_type (required): One of call, email, meeting, research, proposal, followup, other
      - title (required): Brief title of the task
      - description (optional): Detailed description
      - priority (optional): low, medium, high, urgent (default: medium)
      - due_date (required): When this task is due (ISO datetime)

    Returns:
      201 with serialized task on success
      400 if validation fails
    """
    # Validate required fields
    lead_id = request.data.get('lead_id')
    assigned_to_id = request.data.get('assigned_to')
    task_type = request.data.get('task_type', '').strip() if request.data.get('task_type') else ''
    title = request.data.get('title', '').strip() if request.data.get('title') else ''
    due_date = request.data.get('due_date')

    if not assigned_to_id:
        # Default to current user if not provided
        assigned_to_id = request.user.id

    if not task_type:
        return Response(
            {'error': 'task_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_task_types = ['call', 'email', 'meeting', 'research', 'proposal', 'followup', 'other']
    if task_type not in valid_task_types:
        return Response(
            {'error': f'task_type must be one of: {", ".join(valid_task_types)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not title:
        return Response(
            {'error': 'title is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not due_date:
        return Response(
            {'error': 'due_date is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate lead exists (optional - standalone tasks don't need a lead)
    lead = None
    if lead_id:
        try:
            lead = ASELead.objects.get(pk=lead_id)
        except ASELead.DoesNotExist:
            return Response(
                {'error': 'Lead not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Validate assigned_to user exists
    try:
        assigned_user = User.objects.get(pk=assigned_to_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Assigned user not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Parse due_date
    from django.utils.dateparse import parse_datetime
    if isinstance(due_date, str):
        parsed_due_date = parse_datetime(due_date)
        if not parsed_due_date:
            return Response(
                {'error': 'due_date must be a valid ISO datetime.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        due_date = parsed_due_date

    # Build task data
    task_data = {
        'lead': lead,
        'assigned_to': assigned_user,
        'created_by': request.user,
        'task_type': task_type,
        'title': title,
        'due_date': due_date,
    }

    # Optional fields
    description = request.data.get('description')
    if description:
        task_data['description'] = description

    priority = request.data.get('priority', 'medium')
    if priority:
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        if priority not in valid_priorities:
            return Response(
                {'error': f'priority must be one of: {", ".join(valid_priorities)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task_data['priority'] = priority

    # Create the task
    task = ASELeadTask.objects.create(**task_data)

    # Return serialized task
    serializer = ASELeadTaskSerializer(task, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def update_task(request, pk):
    """
    Update an existing task. Only the creator, assignee, or admin can update.

    Request body: any subset of updatable fields:
      - title, description, priority, status, due_date, reminder_date

    Returns:
      200 with serialized task on success
      403 if user is not the creator, assignee, or admin
      404 if task not found
    """
    # Fetch the task
    try:
        task = ASELeadTask.objects.select_related('lead', 'assigned_to', 'created_by').get(pk=pk)
    except ASELeadTask.DoesNotExist:
        return Response(
            {'error': 'Task not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission check: only creator, assignee, or admin can update
    user = request.user
    if user.role != 'admin' and task.assigned_to_id != user.id and task.created_by_id != user.id:
        return Response(
            {'error': 'Only the task creator, assignee, or admin can update this task.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Update only provided fields
    updatable_fields = ['title', 'description', 'priority', 'status', 'due_date', 'reminder_date']

    for field in updatable_fields:
        if field in request.data:
            value = request.data[field]
            # Special handling for date fields
            if field in ('due_date', 'reminder_date') and value and isinstance(value, str):
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(value)
                if parsed:
                    value = parsed
            setattr(task, field, value)

    task.save()

    # Return serialized task
    serializer = ASELeadTaskSerializer(task, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def complete_task(request, pk):
    """
    Mark a task as completed. Only the assignee or admin can complete.

    Sets status='completed' and completed_at=now.

    Returns:
      200 with serialized task on success
      403 if user is not the assignee or admin
      404 if task not found
    """
    # Fetch the task
    try:
        task = ASELeadTask.objects.select_related('lead', 'assigned_to', 'created_by').get(pk=pk)
    except ASELeadTask.DoesNotExist:
        return Response(
            {'error': 'Task not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission check: only assignee or admin can complete
    user = request.user
    if user.role != 'admin' and task.assigned_to_id != user.id:
        return Response(
            {'error': 'Only the task assignee or admin can complete this task.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Mark as completed
    task.status = 'completed'
    task.completed_at = timezone.now()
    task.closed_by = user  # Set who completed/closed the task
    task.save()

    # Return serialized task
    serializer = ASELeadTaskSerializer(task, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def overdue_tasks(request):
    """
    List overdue tasks assigned to the current user.

    Returns tasks where due_date < now AND status NOT in ('completed', 'cancelled').

    Query Parameters:
      - page (optional): Page number for pagination (default: 1)

    Returns:
      200 with paginated overdue task list
    """
    now = timezone.now()
    tasks = ASELeadTask.objects.filter(
        assigned_to=request.user,
        due_date__lt=now,
    ).exclude(
        status__in=['completed', 'cancelled']
    ).select_related('lead', 'assigned_to', 'created_by').order_by('due_date')

    # Paginate and return
    data = _paginate_queryset(tasks, request)
    return Response(data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def delete_task(request, pk):
    """
    Delete a task. Only the creator, assignee, or admin can delete.
    """
    try:
        task = ASELeadTask.objects.get(pk=pk)
    except ASELeadTask.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if user.role not in ('admin', 'manager', 'team_lead') and task.assigned_to_id != user.id and task.created_by_id != user.id:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    task.delete()
    return Response({'message': 'Task deleted.'}, status=status.HTTP_204_NO_CONTENT)
