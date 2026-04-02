from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models, transaction
from .models import Task
from .serializers import TaskSerializer
from accounts.permissions import filter_by_user_access, can_hr_access_module, CompanyAccessPermission
from utils.mixins import CompanyFilterMixin


class TaskPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10000


class TaskViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    pagination_class = TaskPagination
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'assigned_to']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['-created_at']
    
    def check_permissions(self, request):
        """Block HR users from accessing tasks"""
        super().check_permissions(request)
        if request.user.role == 'hr':
            raise PermissionDenied("Access denied. HR users do not have permission to access this module.")
    
    def get_queryset(self):
        """
        Role-based task filtering using centralized permission system
        """
        user = self.request.user
        base_queryset = Task.objects.select_related(
            'company', 'assigned_to', 'created_by', 'project', 'lead'
        )
        
        # Use the centralized permission filter
        queryset = filter_by_user_access(
            base_queryset,
            user,
            assigned_to_field='assigned_to',
            created_by_field='created_by'
        )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import tasks in a single DB transaction.
        Expects: {"tasks": [{title, status, priority, description, due_date, lead_id, project_id, assigned_to_id}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        rows = request.data.get('tasks', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No tasks provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        from leads.models import Lead
        from projects.models import Project
        from django.contrib.auth import get_user_model
        User = get_user_model()

        to_create = []
        errors = []

        for i, row in enumerate(rows):
            try:
                lead = None
                if row.get('lead_id'):
                    lead = Lead.objects.filter(id=row['lead_id'], company=company).first()

                project = None
                if row.get('project_id'):
                    project = Project.objects.filter(id=row['project_id'], company=company).first()

                assigned_to = None
                if row.get('assigned_to_id'):
                    assigned_to = User.objects.filter(id=row['assigned_to_id']).first()

                obj = Task(
                    title=row.get('title', ''),
                    description=row.get('description', ''),
                    status=row.get('status', 'in_progress'),
                    priority=row.get('priority', 'medium'),
                    lead=lead,
                    project=project,
                    assigned_to=assigned_to,
                    company=company,
                    created_by=user,
                )
                if row.get('due_date'):
                    from django.utils.dateparse import parse_datetime, parse_date
                    dt = parse_datetime(str(row['due_date'])) or parse_date(str(row['due_date']))
                    if dt:
                        obj.due_date = dt
                to_create.append(obj)
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with transaction.atomic():
                created = Task.objects.bulk_create(to_create, batch_size=500)
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)