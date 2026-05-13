"""
Lead Queue View — GET /api/ase-leads/my-queue/

Returns a paginated, filtered, and sorted list of ASE leads scoped to the
requesting user's marketing role.

Role-based filtering
────────────────────
  Role              | Statuses visible
  ──────────────────┼──────────────────────────────────────────────────────
  admin             | All leads for their company (no status restriction)
  marketing_lead    | All leads for their company (full funnel visibility)
  BRE               | new, qualified
  BOE               | qualified, contacted, nurturing
  CRE               | contacted, proposal_sent, negotiating
  ──────────────────┴──────────────────────────────────────────────────────

Query parameters
────────────────
  ?ordering=<field>        Sort by field (prefix with '-' for descending).
                           Allowed: created_at, updated_at, priority, status,
                                    lead_score, engagement_level, company_name
  ?status=<value>          Filter by exact status value
  ?priority=<value>        Filter by exact priority value
  ?industry=<value>        Filter by exact industry value
  ?engagement_level=<val>  Filter by exact engagement_level value
  ?search=<text>           Case-insensitive search across company_name,
                           contact_person, and phone
  ?page=<n>                Page number (default: 1)
  ?page_size=<n>           Page size (default: 50, max: 2000)
"""

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework.pagination import PageNumberPagination

from ase_leads.models import ASELead
from ase_leads.permissions import ASEMarketingPermission
from ase_leads.serializers import ASELeadListSerializer


class ASELeadPagination(PageNumberPagination):
    """
    Pagination class for ASE lead list endpoints.
    Mirrors the settings used by ASELeadViewSet in views.py.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 2000


# ── Role → allowed statuses mapping ──────────────────────────────────────────
# Admin and marketing_lead are handled separately (no status restriction).
ROLE_STATUS_MAP = {
    'bre': ['new', 'qualified'],
    'boe': ['qualified', 'contacted', 'nurturing'],
    'cre': ['contacted', 'proposal_sent', 'negotiating'],
}

# Fields that callers are allowed to sort by
ALLOWED_ORDERING_FIELDS = {
    'created_at', '-created_at',
    'updated_at', '-updated_at',
    'priority', '-priority',
    'status', '-status',
    'lead_score', '-lead_score',
    'engagement_level', '-engagement_level',
    'company_name', '-company_name',
}


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def my_lead_queue(request):
    """
    Return the lead queue for the authenticated marketing user.

    Access is gated by ASEMarketingPermission (authentication + company +
    marketing team category). The queryset is then further narrowed by the
    user's marketing_category so each role only sees the leads relevant to
    their stage in the pipeline.
    """
    user = request.user

    # ── 1. Base queryset — always scope to the user's company ─────────────────
    # select_related avoids N+1 queries when the serializer accesses FK fields.
    qs = ASELead.objects.select_related(
        'company',
        'assigned_to',
        'created_by',
        'researched_by',
        'contacted_by',
        'managed_by',
    )

    if user.role == 'admin':
        # Admin sees all leads for their own company
        qs = qs.filter(company=user.company)
    else:
        # All non-admin users are scoped to their company (enforced by
        # ASEMarketingPermission, but we double-check here for safety)
        qs = qs.filter(company=user.company)

        # Apply role-based status filter
        marketing_category = user.team.marketing_category  # guaranteed non-None by permission
        if marketing_category in ROLE_STATUS_MAP:
            qs = qs.filter(status__in=ROLE_STATUS_MAP[marketing_category])
        # marketing_lead → no additional status filter (full funnel visibility)

    # ── 2. Optional filters from query params ─────────────────────────────────
    status_filter = request.query_params.get('status', '').strip()
    if status_filter:
        qs = qs.filter(status=status_filter)

    priority_filter = request.query_params.get('priority', '').strip()
    if priority_filter:
        qs = qs.filter(priority=priority_filter)

    industry_filter = request.query_params.get('industry', '').strip()
    if industry_filter:
        qs = qs.filter(industry=industry_filter)

    engagement_filter = request.query_params.get('engagement_level', '').strip()
    if engagement_filter:
        qs = qs.filter(engagement_level=engagement_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(company_name__icontains=search)
            | Q(contact_person__icontains=search)
            | Q(phone__icontains=search)
            | Q(notes__icontains=search)
        )

    # ── 3. Ordering ───────────────────────────────────────────────────────────
    ordering = request.query_params.get('ordering', '-created_at').strip()
    if ordering in ALLOWED_ORDERING_FIELDS:
        qs = qs.order_by(ordering)
    else:
        # Fall back to default ordering if an invalid field is supplied
        qs = qs.order_by('-created_at')

    # ── 4. Pagination ─────────────────────────────────────────────────────────
    paginator = ASELeadPagination()
    page = paginator.paginate_queryset(qs, request)
    if page is not None:
        serializer = ASELeadListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    # Fallback (should not normally be reached with PageNumberPagination)
    serializer = ASELeadListSerializer(qs, many=True)
    return Response(serializer.data)
