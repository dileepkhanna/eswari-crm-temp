from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, NumberFilter, CharFilter
from django.db import models, transaction
from django.db.models import Q
from .models import Lead
from .serializers import LeadSerializer
from accounts.permissions import filter_by_user_access, can_hr_access_module, CompanyAccessPermission
from utils.mixins import CompanyFilterMixin
from eswari_crm.ws_utils import notify_company


class LeadFilter(FilterSet):
    status = CharFilter(field_name='status')
    source = CharFilter(field_name='source')
    requirement_type = CharFilter(field_name='requirement_type')
    user = NumberFilter(method='filter_by_user')

    def filter_by_user(self, queryset, name, value):
        """Filter leads where assigned_to OR created_by matches the given user ID"""
        return queryset.filter(Q(assigned_to=value) | Q(created_by=value)).distinct()

    class Meta:
        model = Lead
        fields = ['status', 'source', 'requirement_type', 'user']


class LeadPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 2000  # Increased to support larger datasets


class LeadViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [CompanyAccessPermission]
    pagination_class = LeadPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LeadFilter
    search_fields = ['name', 'email', 'phone', 'address', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    
    def check_permissions(self, request):
        """Block HR users from accessing leads"""
        super().check_permissions(request)
        if request.user.role == 'hr':
            raise PermissionDenied("Access denied. HR users do not have permission to access this module.")
    
    def get_queryset(self):
        """
        Role-based lead filtering with optimized queries
        """
        user = self.request.user
        
        # Base queryset with optimized joins
        base_queryset = Lead.objects.select_related(
            'company', 'assigned_to', 'created_by'
        ).prefetch_related(
            'assigned_to__employees'  # For manager queries
        )
        
        # Use the centralized permission filter
        queryset = filter_by_user_access(
            base_queryset,
            user,
            assigned_to_field='assigned_to',
            created_by_field='created_by'
        )
        
        # Filter out disabled leads by default (unless explicitly requested)
        show_disabled = self.request.query_params.get('show_disabled', 'false').lower()
        if show_disabled != 'true':
            queryset = queryset.filter(is_disabled=False)
        
        return queryset
    
    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        # Send real-time notification to company members
        if instance.company_id:
            notify_company(
                company_id=instance.company_id,
                event_type='lead_created',
                data={
                    'entity': 'leads',
                    'action': 'created',
                    'record_id': instance.id,
                    'name': instance.name,
                }
            )
    
    def perform_destroy(self, instance):
        user = self.request.user
        company_id = instance.company_id
        record_id = instance.id
        if user.role in ['admin', 'manager', 'employee']:
            instance.delete()
            # Send real-time notification
            if company_id:
                notify_company(
                    company_id=company_id,
                    event_type='lead_deleted',
                    data={
                        'entity': 'leads',
                        'action': 'deleted',
                        'record_id': record_id,
                    }
                )
        else:
            raise PermissionDenied("You do not have permission to delete leads.")
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import leads in a single DB transaction.
        Auto-assigns leads round-robin to active employees in the company.
        Expects: {"leads": [{...}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        rows = request.data.get('leads', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No leads provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User as UserModel

        # Build assignee pool for round-robin
        if user.role == 'employee':
            assignees = [user]
        elif user.role == 'manager':
            team_ids = list(
                UserModel.objects.filter(
                    manager=user, company=company, is_active=True
                ).values_list('id', flat=True)
            )
            team_ids.append(user.id)
            assignees = list(UserModel.objects.filter(id__in=team_ids))
        else:
            # admin/hr — assign across all active employees in company
            assignees = list(
                UserModel.objects.filter(
                    company=company, role='employee', is_active=True
                )
            )
            if not assignees:
                assignees = [user]

        to_create = []
        errors = []

        for i, row in enumerate(rows):
            try:
                assigned_to = assignees[i % len(assignees)]
                obj = Lead(
                    name=row.get('name', ''),
                    phone=row.get('phone', ''),
                    email=row.get('email', ''),
                    address=row.get('address', ''),
                    requirement_type=row.get('requirement_type', 'apartment'),
                    bhk_requirement=row.get('bhk_requirement', '2'),
                    budget_min=row.get('budget_min', 0) or 0,
                    budget_max=row.get('budget_max', 0) or 0,
                    preferred_location=row.get('preferred_location', ''),
                    status=row.get('status', 'new'),
                    source=row.get('source', 'website'),
                    description=row.get('description', ''),
                    company=company,
                    created_by=user,
                    assigned_to=assigned_to,
                )
                to_create.append(obj)
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with transaction.atomic():
                created = Lead.objects.bulk_create(
                    to_create,
                    batch_size=500,
                    ignore_conflicts=True,  # skip duplicate phone+company rows
                )
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Expects: {"lead_ids": [1, 2, 3, ...]}
        """
        user = request.user
        lead_ids = request.data.get('lead_ids', [])

        if not lead_ids:
            return Response({'error': 'No lead IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        if user.role not in ['admin', 'manager', 'employee']:
            raise PermissionDenied("You do not have permission to delete leads.")

        # Scope to user's accessible leads then filter by requested IDs
        qs = self.get_queryset().filter(id__in=lead_ids)
        count = qs.count()

        if count == 0:
            return Response(
                {'error': 'No leads could be deleted', 'details': ['No matching leads found or not assigned to you']},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            Lead.objects.filter(id__in=qs.values_list('id', flat=True)).delete()

        return Response({
            'deleted_count': count,
            'requested_count': len(lead_ids),
            'success': True,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_delete_by_filter(self, request):
        """
        Delete all leads matching the given filters (search, status, source, etc.)
        Used for cross-page "select all matching" bulk delete.
        Expects: {"search": "...", "status": "new", ...}  (all optional)
        Returns: {"deleted_count": N}
        """
        user = request.user
        if user.role not in ['admin', 'manager', 'employee']:
            raise PermissionDenied("Only admins, managers and employees can bulk delete by filter.")

        # Build queryset using the same logic as get_queryset
        # For employees, get_queryset already scopes to their assigned leads only
        queryset = self.get_queryset()

        # Apply the same filters the frontend is using
        search = request.data.get('search', '').strip()
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(address__icontains=search) |
                Q(description__icontains=search)
            )

        status_filter = request.data.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        source_filter = request.data.get('source', '').strip()
        if source_filter:
            queryset = queryset.filter(source=source_filter)

        count = queryset.count()
        with transaction.atomic():
            # Must filter by IDs because delete() doesn't work on distinct() querysets
            Lead.objects.filter(id__in=queryset.values_list('id', flat=True)).delete()

        return Response({'deleted_count': count}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def assignable_users(self, request):
        """
        Get list of users that can be assigned leads based on the requesting user's role.
        - Admin: Returns all employees and managers in the requested company (or their own company)
        - Manager: Returns their team members and themselves
        - Employee: Returns only themselves
        """
        user = request.user
        from accounts.models import User as UserModel
        from accounts.serializers import UserSerializer
        
        if user.role == 'admin':
            # Admin can assign to any employee or manager IN THE REQUESTED COMPANY
            # Support ?company=<id> parameter for multi-company admins
            company_id = request.query_params.get('company')
            if company_id:
                try:
                    from accounts.models import Company
                    company = Company.objects.get(id=company_id)
                except Company.DoesNotExist:
                    company = user.company
            else:
                company = user.company
            
            assignable = UserModel.objects.filter(
                role__in=['employee', 'manager', 'telecaller'],
                is_active=True,
                company=company  # ✅ FILTER BY REQUESTED OR USER'S COMPANY
            ).select_related('company').order_by('first_name', 'last_name')
        
        elif user.role == 'manager':
            # Manager can assign to their team members or themselves
            team_members = UserModel.objects.filter(
                manager=user,
                company=user.company,
                is_active=True
            )
            # Include the manager themselves
            assignable = team_members | UserModel.objects.filter(id=user.id)
            assignable = assignable.select_related('company').order_by('first_name', 'last_name')
        
        elif user.role == 'employee':
            # Employee can only assign to themselves
            assignable = UserModel.objects.filter(id=user.id)
        
        else:
            assignable = UserModel.objects.none()
        
        serializer = UserSerializer(assignable, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='convert-to-task')
    def convert_to_task(self, request, pk=None):
        """
        Convert lead to task
        
        Request Body:
            - title (required): Task title
            - description (optional): Task description
            - priority (optional): Task priority (low, medium, high, urgent)
            - status (optional): Task status
            - due_date (optional): Task due date
            - assigned_to_id (optional): User to assign task to (defaults to lead's assigned_to)
            - project_id (optional): Project to assign task to
        
        Returns:
            - success: Boolean indicating if conversion was successful
            - task: Serialized task data
            - message: Success or error message
        """
        from tasks.models import Task
        from tasks.serializers import TaskSerializer
        from projects.models import Project
        from django.utils import timezone
        import logging
        
        logger = logging.getLogger(__name__)
        
        lead = self.get_object()
        
        # Log the incoming request data for debugging
        logger.info(f"Convert to task request - Lead ID: {lead.id}, Request data: {request.data}")
        
        # Permission check: Only assigned user or admin/manager can convert
        user = request.user
        if user.role == 'employee' and lead.assigned_to != user:
            return Response({
                'success': False,
                'error': 'permission_denied',
                'message': 'You can only convert leads assigned to you.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if lead is already converted
        if lead.is_disabled or lead.converted_task_id:
            return Response({
                'success': False,
                'error': 'already_converted',
                'message': 'This lead has already been converted to a task.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get task data from request
        task_data = request.data
        title = task_data.get('title', f"Task for {lead.name}")
        description = task_data.get('description', lead.description or '')
        priority = task_data.get('priority', 'medium')
        status_value = task_data.get('status', 'in_progress')
        due_date = task_data.get('due_date')
        
        # Determine who to assign the task to
        assigned_to_id = task_data.get('assigned_to_id')
        if assigned_to_id:
            from accounts.models import User as UserModel
            try:
                assigned_to = UserModel.objects.get(id=assigned_to_id, company=lead.company)
            except UserModel.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'invalid_user',
                    'message': 'Assigned user not found or not in the same company.'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            assigned_to = lead.assigned_to or user
        
        # Get project if specified
        project = None
        project_id = task_data.get('project_id')
        
        logger.info(f"Project ID received: {repr(project_id)}, Type: {type(project_id)}")
        
        # Convert empty string, 'none', null, or undefined to None
        if project_id in ['', 'none', None, 'null', 'undefined']:
            logger.info(f"Project ID is empty/none, setting to None")
            project_id = None
        
        if project_id:
            try:
                logger.info(f"Looking up project with ID: {project_id} for company: {lead.company.id}")
                project = Project.objects.get(id=project_id, company=lead.company)
                logger.info(f"Found project: {project.name}")
            except Project.DoesNotExist:
                logger.warning(f"Project {project_id} not found for company {lead.company.id}, creating task without project")
                # Don't fail - just create task without project
                # This handles cases where lead has invalid project assigned
                project = None
        
        try:
            with transaction.atomic():
                # Create task from lead
                task = Task.objects.create(
                    title=title,
                    description=description,
                    lead=lead,
                    converted_from_lead_id=lead.id,
                    converted_at=timezone.now(),
                    converted_by=user,
                    status=status_value,
                    priority=priority,
                    project=project,
                    company=lead.company,
                    assigned_to=assigned_to,
                    created_by=user,
                    due_date=due_date
                )
                
                # Mark lead as disabled and converted (HIDE from leads list)
                lead.is_disabled = True
                lead.converted_task_id = task.id
                lead.converted_at = timezone.now()
                lead.save(update_fields=['is_disabled', 'converted_task_id', 'converted_at', 'updated_at'])
                
                # Serialize and return task
                task_serializer = TaskSerializer(task)
                
                # Send real-time notification
                if lead.company_id:
                    notify_company(
                        company_id=lead.company_id,
                        event_type='lead_converted_to_task',
                        data={
                            'entity': 'leads',
                            'action': 'converted',
                            'lead_id': lead.id,
                            'task_id': task.id,
                            'lead_name': lead.name,
                        }
                    )
                
                return Response({
                    'success': True,
                    'task': task_serializer.data,
                    'message': 'Lead successfully converted to task.'
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': 'conversion_failed',
                'message': f'Failed to convert lead to task: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)