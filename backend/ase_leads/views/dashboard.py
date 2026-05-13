"""
Dashboard Stats View — GET /api/ase-leads/dashboard-stats/

Returns role-specific dashboard statistics for ASE Marketing team members.

Role-based metrics
──────────────────
  Role              | Metrics returned
  ──────────────────┼──────────────────────────────────────────────────────
  admin             | Marketing Lead dashboard (full team visibility)
  marketing_lead    | Team-wide metrics, revenue, KPIs, team performance
  BRE               | Research queue metrics, qualification rates, performance
  BOE               | Call/email metrics, daily targets, contact rates
  CRE               | Pipeline overview, proposal metrics, conversion rates
  ──────────────────┴──────────────────────────────────────────────────────

Caching
───────
Results are cached for 5 minutes per user to reduce database load.
Cache key format: ase_dashboard_stats_{user_id}
"""

from django.core.cache import cache
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ase_leads.models import ASELead
from ase_leads.models.activity import ASELeadActivity
from ase_leads.models.task import ASELeadTask
from ase_leads.permissions import ASEMarketingPermission


# Cache TTL: 5 minutes (300 seconds)
CACHE_TTL = 300


@api_view(['GET'])
@permission_classes([IsAuthenticated, ASEMarketingPermission])
def dashboard_stats(request):
    """
    Return dashboard statistics for the authenticated marketing user.

    Access is gated by ASEMarketingPermission (authentication + company +
    marketing team category). The statistics returned are tailored to the
    user's marketing_category so each role sees metrics relevant to their
    stage in the pipeline.
    """
    user = request.user

    # ── 1. Check cache first ─────────────────────────────────────────────────
    cache_key = f'ase_dashboard_stats_{user.id}'
    cached_stats = cache.get(cache_key)
    if cached_stats is not None:
        return Response(cached_stats)

    # ── 2. Determine role and calculate appropriate metrics ──────────────────
    # Admin sees Marketing Lead dashboard
    if user.role == 'admin':
        stats = _calculate_marketing_lead_stats(user)
    else:
        marketing_category = user.team.marketing_category
        if marketing_category == 'marketing_lead':
            stats = _calculate_marketing_lead_stats(user)
        elif marketing_category == 'bre':
            stats = _calculate_bre_stats(user)
        elif marketing_category == 'boe':
            stats = _calculate_boe_stats(user)
        elif marketing_category == 'cre':
            stats = _calculate_cre_stats(user)
        else:
            # Fallback for unrecognized category
            stats = {'error': 'Unknown marketing category'}

    # ── 3. Cache the results ──────────────────────────────────────────────────
    cache.set(cache_key, stats, CACHE_TTL)

    return Response(stats)


# ══════════════════════════════════════════════════════════════════════════════
# BRE Dashboard Stats
# ══════════════════════════════════════════════════════════════════════════════

