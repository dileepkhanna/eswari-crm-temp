"""
Unified Analytics API

Cross-company reporting and analytics dashboard endpoints.
Provides:
  - Cross-company revenue/activity overview
  - Lead-to-conversion funnel with time-in-stage metrics
  - Employee performance scorecards (all companies)
  - Scheduled report configuration

All endpoints require admin role.
"""

from django.core.cache import cache
from django.db.models import Count, Sum, Avg, F, Q, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User, Company
from leads.models import Lead
from ase_leads.models import ASELead
from capital.models import CapitalLead, CapitalLoan, CapitalService, CapitalCustomer, CapitalTask
from customers.models import Customer
from tasks.models import Task
from leaves.models import Leave

import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes


def _require_admin(user):
    """Check if user is admin."""
    return user.role == 'admin'


def _get_period_range(period):
    """Return (start_date, end_date) for the given period string."""
    today = timezone.now().date()
    if period == 'today':
        return today, today
    elif period == 'week':
        start = today - timedelta(days=today.weekday())
        return start, today
    elif period == 'month':
        return today.replace(day=1), today
    elif period == 'quarter':
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        return today.replace(month=quarter_month, day=1), today
    elif period == 'year':
        return today.replace(month=1, day=1), today
    else:
        return today.replace(day=1), today


