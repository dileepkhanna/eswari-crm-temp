from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from django.db import transaction

from accounts.permissions import CompanyAccessPermission
from utils.mixins import CompanyFilterMixin
from .models import ASELead
from .serializers import ASELeadSerializer, ASELeadListSerializer


class ASELeadPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class ASELeadViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing ASE Leads
    """
    queryset = ASELead.objects.none()  # Required by DRF router; actual data from get_queryset
    serializer_class = ASELeadSerializer
    permission_classes = [IsAuthenticated, CompanyAccessPermission]
    pagination_class = ASELeadPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Search fields
    search_fields = [
        'company_name',
        'contact_person',
        'email',
        'phone',
        'industry',
        'notes',
    ]
    
    # Filter fields
    filterset_fields = [
        'status',
        'priority',
        'industry',
        'assigned_to',
        'has_website',
        'has_social_media',
    ]
    
    # Ordering fields
    ordering_fields = [
        'created_at',
        'updated_at',
        'company_name',
        'status',
        'priority',
        'next_follow_up',
        'estimated_project_value',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ASELead.objects.select_related('company', 'assigned_to', 'created_by').all()

        if user.role == 'admin':
            return qs
        if user.role == 'hr':
            return qs.filter(company=user.company)

        qs = qs.filter(company=user.company)

        if user.role == 'employee':
            return qs.filter(assigned_to=user)

        if user.role == 'manager':
            employee_ids = list(
                user.__class__.objects.filter(manager=user, company=user.company).values_list('id', flat=True)
            )
            employee_ids.append(user.id)
            return qs.filter(Q(assigned_to__id__in=employee_ids) | Q(created_by__id__in=employee_ids)).distinct()

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ASELeadListSerializer
        return ASELeadSerializer

    def perform_create(self, serializer):
        """
        Set created_by when creating ASE lead
        Company assignment is handled in the serializer
        """
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def check_phone(self, request):
        """
        Check if a phone number already exists in the company.
        Query params: ?phone=<number>&exclude_id=<id> (exclude_id for edit mode)
        Returns: {"exists": true/false}
        """
        phone = request.query_params.get('phone', '').strip()
        exclude_id = request.query_params.get('exclude_id')
        if not phone:
            return Response({'exists': False})
        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'exists': False})
        qs = ASELead.objects.filter(phone=phone, company=company)
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        return Response({'exists': qs.exists()})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get ASE lead statistics
        """
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_status': {},
            'by_priority': {},
            'by_industry': {},
            'total_estimated_value': 0,
            'total_monthly_retainer': 0,
        }
        
        # Status breakdown
        for status_choice in ASELead.STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(status=status_code).count()
            stats['by_status'][status_code] = {
                'count': count,
                'label': status_choice[1]
            }
        
        # Priority breakdown
        priority_choices = [
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ]
        for priority_choice in priority_choices:
            priority_code = priority_choice[0]
            count = queryset.filter(priority=priority_code).count()
            stats['by_priority'][priority_code] = {
                'count': count,
                'label': priority_choice[1]
            }
        
        # Calculate totals using DB aggregation (no Python loops)
        totals = queryset.aggregate(
            total_value=Sum('estimated_project_value'),
            total_retainer=Sum('monthly_retainer'),
        )
        stats['total_estimated_value'] = totals['total_value'] or 0
        stats['total_monthly_retainer'] = totals['total_retainer'] or 0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def follow_ups(self, request):
        """
        Get leads that need follow-up
        """
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            next_follow_up__date__lte=today
        ).exclude(
            status__in=['won', 'lost']
        )
        
        serializer = ASELeadListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def high_priority(self, request):
        """
        Get high priority leads
        """
        queryset = self.get_queryset().filter(
            priority__in=['high', 'urgent']
        ).exclude(
            status__in=['won', 'lost']
        )
        
        serializer = ASELeadListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import ASE leads in a single DB transaction.
        Expects: {"leads": [{...}, {...}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        rows = request.data.get('leads', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No leads provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        to_create = []
        errors = []

        for i, row in enumerate(rows):
            try:
                obj = ASELead(
                    company_name=row.get('company_name', ''),
                    contact_person=row.get('contact_person', ''),
                    email=row.get('email') or None,
                    phone=row.get('phone', ''),
                    website=row.get('website') or None,
                    industry=row.get('industry', 'other'),
                    budget_amount=row.get('budget_amount', ''),
                    status=row.get('status', 'new'),
                    priority=row.get('priority', 'medium'),
                    marketing_goals=row.get('marketing_goals', ''),
                    notes=row.get('notes', ''),
                    has_website=bool(row.get('has_website', False)),
                    has_social_media=bool(row.get('has_social_media', False)),
                    service_interests=row.get('service_interests', []),
                    company=company,
                    created_by=user,
                )
                to_create.append(obj)
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with transaction.atomic():
                created = ASELead.objects.bulk_create(to_create, batch_size=500)
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_delete_by_filter(self, request):
        """
        Delete all ASE leads matching the given filters.
        Used for cross-page "select all matching" bulk delete.
        Expects: {"search": "...", "status": "new", "priority": "high"}  (all optional)
        Returns: {"deleted_count": N}
        """
        user = request.user
        if user.role not in ['admin', 'manager']:
            raise PermissionDenied("Only admins and managers can bulk delete by filter.")

        queryset = self.get_queryset()

        search = request.data.get('search', '').strip()
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(contact_person__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(notes__icontains=search)
            )

        status_filter = request.data.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority_filter = request.data.get('priority', '').strip()
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        count = queryset.count()
        with transaction.atomic():
            queryset.delete()

        return Response({'deleted_count': count}, status=status.HTTP_200_OK)