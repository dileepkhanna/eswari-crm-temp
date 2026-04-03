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
    max_page_size = 500


class LeadViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [CompanyAccessPermission]
    pagination_class = LeadPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LeadFilter
    search_fields = ['name', 'email', 'address', 'description']
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
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in ['admin', 'manager', 'employee']:
            instance.delete()
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