def _calculate_bre_stats(user):
    """
    Calculate dashboard statistics for Business Research Executive (BRE).

    Metrics:
    - Research queue size (new leads)
    - Today's metrics (researched, qualified, disqualified)
    - This week's metrics
    - This month's metrics
    - Performance metrics (qualification rate, avg research time, quality score)
    """
    company = user.company
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # ── Research Queue ────────────────────────────────────────────────────────
    # New leads that need research
    research_queue_count = ASELead.objects.filter(
        company=company,
        status='new'
    ).count()

    # ── Today's Metrics ───────────────────────────────────────────────────────
    today_researched = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date=today
    ).count()

    today_qualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date=today,
        status='qualified'
    ).count()

    today_disqualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date=today,
        status='lost',
        disqualification_reason__isnull=False
    ).count()

    # ── This Week's Metrics ───────────────────────────────────────────────────
    week_researched = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=week_start
    ).count()

    week_qualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=week_start,
        status='qualified'
    ).count()

    # ── This Month's Metrics ──────────────────────────────────────────────────
    month_researched = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=month_start
    ).count()

    month_qualified = ASELead.objects.filter(
        company=company,
        researched_by=user,
        research_completed_at__date__gte=month_start,
        status='qualified'
    ).count()

    # ── Performance Metrics ───────────────────────────────────────────────────
    # Qualification rate (qualified / total researched)
    qualification_rate = 0
    if month_researched > 0:
        qualification_rate = round((month_qualified / month_researched) * 100, 1)

    # Average lead score for qualified leads
    avg_lead_score = ASELead.objects.filter(
        company=company,
        researched_by=user,
        status='qualified'
    ).aggregate(avg_score=Avg('lead_score'))['avg_score']
    avg_lead_score = round(avg_lead_score, 1) if avg_lead_score else 0

    # Quality score (based on avg lead score)
    quality_score = round(avg_lead_score / 10, 1) if avg_lead_score else 0

    return {
        'role': 'bre',
        'role_display': 'Business Research Executive',
        'research_queue': {
            'total': research_queue_count,
        },
        'today': {
            'researched': today_researched,
            'qualified': today_qualified,
            'disqualified': today_disqualified,
        },
        'this_week': {
            'researched': week_researched,
            'qualified': week_qualified,
        },
        'this_month': {
            'researched': month_researched,
            'qualified': month_qualified,
        },
        'performance': {
            'qualification_rate': qualification_rate,
            'avg_lead_score': avg_lead_score,
            'quality_score': quality_score,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# BOE Dashboard Stats
# ══════════════════════════════════════════════════════════════════════════════

def _calculate_boe_stats(user):
    """
    Calculate dashboard statistics for Business Outreach Executive (BOE).

    Metrics:
    - Call queue size (qualified leads)
    - Today's metrics (calls, emails, contacted)
    - Daily targets (calls, emails, contacts)
    - This week's metrics
    - This month's metrics
    - Performance metrics (contact rate, warm conversion, avg response time)
    """
    company = user.company
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # ── Call Queue ────────────────────────────────────────────────────────────
    # Qualified leads that need contact
    call_queue_count = ASELead.objects.filter(
        company=company,
        status__in=['qualified', 'contacted', 'nurturing']
    ).count()

    # ── Today's Metrics ───────────────────────────────────────────────────────
    today_calls = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='call',
        created_at__date=today
    ).count()

    today_emails = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='email',
        created_at__date=today
    ).count()

    today_contacted = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        first_contact_at__date=today
    ).count()

    # Warm leads created today (leads moved to warm/hot engagement)
    today_warm_leads = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        engagement_level__in=['warm', 'hot', 'very_hot'],
        last_engagement_date__date=today
    ).count()

    # ── Daily Targets ─────────────────────────────────────────────────────────
    # Standard targets for BOE role
    daily_targets = {
        'calls': 40,
        'emails': 30,
        'contacts': 20,
    }

    # ── This Week's Metrics ───────────────────────────────────────────────────
    week_calls = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='call',
        created_at__date__gte=week_start
    ).count()

    week_emails = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='email',
        created_at__date__gte=week_start
    ).count()

    week_contacted = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        first_contact_at__date__gte=week_start
    ).count()

    # ── This Month's Metrics ──────────────────────────────────────────────────
    month_calls = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='call',
        created_at__date__gte=month_start
    ).count()

    month_emails = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='email',
        created_at__date__gte=month_start
    ).count()

    month_contacted = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        first_contact_at__date__gte=month_start
    ).count()

    # ── Performance Metrics ───────────────────────────────────────────────────
    # Contact rate (contacted / total calls)
    contact_rate = 0
    if month_calls > 0:
        contact_rate = round((month_contacted / month_calls) * 100, 1)

    # Warm conversion rate (warm leads / contacted)
    warm_conversion = 0
    month_warm_leads = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        engagement_level__in=['warm', 'hot', 'very_hot'],
        last_engagement_date__date__gte=month_start
    ).count()
    if month_contacted > 0:
        warm_conversion = round((month_warm_leads / month_contacted) * 100, 1)

    # Average response time
    avg_response_time = ASELead.objects.filter(
        company=company,
        contacted_by=user,
        response_time_hours__isnull=False
    ).aggregate(avg_time=Avg('response_time_hours'))['avg_time']
    avg_response_time = round(avg_response_time, 1) if avg_response_time else 0

    return {
        'role': 'boe',
        'role_display': 'Business Outreach Executive',
        'call_queue': {
            'total': call_queue_count,
        },
        'today': {
            'calls': today_calls,
            'emails': today_emails,
            'contacted': today_contacted,
            'warm_leads': today_warm_leads,
        },
        'daily_targets': daily_targets,
        'this_week': {
            'calls': week_calls,
            'emails': week_emails,
            'contacted': week_contacted,
        },
        'this_month': {
            'calls': month_calls,
            'emails': month_emails,
            'contacted': month_contacted,
        },
        'performance': {
            'contact_rate': contact_rate,
            'warm_conversion': warm_conversion,
            'avg_response_time_hours': avg_response_time,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# CRE Dashboard Stats
# ══════════════════════════════════════════════════════════════════════════════

def _calculate_cre_stats(user):
    """
    Calculate dashboard statistics for Client Research Executive (CRE).

    Metrics:
    - Pipeline overview (warm leads, proposals sent, negotiating)
    - Today's metrics (proposals, meetings)
    - This week's metrics
    - This month's metrics
    - Performance metrics (proposal win rate, avg deal size, avg sales cycle)
    - Expected revenue
    """
    company = user.company
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # ── Pipeline Overview ─────────────────────────────────────────────────────
    warm_leads = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='contacted'
    ).count()

    proposals_sent = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='proposal_sent'
    ).count()

    negotiating = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='negotiating'
    ).count()

    # Expected revenue (sum of estimated_project_value for active pipeline)
    expected_revenue = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status__in=['contacted', 'proposal_sent', 'negotiating']
    ).aggregate(
        total=Sum('estimated_project_value')
    )['total'] or 0

    # ── Today's Metrics ───────────────────────────────────────────────────────
    today_proposals = ASELead.objects.filter(
        company=company,
        managed_by=user,
        proposal_sent_at__date=today
    ).count()

    today_meetings = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='meeting',
        created_at__date=today
    ).count()

    # ── This Week's Metrics ───────────────────────────────────────────────────
    week_proposals = ASELead.objects.filter(
        company=company,
        managed_by=user,
        proposal_sent_at__date__gte=week_start
    ).count()

    week_meetings = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='meeting',
        created_at__date__gte=week_start
    ).count()

    # ── This Month's Metrics ──────────────────────────────────────────────────
    month_proposals = ASELead.objects.filter(
        company=company,
        managed_by=user,
        proposal_sent_at__date__gte=month_start
    ).count()

    month_meetings = ASELeadActivity.objects.filter(
        lead__company=company,
        user=user,
        activity_type='meeting',
        created_at__date__gte=month_start
    ).count()

    month_won = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        deal_closed_at__date__gte=month_start
    ).count()

    # ── Performance Metrics ───────────────────────────────────────────────────
    # Proposal win rate (won / proposals sent)
    proposal_win_rate = 0
    if month_proposals > 0:
        proposal_win_rate = round((month_won / month_proposals) * 100, 1)

    # Average deal size (won deals this month)
    avg_deal_size = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        deal_closed_at__date__gte=month_start
    ).aggregate(avg_value=Avg('estimated_project_value'))['avg_value']
    avg_deal_size = round(avg_deal_size, 2) if avg_deal_size else 0

    # Average sales cycle (days from first_contact_at to deal_closed_at for won deals)
    won_deals = ASELead.objects.filter(
        company=company,
        managed_by=user,
        status='won',
        first_contact_at__isnull=False,
        deal_closed_at__isnull=False
    ).only('first_contact_at', 'deal_closed_at')
    
    avg_sales_cycle = 0
    if won_deals.exists():
        total_days = 0
        count = 0
        for lead in won_deals:
            delta = lead.deal_closed_at - lead.first_contact_at
            total_days += delta.days
            count += 1
        if count > 0:
            avg_sales_cycle = round(total_days / count, 1)

    return {
        'role': 'cre',
        'role_display': 'Client Research Executive',
        'pipeline': {
            'warm_leads': warm_leads,
            'proposals_sent': proposals_sent,
            'negotiating': negotiating,
            'expected_revenue': float(expected_revenue),
        },
        'today': {
            'proposals': today_proposals,
            'meetings': today_meetings,
        },
        'this_week': {
            'proposals': week_proposals,
            'meetings': week_meetings,
        },
        'this_month': {
            'proposals': month_proposals,
            'meetings': month_meetings,
            'won': month_won,
        },
        'performance': {
            'proposal_win_rate': proposal_win_rate,
            'avg_deal_size': avg_deal_size,
            'avg_sales_cycle_days': avg_sales_cycle,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# Marketing Lead Dashboard Stats
# ══════════════════════════════════════════════════════════════════════════════

def _calculate_marketing_lead_stats(user):
    """
    Calculate dashboard statistics for Marketing Team Lead.

    Metrics:
    - Team-wide metrics (total leads, qualified, contacted, proposals, won, revenue)
    - Team performance by role (BRE, BOE, CRE)
    - Pipeline visualization data
    - Action items (leads needing assignment, proposals pending, high-value deals)
    """
    company = user.company
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # ── Team-Wide Metrics (This Month) ────────────────────────────────────────
    total_leads = ASELead.objects.filter(
        company=company,
        created_at__date__gte=month_start
    ).count()

    qualified = ASELead.objects.filter(
        company=company,
        status='qualified',
        research_completed_at__date__gte=month_start
    ).count()

    contacted = ASELead.objects.filter(
        company=company,
        status__in=['contacted', 'nurturing'],
        first_contact_at__date__gte=month_start
    ).count()

    proposals = ASELead.objects.filter(
        company=company,
        status__in=['proposal_sent', 'negotiating'],
        proposal_sent_at__date__gte=month_start
    ).count()

    won = ASELead.objects.filter(
        company=company,
        status='won',
        deal_closed_at__date__gte=month_start
    ).count()

    # Revenue (sum of estimated_project_value for won deals this month)
    revenue = ASELead.objects.filter(
        company=company,
        status='won',
        deal_closed_at__date__gte=month_start
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0

    # Conversion rates
    qualification_rate = round((qualified / total_leads) * 100, 1) if total_leads > 0 else 0
    contact_rate = round((contacted / qualified) * 100, 1) if qualified > 0 else 0
    proposal_rate = round((proposals / contacted) * 100, 1) if contacted > 0 else 0
    win_rate = round((won / proposals) * 100, 1) if proposals > 0 else 0

    # ── Team Performance by Role ──────────────────────────────────────────────
    # BRE Team
    bre_researched = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        research_completed_at__date__gte=month_start
    ).count()

    bre_qualified = ASELead.objects.filter(
        company=company,
        researched_by__isnull=False,
        status='qualified',
        research_completed_at__date__gte=month_start
    ).count()

    bre_qualification_rate = round((bre_qualified / bre_researched) * 100, 1) if bre_researched > 0 else 0

    # BOE Team
    boe_calls = ASELeadActivity.objects.filter(
        lead__company=company,
        activity_type='call',
        created_at__date__gte=month_start
    ).count()

    boe_contacted = ASELead.objects.filter(
        company=company,
        contacted_by__isnull=False,
        first_contact_at__date__gte=month_start
    ).count()

    boe_contact_rate = round((boe_contacted / boe_calls) * 100, 1) if boe_calls > 0 else 0

    # CRE Team
    cre_proposals = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        proposal_sent_at__date__gte=month_start
    ).count()

    cre_won = ASELead.objects.filter(
        company=company,
        managed_by__isnull=False,
        status='won',
        deal_closed_at__date__gte=month_start
    ).count()

    cre_win_rate = round((cre_won / cre_proposals) * 100, 1) if cre_proposals > 0 else 0

    # ── Pipeline Visualization ────────────────────────────────────────────────
    pipeline = {
        'new': ASELead.objects.filter(company=company, status='new').count(),
        'qualified': ASELead.objects.filter(company=company, status='qualified').count(),
        'contacted': ASELead.objects.filter(company=company, status__in=['contacted', 'nurturing']).count(),
        'proposal_sent': ASELead.objects.filter(company=company, status='proposal_sent').count(),
        'negotiating': ASELead.objects.filter(company=company, status='negotiating').count(),
        'won': ASELead.objects.filter(company=company, status='won').count(),
        'lost': ASELead.objects.filter(company=company, status='lost').count(),
    }

    # ── Action Items ──────────────────────────────────────────────────────────
    leads_needing_assignment = ASELead.objects.filter(
        company=company,
        status='new',
        assigned_to__isnull=True
    ).count()

    proposals_pending_review = ASELead.objects.filter(
        company=company,
        status='proposal_sent'
    ).count()

    high_value_deals = ASELead.objects.filter(
        company=company,
        status='negotiating',
        estimated_project_value__gte=100000  # High-value threshold
    ).count()

    return {
        'role': 'marketing_lead',
        'role_display': 'Marketing Team Lead',
        'team_metrics': {
            'total_leads': total_leads,
            'qualified': qualified,
            'contacted': contacted,
            'proposals': proposals,
            'won': won,
            'revenue': float(revenue),
            'qualification_rate': qualification_rate,
            'contact_rate': contact_rate,
            'proposal_rate': proposal_rate,
            'win_rate': win_rate,
        },
        'team_performance': {
            'bre': {
                'researched': bre_researched,
                'qualified': bre_qualified,
                'qualification_rate': bre_qualification_rate,
            },
            'boe': {
                'calls': boe_calls,
                'contacted': boe_contacted,
                'contact_rate': boe_contact_rate,
            },
            'cre': {
                'proposals': cre_proposals,
                'won': cre_won,
                'win_rate': cre_win_rate,
            },
        },
        'pipeline': pipeline,
        'action_items': {
            'leads_needing_assignment': leads_needing_assignment,
            'proposals_pending_review': proposals_pending_review,
            'high_value_deals': high_value_deals,
        },
    }
