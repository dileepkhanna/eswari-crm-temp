"""
Analytics Views — GET /api/ase-leads/analytics/...

Provides team performance, individual performance, pipeline overview,
and conversion rate analytics for the ASE Marketing Panel.

Endpoints
─────────
  GET /api/ase-leads/analytics/team-performance/   (admin/marketing_lead only)
  GET /api/ase-leads/analytics/my-performance/     (any marketing user)
  GET /api/ase-leads/analytics/pipeline/           (admin/marketing_lead only)
  GET /api/ase-leads/analytics/conversion-rates/   (admin/marketing_lead only)

Caching
───────
Results are cached for 5 minutes.
Cache key format: ase_analytics_{endpoint}_{user_id} or ase_analytics_{endpoint}_global
"""

from django.core.cache import cache
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.permissions import ASEMarketingPermission
from teams.models import Team


# Cache TTL: 5 minutes (300 seconds)
CACHE_TTL = 300


def _get_period_start(period):
    """
    Return the start date for the given period string.

    Supported periods: today, week, month (default), quarter.
    """
    today = timezone.now().date()
    if period == 'today':
        return today
    elif period == 'week':
        return today - timedelta(days=today.weekday())
    elif period == 'quarter':
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        return today.replace(month=quarter_month, day=1)
    else:
        # Default: month
        return today.replace(day=1)


def _is_admin_or_lead(user):
    """Check if user is admin or marketing_lead."""
    if user.role == 'admin':
        return True
    if hasattr(user, 'team') and user.team and user.team.marketing_category == 'marketing_lead':
        return True
    return False


# ══════════════════════════════════════════════════════════════════════════════
# Team Performance
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def team_performance(request):
    """
    Return team performance metrics grouped by role (BRE, BOE, CRE).

    Only accessible by admin or marketing_lead.
    Supports ?period= query param (today, week, month - default: month).
    """
    user = request.user

    # Role restriction
    if not _is_admin_or_lead(user):
        return Response(
            {'detail': 'Only admin or marketing lead can access team performance.'},
            status=status.HTTP_403_FORBIDDEN
        )

    period = request.query_params.get('period', 'month')
    period_start = _get_period_start(period)

    # Check cache
    cache_key = f'ase_analytics_team_performance_global_{period}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    company = user.company

    # Get team members by category
    bre_members = Team.objects.filter(
        company=company, marketing_category='bre', is_active=True
    )
    boe_members = Team.objects.filter(
        company=company, marketing_category='boe', is_active=True
    )
    cre_members = Team.objects.filter(
        company=company, marketing_category='cre', is_active=True
    )

    # BRE metrics
    bre_data = _calculate_bre_team_metrics(company, period_start)
    # BOE metrics
    boe_data = _calculate_boe_team_metrics(company, period_start)
    # CRE metrics
    cre_data = _calculate_cre_team_metrics(company, period_start)

    result = {
        'period': period,
        'period_start': str(period_start),
        'bre': {
            'member_count': bre_members.count(),
            'metrics': bre_data['metrics'],
            'top_performer': bre_data['top_performer'],
        },
        'boe': {
            'member_count': boe_members.count(),
            'metrics': boe_data['metrics'],
            'top_performer': boe_data['top_performer'],
        },
        'cre': {
            'member_count': cre_members.count(),
            'metrics': cre_data['metrics'],
            'top_performer': cre_data['top_performer'],
        },
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


def _calculate_bre_team_metrics(company, period_start):
    """Calculate BRE team metrics for the given period."""
    leads_researched = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        research_completed_at__date__gte=period_start
    ).count()

    leads_qualified = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        status='qualified',
        research_completed_at__date__gte=period_start
    ).count()

    leads_disqualified = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        disqualification_reason__isnull=False,
        research_completed_at__date__gte=period_start
    ).count()

    qualification_rate = round((leads_qualified / leads_researched) * 100, 1) if leads_researched > 0 else 0

    avg_lead_score = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        research_completed_at__date__gte=period_start,
        lead_score__gt=0
    ).aggregate(avg=Avg('lead_score'))['avg']
    avg_lead_score = round(avg_lead_score, 1) if avg_lead_score else 0

    # Top performer (most leads researched)
    top_performer = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        research_completed_at__date__gte=period_start
    ).values('researched_by__username', 'researched_by__first_name', 'researched_by__last_name').annotate(
        count=Count('id')
    ).order_by('-count').first()

    top_performer_name = None
    if top_performer:
        first = top_performer['researched_by__first_name'] or ''
        last = top_performer['researched_by__last_name'] or ''
        top_performer_name = f"{first} {last}".strip() or top_performer['researched_by__username']

    return {
        'metrics': {
            'leads_researched': leads_researched,
            'leads_qualified': leads_qualified,
            'leads_disqualified': leads_disqualified,
            'qualification_rate': qualification_rate,
            'avg_lead_score': avg_lead_score,
        },
        'top_performer': top_performer_name,
    }


