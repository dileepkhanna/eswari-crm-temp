"""
Bulk Operations API
Provides bulk assign, bulk status update, and bulk delete operations
across all entity types (leads, ASE leads, capital customers, tasks).
All endpoints require admin or manager role.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone

from leads.models import Lead
from ase_leads.models import ASELead
from capital.models import CapitalCustomer, CapitalLead, CapitalLoan, CapitalService
from tasks.models import Task
from accounts.models import User

import logging

logger = logging.getLogger(__name__)


def _check_permission(user):
    """Only admin and manager can perform bulk operations."""
    if user.role not in ('admin', 'manager'):
        return False
    return True


# ══════════════════════════════════════════════════════════════════════════════
# Bulk Assign Leads
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_leads(request):
    """
    Bulk assign Eswari Group leads to an employee.
    
    Request body:
    {
        "lead_ids": [1, 2, 3, ...],
        "assigned_to_id": 5
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    lead_ids = request.data.get('lead_ids', [])
    assigned_to_id = request.data.get('assigned_to_id')

    if not lead_ids:
        return Response({'detail': 'lead_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not assigned_to_id:
        return Response({'detail': 'assigned_to_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        assignee = User.objects.get(id=assigned_to_id, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'Assignee not found.'}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        updated = Lead.objects.filter(id__in=lead_ids).update(
            assigned_to=assignee,
            updated_at=timezone.now()
        )

    return Response({
        'updated': updated,
        'assigned_to': f"{assignee.first_name} {assignee.last_name}".strip() or assignee.username,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_ase_leads(request):
    """
    Bulk assign ASE Technology leads to a team member.
    
    Request body:
    {
        "lead_ids": [1, 2, 3, ...],
        "assigned_to_id": 5
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    lead_ids = request.data.get('lead_ids', [])
    assigned_to_id = request.data.get('assigned_to_id')

    if not lead_ids:
        return Response({'detail': 'lead_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not assigned_to_id:
        return Response({'detail': 'assigned_to_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        assignee = User.objects.get(id=assigned_to_id, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'Assignee not found.'}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        updated = ASELead.objects.filter(id__in=lead_ids).update(
            assigned_to=assignee,
            updated_at=timezone.now()
        )

    return Response({
        'updated': updated,
        'assigned_to': f"{assignee.first_name} {assignee.last_name}".strip() or assignee.username,
    })


# ══════════════════════════════════════════════════════════════════════════════
# Bulk Update Status
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_lead_status(request):
    """
    Bulk update status for Eswari Group leads.
    
    Request body:
    {
        "lead_ids": [1, 2, 3, ...],
        "status": "hot"
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    lead_ids = request.data.get('lead_ids', [])
    new_status = request.data.get('status')

    if not lead_ids:
        return Response({'detail': 'lead_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_statuses = [s[0] for s in Lead.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({
            'detail': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        updated = Lead.objects.filter(id__in=lead_ids).update(
            status=new_status,
            updated_at=timezone.now()
        )

    return Response({'updated': updated, 'new_status': new_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_ase_lead_status(request):
    """
    Bulk update status for ASE Technology leads.
    
    Request body:
    {
        "lead_ids": [1, 2, 3, ...],
        "status": "qualified"
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    lead_ids = request.data.get('lead_ids', [])
    new_status = request.data.get('status')

    if not lead_ids:
        return Response({'detail': 'lead_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_statuses = [s[0] for s in ASELead.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({
            'detail': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        updated = ASELead.objects.filter(id__in=lead_ids).update(
            status=new_status,
            updated_at=timezone.now()
        )

    return Response({'updated': updated, 'new_status': new_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_task_status(request):
    """
    Bulk update status for tasks.
    
    Request body:
    {
        "task_ids": [1, 2, 3, ...],
        "status": "completed"
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    task_ids = request.data.get('task_ids', [])
    new_status = request.data.get('status')

    if not task_ids:
        return Response({'detail': 'task_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_statuses = [s[0] for s in Task.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({
            'detail': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        updated = Task.objects.filter(id__in=task_ids).update(
            status=new_status,
            updated_at=timezone.now()
        )

    return Response({'updated': updated, 'new_status': new_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_capital_loan_status(request):
    """
    Bulk update status for Capital loans.
    
    Request body:
    {
        "loan_ids": [1, 2, 3, ...],
        "status": "approved"
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    loan_ids = request.data.get('loan_ids', [])
    new_status = request.data.get('status')

    if not loan_ids:
        return Response({'detail': 'loan_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_statuses = [s[0] for s in CapitalLoan.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({
            'detail': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        updated = CapitalLoan.objects.filter(id__in=loan_ids).update(
            status=new_status,
            updated_at=timezone.now()
        )

    return Response({'updated': updated, 'new_status': new_status})
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Bulk Assign Capital
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_capital_customers(request):
    """
    Bulk assign Capital customers to an employee.
    
    Request body:
    {
        "customer_ids": [1, 2, 3, ...],
        "assigned_to_id": 5
    }
    """
    if not _check_permission(request.user):
        return Response({'detail': 'Admin or manager access required.'}, status=status.HTTP_403_FORBIDDEN)

    customer_ids = request.data.get('customer_ids', [])
    assigned_to_id = request.data.get('assigned_to_id')

    if not customer_ids:
        return Response({'detail': 'customer_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not assigned_to_id:
        return Response({'detail': 'assigned_to_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        assignee = User.objects.get(id=assigned_to_id, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'Assignee not found.'}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        updated = CapitalCustomer.objects.filter(id__in=customer_ids).update(
            assigned_to=assignee,
            updated_at=timezone.now()
        )

    return Response({
        'updated': updated,
        'assigned_to': f"{assignee.first_name} {assignee.last_name}".strip() or assignee.username,
    })