# ══════════════════════════════════════════════════════════════════════════════
# Cross-Company Overview
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cross_company_overview(request):
    """
    Unified cross-company dashboard metrics.
    
    Returns aggregated stats for all 3 business units:
    - Eswari Group (real estate): leads, customers, projects
    - ASE Technologies (digital marketing): leads, deals, revenue
    - Eswari Capital (financial services): loans, services, customers
    
    Query params:
      ?period=month (today, week, month, quarter, year)
    """
    if not _require_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    period = request.query_params.get('period', 'month')
    start_date, end_date = _get_period_range(period)

    cache_key = f'analytics_overview_{period}'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    # --- Eswari Group (Real Estate) ---
    eswari_leads_total = Lead.objects.count()
    eswari_leads_period = Lead.objects.filter(created_at__date__gte=start_date).count()
    eswari_leads_hot = Lead.objects.filter(status='hot').count()
    eswari_customers_total = Customer.objects.count()
    eswari_customers_period = Customer.objects.filter(created_at__date__gte=start_date).count()

    # --- ASE Technologies (Digital Marketing) ---
    ase_leads_total = ASELead.objects.count()
    ase_leads_period = ASELead.objects.filter(created_at__date__gte=start_date).count()
    ase_deals_won = ASELead.objects.filter(status='won', deal_closed_at__date__gte=start_date).count()
    ase_revenue = ASELead.objects.filter(
        status='won', deal_closed_at__date__gte=start_date
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0
    ase_pipeline_value = ASELead.objects.filter(
        status__in=['proposal_sent', 'negotiating']
    ).aggregate(total=Sum('estimated_project_value'))['total'] or 0

    # --- Eswari Capital (Financial Services) ---
    capital_customers_total = CapitalCustomer.objects.count()
    capital_customers_period = CapitalCustomer.objects.filter(created_at__date__gte=start_date).count()
    capital_loans_total = CapitalLoan.objects.count()
    capital_loans_period = CapitalLoan.objects.filter(created_at__date__gte=start_date).count()
    capital_loans_disbursed = CapitalLoan.objects.filter(
        status='disbursed', created_at__date__gte=start_date
    ).count()
    capital_loan_value = CapitalLoan.objects.filter(
        status='disbursed', created_at__date__gte=start_date
    ).aggregate(total=Sum('loan_amount'))['total'] or 0
    capital_services_total = CapitalService.objects.count()
    capital_services_period = CapitalService.objects.filter(created_at__date__gte=start_date).count()
    capital_services_completed = CapitalService.objects.filter(
        status='completed', created_at__date__gte=start_date
    ).count()

    # --- Team Overview ---
    total_employees = User.objects.filter(is_active=True).count()
    pending_leaves = Leave.objects.filter(status='pending').count()
    total_tasks = Task.objects.count()
    tasks_completed_period = Task.objects.filter(
        status='completed', updated_at__date__gte=start_date
    ).count()

    result = {
        'period': period,
        'period_start': str(start_date),
        'period_end': str(end_date),
        'eswari_group': {
            'leads_total': eswari_leads_total,
            'leads_period': eswari_leads_period,
            'leads_hot': eswari_leads_hot,
            'customers_total': eswari_customers_total,
            'customers_period': eswari_customers_period,
        },
        'ase_technologies': {
            'leads_total': ase_leads_total,
            'leads_period': ase_leads_period,
            'deals_won': ase_deals_won,
            'revenue': float(ase_revenue),
            'pipeline_value': float(ase_pipeline_value),
        },
        'eswari_capital': {
            'customers_total': capital_customers_total,
            'customers_period': capital_customers_period,
            'loans_total': capital_loans_total,
            'loans_period': capital_loans_period,
            'loans_disbursed': capital_loans_disbursed,
            'loan_value_disbursed': float(capital_loan_value),
            'services_total': capital_services_total,
            'services_period': capital_services_period,
            'services_completed': capital_services_completed,
        },
        'team': {
            'total_employees': total_employees,
            'pending_leaves': pending_leaves,
            'total_tasks': total_tasks,
            'tasks_completed_period': tasks_completed_period,
        },
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


# ══════════════════════════════════════════════════════════════════════════════
# Lead-to-Conversion Funnel with Time-in-Stage
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversion_funnel(request):
    """
    Lead-to-conversion funnel with time-in-stage metrics.
    
    Returns funnel data for each business unit showing:
    - Count at each stage
    - Average time spent in each stage
    - Conversion rates between stages
    
    Query params:
      ?period=month (today, week, month, quarter, year)
      ?company=all|eswari|ase|capital
    """
    if not _require_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    period = request.query_params.get('period', 'month')
    company_filter = request.query_params.get('company', 'all')
    start_date, end_date = _get_period_range(period)

    cache_key = f'analytics_funnel_{period}_{company_filter}'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    result = {
        'period': period,
        'period_start': str(start_date),
    }

    # --- Eswari Group Funnel ---
    if company_filter in ('all', 'eswari'):
        eswari_statuses = ['new', 'hot', 'warm', 'cold', 'not_interested', 'reminder']
        eswari_funnel = {}
        for s in eswari_statuses:
            count = Lead.objects.filter(status=s).count()
            eswari_funnel[s] = {'count': count}

        # Conversion: leads that became customers
        total_leads = Lead.objects.filter(created_at__date__gte=start_date).count()
        converted = Customer.objects.filter(created_at__date__gte=start_date).count()
        eswari_conversion_rate = round((converted / total_leads) * 100, 1) if total_leads > 0 else 0

        result['eswari_group'] = {
            'funnel': eswari_funnel,
            'total_leads_period': total_leads,
            'converted_period': converted,
            'conversion_rate': eswari_conversion_rate,
        }

    # --- ASE Technologies Funnel (with time-in-stage) ---
    if company_filter in ('all', 'ase'):
        ase_statuses = ['new', 'qualified', 'contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won', 'lost']
        ase_funnel = {}
        for s in ase_statuses:
            qs = ASELead.objects.filter(status=s)
            count = qs.count()
            total_value = qs.aggregate(total=Sum('estimated_project_value'))['total'] or 0
            ase_funnel[s] = {
                'count': count,
                'total_value': float(total_value),
            }

        # Time-in-stage calculations (average days between stage transitions)
        time_in_stage = {}

        # New → Qualified (research_completed_at - created_at)
        new_to_qualified = ASELead.objects.filter(
            research_completed_at__isnull=False,
            created_at__date__gte=start_date
        ).annotate(
            duration=ExpressionWrapper(
                F('research_completed_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        time_in_stage['new_to_qualified_days'] = round(new_to_qualified.total_seconds() / 86400, 1) if new_to_qualified else None

        # Qualified → Contacted (first_contact_at - research_completed_at)
        qualified_to_contacted = ASELead.objects.filter(
            first_contact_at__isnull=False,
            research_completed_at__isnull=False,
            first_contact_at__date__gte=start_date
        ).annotate(
            duration=ExpressionWrapper(
                F('first_contact_at') - F('research_completed_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        time_in_stage['qualified_to_contacted_days'] = round(qualified_to_contacted.total_seconds() / 86400, 1) if qualified_to_contacted else None

        # Contacted → Proposal (proposal_sent_at - first_contact_at)
        contacted_to_proposal = ASELead.objects.filter(
            proposal_sent_at__isnull=False,
            first_contact_at__isnull=False,
            proposal_sent_at__date__gte=start_date
        ).annotate(
            duration=ExpressionWrapper(
                F('proposal_sent_at') - F('first_contact_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        time_in_stage['contacted_to_proposal_days'] = round(contacted_to_proposal.total_seconds() / 86400, 1) if contacted_to_proposal else None

        # Proposal → Won (deal_closed_at - proposal_sent_at)
        proposal_to_won = ASELead.objects.filter(
            deal_closed_at__isnull=False,
            proposal_sent_at__isnull=False,
            status='won',
            deal_closed_at__date__gte=start_date
        ).annotate(
            duration=ExpressionWrapper(
                F('deal_closed_at') - F('proposal_sent_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        time_in_stage['proposal_to_won_days'] = round(proposal_to_won.total_seconds() / 86400, 1) if proposal_to_won else None

        # Total sales cycle (deal_closed_at - created_at for won deals)
        total_cycle = ASELead.objects.filter(
            deal_closed_at__isnull=False,
            status='won',
            deal_closed_at__date__gte=start_date
        ).annotate(
            duration=ExpressionWrapper(
                F('deal_closed_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        time_in_stage['total_sales_cycle_days'] = round(total_cycle.total_seconds() / 86400, 1) if total_cycle else None

        # Stage-to-stage conversion rates
        total_new = ASELead.objects.filter(created_at__date__gte=start_date).count()
        total_qualified = ASELead.objects.filter(
            research_completed_at__date__gte=start_date,
            status__in=['qualified', 'contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won']
        ).count()
        total_contacted = ASELead.objects.filter(
            first_contact_at__date__gte=start_date,
            status__in=['contacted', 'nurturing', 'proposal_sent', 'negotiating', 'won']
        ).count()
        total_proposal = ASELead.objects.filter(
            proposal_sent_at__date__gte=start_date,
            status__in=['proposal_sent', 'negotiating', 'won']
        ).count()
        total_won = ASELead.objects.filter(
            deal_closed_at__date__gte=start_date, status='won'
        ).count()

        conversion_rates = {
            'new_to_qualified': round((total_qualified / total_new) * 100, 1) if total_new > 0 else 0,
            'qualified_to_contacted': round((total_contacted / total_qualified) * 100, 1) if total_qualified > 0 else 0,
            'contacted_to_proposal': round((total_proposal / total_contacted) * 100, 1) if total_contacted > 0 else 0,
            'proposal_to_won': round((total_won / total_proposal) * 100, 1) if total_proposal > 0 else 0,
            'overall': round((total_won / total_new) * 100, 1) if total_new > 0 else 0,
        }

        result['ase_technologies'] = {
            'funnel': ase_funnel,
            'time_in_stage': time_in_stage,
            'conversion_rates': conversion_rates,
        }

    # --- Eswari Capital Funnel ---
    if company_filter in ('all', 'capital'):
        # Loan funnel
        loan_statuses = ['inquiry', 'documents_pending', 'under_review', 'approved', 'disbursed', 'rejected', 'closed']
        loan_funnel = {}
        for s in loan_statuses:
            qs = CapitalLoan.objects.filter(status=s)
            count = qs.count()
            total_value = qs.aggregate(total=Sum('loan_amount'))['total'] or 0
            loan_funnel[s] = {'count': count, 'total_value': float(total_value)}

        # Service funnel
        service_statuses = ['inquiry', 'documentation', 'processing', 'completed', 'on_hold', 'cancelled']
        service_funnel = {}
        for s in service_statuses:
            count = CapitalService.objects.filter(status=s).count()
            service_funnel[s] = {'count': count}

        # Capital conversion: customers → leads
        capital_leads_period = CapitalLead.objects.filter(created_at__date__gte=start_date).count()
        capital_hot = CapitalLead.objects.filter(status='hot', created_at__date__gte=start_date).count()

        result['eswari_capital'] = {
            'loan_funnel': loan_funnel,
            'service_funnel': service_funnel,
            'leads_period': capital_leads_period,
            'hot_leads': capital_hot,
        }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


# ══════════════════════════════════════════════════════════════════════════════
# Employee Performance Scorecards
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_scorecards(request):
    """
    Employee performance scorecards across all companies.
    
    Returns per-employee metrics:
    - Leads created/converted
    - Tasks completed
    - Calls made (ASE)
    - Deals closed (ASE)
    - Loans processed (Capital)
    
    Query params:
      ?period=month (today, week, month, quarter, year)
      ?company=all|eswari|ase|capital
      ?role=all|manager|employee
    """
    if not _require_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    period = request.query_params.get('period', 'month')
    company_filter = request.query_params.get('company', 'all')
    role_filter = request.query_params.get('role', 'all')
    start_date, end_date = _get_period_range(period)

    cache_key = f'analytics_scorecards_{period}_{company_filter}_{role_filter}'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    # Get active employees
    users_qs = User.objects.filter(is_active=True, role__in=['manager', 'employee'])
    if role_filter != 'all':
        users_qs = users_qs.filter(role=role_filter)

    scorecards = []

    for user in users_qs.select_related('company', 'team')[:50]:  # Limit to 50 for performance
        scorecard = {
            'id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'role': user.role,
            'company': user.company.name if user.company else 'N/A',
            'company_code': user.company.code if user.company else None,
            'team': user.team.name if user.team else None,
            'designation': user.designation or '',
        }

        # Eswari Group metrics
        if company_filter in ('all', 'eswari'):
            scorecard['eswari_leads_created'] = Lead.objects.filter(
                created_by=user, created_at__date__gte=start_date
            ).count()
            scorecard['eswari_leads_converted'] = Lead.objects.filter(
                assigned_to=user, status='hot', updated_at__date__gte=start_date
            ).count()

        # ASE Technologies metrics
        if company_filter in ('all', 'ase'):
            scorecard['ase_leads_created'] = ASELead.objects.filter(
                created_by=user, created_at__date__gte=start_date
            ).count()
            scorecard['ase_deals_won'] = ASELead.objects.filter(
                Q(managed_by=user) | Q(assigned_to=user),
                status='won',
                deal_closed_at__date__gte=start_date
            ).count()
            scorecard['ase_revenue'] = float(ASELead.objects.filter(
                Q(managed_by=user) | Q(assigned_to=user),
                status='won',
                deal_closed_at__date__gte=start_date
            ).aggregate(total=Sum('estimated_project_value'))['total'] or 0)
            scorecard['ase_calls_made'] = 0
            try:
                from ase_leads.models.activity import ASELeadActivity
                scorecard['ase_calls_made'] = ASELeadActivity.objects.filter(
                    user=user, activity_type='call', created_at__date__gte=start_date
                ).count()
            except ImportError:
                pass

        # Capital metrics
        if company_filter in ('all', 'capital'):
            scorecard['capital_customers_created'] = CapitalCustomer.objects.filter(
                created_by=user, created_at__date__gte=start_date
            ).count()
            scorecard['capital_loans_processed'] = CapitalLoan.objects.filter(
                assigned_to=user, updated_at__date__gte=start_date
            ).count()
            scorecard['capital_services_completed'] = CapitalService.objects.filter(
                assigned_to=user, status='completed', updated_at__date__gte=start_date
            ).count()

        # General metrics
        scorecard['tasks_completed'] = Task.objects.filter(
            assigned_to=user, status='completed', updated_at__date__gte=start_date
        ).count()
        scorecard['leaves_taken'] = Leave.objects.filter(
            user=user, status='approved', start_date__gte=start_date
        ).count()

        scorecards.append(scorecard)

    # Sort by total activity (sum of key metrics)
    for sc in scorecards:
        sc['total_score'] = (
            sc.get('eswari_leads_created', 0) +
            sc.get('ase_leads_created', 0) +
            sc.get('ase_deals_won', 0) * 5 +
            sc.get('capital_customers_created', 0) +
            sc.get('capital_loans_processed', 0) +
            sc.get('tasks_completed', 0)
        )

    scorecards.sort(key=lambda x: x['total_score'], reverse=True)

    result = {
        'period': period,
        'period_start': str(start_date),
        'total_employees': len(scorecards),
        'scorecards': scorecards,
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


# ══════════════════════════════════════════════════════════════════════════════
# Revenue Trend
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_trend(request):
    """
    Revenue/activity trend over time (daily/weekly/monthly).
    
    Query params:
      ?period=month (week, month, quarter, year)
      ?granularity=daily (daily, weekly, monthly)
    """
    if not _require_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    period = request.query_params.get('period', 'month')
    granularity = request.query_params.get('granularity', 'daily')
    start_date, end_date = _get_period_range(period)

    cache_key = f'analytics_revenue_trend_{period}_{granularity}'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    # Choose truncation function
    if granularity == 'weekly':
        trunc_fn = TruncWeek
    elif granularity == 'monthly':
        trunc_fn = TruncMonth
    else:
        trunc_fn = TruncDate

    # ASE Revenue trend (deals won over time)
    ase_trend = list(
        ASELead.objects.filter(
            status='won',
            deal_closed_at__date__gte=start_date
        ).annotate(
            date=trunc_fn('deal_closed_at')
        ).values('date').annotate(
            deals=Count('id'),
            revenue=Sum('estimated_project_value')
        ).order_by('date')
    )

    # Capital Loans disbursed trend
    capital_loan_trend = list(
        CapitalLoan.objects.filter(
            status='disbursed',
            created_at__date__gte=start_date
        ).annotate(
            date=trunc_fn('created_at')
        ).values('date').annotate(
            count=Count('id'),
            value=Sum('loan_amount')
        ).order_by('date')
    )

    # Eswari Group leads trend
    eswari_lead_trend = list(
        Lead.objects.filter(
            created_at__date__gte=start_date
        ).annotate(
            date=trunc_fn('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
    )

    # Serialize dates
    for item in ase_trend:
        item['date'] = str(item['date'].date() if hasattr(item['date'], 'date') else item['date'])
        item['revenue'] = float(item['revenue'] or 0)

    for item in capital_loan_trend:
        item['date'] = str(item['date'].date() if hasattr(item['date'], 'date') else item['date'])
        item['value'] = float(item['value'] or 0)

    for item in eswari_lead_trend:
        item['date'] = str(item['date'].date() if hasattr(item['date'], 'date') else item['date'])

    result = {
        'period': period,
        'granularity': granularity,
        'period_start': str(start_date),
        'ase_revenue_trend': ase_trend,
        'capital_loan_trend': capital_loan_trend,
        'eswari_lead_trend': eswari_lead_trend,
    }

    cache.set(cache_key, result, CACHE_TTL)
    return Response(result)


# ══════════════════════════════════════════════════════════════════════════════
# Scheduled Reports Configuration
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def report_schedules(request):
    """
    GET: List configured report schedules.
    POST: Create/update a report schedule.
    
    Report schedules define automated email reports sent to managers.
    """
    if not _require_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    from analytics.models import ReportSchedule

    if request.method == 'GET':
        schedules = ReportSchedule.objects.all().order_by('-created_at')
        data = [{
            'id': s.id,
            'name': s.name,
            'frequency': s.frequency,
            'report_type': s.report_type,
            'recipients': s.recipients,
            'is_active': s.is_active,
            'last_sent_at': s.last_sent_at,
            'next_send_at': s.next_send_at,
            'created_at': s.created_at,
        } for s in schedules]
        return Response(data)

    elif request.method == 'POST':
        data = request.data
        schedule = ReportSchedule.objects.create(
            name=data.get('name', 'Untitled Report'),
            frequency=data.get('frequency', 'weekly'),
            report_type=data.get('report_type', 'overview'),
            recipients=data.get('recipients', []),
            is_active=data.get('is_active', True),
            created_by=request.user,
        )
        return Response({
            'id': schedule.id,
            'name': schedule.name,
            'frequency': schedule.frequency,
            'report_type': schedule.report_type,
            'recipients': schedule.recipients,
            'is_active': schedule.is_active,
        }, status=status.HTTP_201_CREATED)