def _calculate_boe_team_metrics(company, period_start):
    """Calculate BOE team metrics for the given period."""
    calls_made = ASELeadActivity.objects.filter(
        lead__company=company,
        activity_type='call',
        created_at__date__gte=period_start
    ).count()

    emails_sent = ASELeadActivity.objects.filter(
        lead__company=company,
        activity_type='email',
        created_at__date__gte=period_start
    ).count()

    leads_contacted = ASELead.objects.filter(
        company=company,
        contacted_by__isnull=False,
        first_contact_at__date__gte=period_start
    ).count()

    contact_rate = round((leads_contacted / calls_made) * 100, 1) if calls_made > 0 else 0

    avg_response_time = ASELead.objects.filter(
        company=company,
        contacted_by__isnull=False,
        first_contact_at__date__gte=period_start,
        response_time_hours__isnull=False
    ).aggregate(avg=Avg('response_time_hours'))['avg']
    avg_response_time = round(float(avg_response_time), 1) if avg_response_time else 0

    # Top performer (most calls made)
    top_performer = ASELeadActivity.objects.filter(
        lead__company=company,
        activity_type='call',
        created_at__date__gte=period_start
    ).values('user__username', 'user__first_name', 'user__last_name').annotate(
        count=Count('id')
    ).order_by('-count').first()

    top_performer_name = None
    if top_performer:
        first = top_performer['user__first_name'] or ''
        last = top_performer['user__last_name'] or ''
        top_performer_name = f"{first} {last}".strip() or top_performer['user__username']

    return {
        'metrics': {
            'calls_made': calls_made,
            'emails_sent': emails_sent,
            'leads_contacted': leads_contacted,
            'contact_rate': contact_rate,
            'avg_response_time': avg_response_time,
        },
        'top_performer': top_performer_name,
    }


def _calculate_cre_team_metrics(company, period_start):
    """Calculate CRE team metrics for the given period."""
    proposals_sent = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        proposal_sent_at__date__gte=period_start
    ).count()

    meetings_held = ASELeadActivity.objects.filter(
        lead__company=company,
        activity_type='meeting',
        created_at__date__gte=period_start
    ).count()

    deals_won = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        status='won',
        deal_closed_at__date__gte=period_start
    ).count()

    win_rate = round((deals_won / proposals_sent) * 100, 1) if proposals_sent > 0 else 0

    revenue = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        status='won',
        deal_closed_at__date__gte=period_start
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0

    # Top performer (most deals won)
    top_performer = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        status='won',
        deal_closed_at__date__gte=period_start
    ).values('managed_by__username', 'managed_by__first_name', 'managed_by__last_name').annotate(
        count=Count('id')
    ).order_by('-count').first()

    top_performer_name = None
    if top_performer:
        first = top_performer['managed_by__first_name'] or ''
        last = top_performer['managed_by__last_name'] or ''
        top_performer_name = f"{first} {last}".strip() or top_performer['managed_by__username']

    return {
        'metrics': {
            'proposals_sent': proposals_sent,
            'meetings_held': meetings_held,
            'deals_won': deals_won,
            'win_rate': win_rate,
            'revenue': float(revenue),
        },
        'top_performer': top_performer_name,
    }


