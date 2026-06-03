"""
WebSocket notification utilities.

Use these functions to send real-time notifications to connected clients.

Usage:
    from eswari_crm.ws_utils import notify_user, notify_role, notify_company

    # Notify a specific user
    notify_user(user_id=5, event_type='lead_assigned', data={
        'lead_id': 123,
        'lead_name': 'ABC Corp',
        'message': 'New lead assigned to you',
    })

    # Notify all admins
    notify_role(role='admin', event_type='deal_closed', data={
        'deal_value': 500000,
        'company_name': 'XYZ Ltd',
    })

    # Notify all users in a company
    notify_company(company_id=2, event_type='announcement', data={
        'title': 'New policy update',
        'message': 'Please review the updated leave policy.',
    })
"""

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

def _send_to_group(group_name, event_type, data):
    """Send a message to a channel layer group."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.debug("Channel layer not available, skipping WebSocket notification")
            return False

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': event_type,
                'data': data,
            }
        )
        return True
    except Exception as e:
        logger.warning(f"Failed to send WebSocket notification to {group_name}: {e}")
        return False

def notify_user(user_id: int, event_type: str, data: dict) -> bool:
    """
    Send a real-time notification to a specific user.
    
    Args:
        user_id: The user's ID
        event_type: Event type (lead_assigned, task_assigned, deal_closed, etc.)
        data: Notification payload dict
    """
    return _send_to_group(f"user_{user_id}", event_type, data)


def notify_role(role: str, event_type: str, data: dict) -> bool:
    """
    Send a real-time notification to all users with a specific role.
    Args:
        role: Role name (admin, manager, employee, hr)
        event_type: Event type
        data: Notification payload dict
    """
    return _send_to_group(f"role_{role}", event_type, data)

def notify_company(company_id: int, event_type: str, data: dict) -> bool:
    """
    Send a real-time notification to all users in a company.
    Args:
        company_id: The company's ID
        event_type: Event type
        data: Notification payload dict
    """
    return _send_to_group(f"company_{company_id}", event_type, data)

def notify_broadcast(event_type: str, data: dict) -> bool:
    """
    Send a real-time notification to ALL connected users.
    
    Args:
        event_type: Event type
        data: Notification payload dict
    """
    return _send_to_group("broadcast", event_type, data)


def notify_ase_data_changed(entity: str, action: str, record_id=None, extra: dict = None) -> bool:
    """
    Notify all ASE Technologies users (company_id=2) that data has changed.
    
    Used for real-time updates on ASE Calls, Leads, and Tasks pages.
    
    Args:
        entity: 'calls', 'leads', or 'tasks'
        action: 'created', 'updated', 'deleted', 'bulk_deleted', 'converted'
        record_id: Optional ID of the affected record
        extra: Optional extra data to include
    
    Usage:
        from eswari_crm.ws_utils import notify_ase_data_changed
        notify_ase_data_changed('leads', 'created', record_id=123)
        notify_ase_data_changed('tasks', 'updated', record_id=45, extra={'status': 'completed'})
        notify_ase_data_changed('calls', 'bulk_deleted')
    """
    data = {
        'entity': entity,
        'action': action,
    }
    if record_id is not None:
        data['record_id'] = record_id
    if extra:
        data.update(extra)
    
    # Send to ASE Technologies company group (company_id=2)
    return _send_to_group("company_2", "ase_data_changed", data)