# ══════════════════════════════════════════════════════════════════════════════
# My Performance
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def my_performance(request):
    """
    Return the current user's performance metrics.

    Supports ?period= query param (today, week, month - default: month).
    Returns role-specific metrics based on user's marketing_category.
    """
    user = request.user
    period = request.query_params.get('period', 'month')
    period_start = _get_period_start(period)

    # Check cache
    cache_key = f'ase_analytics_my_performance_{user.id}_{period}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    # Determine role
    if user.role == 'admin':
        marketing_category = 'marketing_lead'
    else:
        marketing_category = user.team.marketing_category

    company = user.company

    if marketing_category == 'bre':
        result = _my_bre_performance(user, company, period_start, period)
    elif marketing_category == 'boe':
        result = _my_boe_performance(user, company, period_start, period)
    elif marketing_category == 'cre':
        result = _my_cre_performance(user, company, period_start, period)
    else:
        # marketing_lead sees team-wide summary
        result = _my_lead_performance(user, company, period_start, period)

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


def _my_bre_performance(user, company, period_start, period):
    """Calculate individual BRE performance metrics."""
    leads_researched = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=period_start
    ).count()

    qualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        status='qualified',
        research_completed_at__date__gte=period_start
    ).count()

    disqualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        disqualification_reason__isnull=False,
        research_completed_at__date__gte=period_start
    ).count()

    qualification_rate = round((qualified / leads_researched) * 100, 1) if leads_researched > 0 else 0

    avg_lead_score = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=period_start,
        lead_score__gt=0
    ).aggregate(avg=Avg('lead_score'))['avg']
    avg_lead_score = round(avg_lead_score, 1) if avg_lead_score else 0

    return {
        'role': 'bre',
        'period': period,
        'period_start': str(period_start),
        'leads_researched': leads_researched,
        'qualified': qualified,
        'disqualified': disqualified,
        'qualification_rate': qualification_rate,
        'avg_lead_score': avg_lead_score,
    }


def _my_boe_performance(user, company, period_start, period):
    """Calculate individual BOE performance metrics."""
    calls_made = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='call',
        created_at__date__gte=period_start
    ).count()

    emails_sent = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='email',
        created_at__date__gte=period_start
    ).count()

    leads_contacted = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        first_contact_at__date__gte=period_start
    ).count()

    contact_rate = round((leads_contacted / calls_made) * 100, 1) if calls_made > 0 else 0

    avg_response_time = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        first_contact_at__date__gte=period_start,
        response_time_hours__isnull=False
    ).aggregate(avg=Avg('response_time_hours'))['avg']
    avg_response_time = round(float(avg_response_time), 1) if avg_response_time else 0

    return {
        'role': 'boe',
        'period': period,
        'period_start': str(period_start),
        'calls_made': calls_made,
        'emails_sent': emails_sent,
        'leads_contacted': leads_contacted,
        'contact_rate': contact_rate,
        'avg_response_time': avg_response_time,
    }


def _my_cre_performance(user, company, period_start, period):
    """Calculate individual CRE performance metrics."""
    proposals_sent = ASELead.objects.filter(
        company=company,
        managed_by=user,
        proposal_sent_at__date__gte=period_start
    ).count()

    meetings_held = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='meeting',
        created_at__date__gte=period_start
    ).count()

    deals_won = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        deal_closed_at__date__gte=period_start
    ).count()

    win_rate = round((deals_won / proposals_sent) * 100, 1) if proposals_sent > 0 else 0

    avg_deal_size = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        deal_closed_at__date__gte=period_start
    ).aggregate(avg=Avg('estimated_project_value'))['avg']
    avg_deal_size = round(float(avg_deal_size), 2) if avg_deal_size else 0

    revenue = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        deal_closed_at__date__gte=period_start
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0

    return {
        'role': 'cre',
        'period': period,
        'period_start': str(period_start),
        'proposals_sent': proposals_sent,
        'meetings_held': meetings_held,
        'deals_won': deals_won,
        'win_rate': win_rate,
        'avg_deal_size': avg_deal_size,
        'revenue': float(revenue),
    }


def _my_lead_performance(user, company, period_start, period):
    """Calculate marketing lead performance summary."""
    total_leads = ASELead.objects.filter(
        company=company,
        created_at__date__gte=period_start
    ).count()

    won = ASELead.objects.filter(
        company=company,
        status='won',
        deal_closed_at__date__gte=period_start
    ).count()

    revenue = ASELead.objects.filter(
        company=company,
        status='won',
        deal_closed_at__date__gte=period_start
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0

    overall_conversion = round((won / total_leads) * 100, 1) if total_leads > 0 else 0

    return {
        'role': 'marketing_lead',
        'period': period,
        'period_start': str(period_start),
        'total_leads': total_leads,
        'deals_won': won,
        'revenue': float(revenue),
        'overall_conversion': overall_conversion,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Pipeline Overview
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def pipeline_overview(request):
    """
    Return lead counts and total value by status for the company.

    Only accessible by admin or marketing_lead.
    """
    user = request.user

    # Role restriction
    if not _is_admin_or_lead(user):
        return Response(
            {'detail': 'Only admin or marketing lead can access pipeline overview.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check cache
    cache_key = 'ase_analytics_pipeline_global'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    company = user.company

    statuses = ['new', 'qualified', 'contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won', 'lost']

    pipeline = {}
    for s in statuses:
        qs = ASELead.objects.filter(company=company, status=s)
        count = qs.count()
        total_value = qs.aggregate(total=Sum('estimated_project_value'))['total'] or 0
        pipeline[s] = {
            'count': count,
            'total_value': float(total_value),
        }

    result = {
        'pipeline': pipeline,
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


# ══════════════════════════════════════════════════════════════════════════════
# Conversion Rates
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def conversion_rates(request):
    """
    Return stage-to-stage conversion rates.

    Only accessible by admin or marketing_lead.
    Supports ?period= query param (week, month, quarter - default: month).
    """
    user = request.user

    # Role restriction
    if not _is_admin_or_lead(user):
        return Response(
            {'detail': 'Only admin or marketing lead can access conversion rates.'},
            status=status.HTTP_403_FORBIDDEN
        )

    period = request.query_params.get('period', 'month')
    period_start = _get_period_start(period)

    # Check cache
    cache_key = f'ase_analytics_conversion_rates_global_{period}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    company = user.company

    # Count leads that entered each stage during the period
    new_leads = ASELead.objects.filter(
        company=company,
        created_at__date__gte=period_start
    ).count()

    qualified_leads = ASELead.objects.filter(
        company=company,
        research_completed_at__date__gte=period_start,
        status__in=['qualified', 'contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won']
    ).count()

    contacted_leads = ASELead.objects.filter(
        company=company,
        first_contact_at__date__gte=period_start,
        status__in=['contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won']
    ).count()

    proposal_leads = ASELead.objects.filter(
        company=company,
        proposal_sent_at__date__gte=period_start,
        status__in=['proposal_sent', 'negotiating', 'won']
    ).count()

    won_leads = ASELead.objects.filter(
        company=company,
        deal_closed_at__date__gte=period_start,
        status='won'
    ).count()

    # Calculate conversion rates
    new_to_qualified = round((qualified_leads / new_leads) * 100, 1) if new_leads > 0 else 0
    qualified_to_contacted = round((contacted_leads / qualified_leads) * 100, 1) if qualified_leads > 0 else 0
    contacted_to_proposal = round((proposal_leads / contacted_leads) * 100, 1) if contacted_leads > 0 else 0
    proposal_to_won = round((won_leads / proposal_leads) * 100, 1) if proposal_leads > 0 else 0
    overall_conversion = round((won_leads / new_leads) * 100, 1) if new_leads > 0 else 0

    result = {
        'period': period,
        'period_start': str(period_start),
        'new_to_qualified': new_to_qualified,
        'qualified_to_contacted': qualified_to_contacted,
        'contacted_to_proposal': contacted_to_proposal,
        'proposal_to_won': proposal_to_won,
        'overall_conversion': overall_conversion,
        'counts': {
            'new': new_leads,
            'qualified': qualified_leads,
            'contacted': contacted_leads,
            'proposal': proposal_leads,
            'won': won_leads,
        },
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)
