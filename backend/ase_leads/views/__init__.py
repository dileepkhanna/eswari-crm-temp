"""
ASE Leads Views Package

This package contains function-based views for the ASE Marketing Panel.
The existing ViewSet (ASELeadViewSet) lives in the sibling views.py file.
We re-export it here so that urls.py can import from a single location.
"""
import importlib.util
import os

# Load ASELeadViewSet from the sibling views.py file.
# We use importlib because the views/ package shadows views.py in normal imports.
_views_py_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'views.py')
_spec = importlib.util.spec_from_file_location('ase_leads._views_module', _views_py_path)
_views_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_views_module)

ASELeadViewSet = _views_module.ASELeadViewSet
ASELeadPagination = _views_module.ASELeadPagination

from .lead_queue import my_lead_queue  # noqa: E402
from .dashboard import dashboard_stats  # noqa: E402
from .bre_actions import qualify_lead, disqualify_lead  # noqa: E402
from .boe_actions import log_call, log_email  # noqa: E402
from .cre_actions import send_proposal, schedule_meeting, update_deal_stage  # noqa: E402
from .assignment import assign_to_boe, assign_to_cre, boe_users, cre_users  # noqa: E402
from .bulk_upload import add_lead, bulk_upload, download_template, bre_research_list, bre_research_update, bre_research_delete, bre_research_bulk_assign, bre_research_bulk_delete, boe_assigned_list, bre_dashboard_stats, bre_users_list, boe_update_call_status, boe_convert_to_lead, cre_users_list, boe_add_data, boe_edit_data, boe_delete_data, boe_bulk_delete_data, boe_leads_list, boe_leads_create, boe_leads_update, boe_leads_delete, boe_leads_assign_cre, boe_leads_export, boe_leads_template, boe_leads_import, cre_leads_list, cre_update_lead_status, cre_create_lead, cre_edit_lead, cre_delete_lead, cre_convert_to_task, boe_leads_bulk_delete, boe_leads_bulk_assign, boe_leads_creators, bre_research_auto_assign  # noqa: E402
from .activities import list_activities, create_activity, update_activity, delete_activity, activity_timeline  # noqa: E402
from .tasks import my_tasks, create_task, update_task, complete_task, overdue_tasks, delete_task  # noqa: E402
from .analytics import team_performance, my_performance, pipeline_overview, conversion_rates  # noqa: E402

__all__ = [
    'ASELeadViewSet',
    'ASELeadPagination',
    'my_lead_queue',
    'dashboard_stats',
    'qualify_lead',
    'disqualify_lead',
    'log_call',
    'log_email',
    'send_proposal',
    'schedule_meeting',
    'update_deal_stage',
    'assign_to_boe',
    'assign_to_cre',
    'boe_users',
    'cre_users',
    'add_lead',
    'bulk_upload',
    'download_template',
    'bre_research_list',
    'bre_research_update',
    'bre_research_delete',
    'bre_research_bulk_assign',
    'bre_research_bulk_delete',
    'boe_assigned_list',
    'boe_update_call_status',
    'boe_convert_to_lead',
    'boe_add_data',
    'boe_edit_data',
    'boe_delete_data',
    'boe_bulk_delete_data',
    'boe_leads_list',
    'boe_leads_create',
    'boe_leads_update',
    'boe_leads_delete',
    'boe_leads_assign_cre',
    'cre_users_list',
    'bre_dashboard_stats',
    'bre_users_list',
    'list_activities',
    'create_activity',
    'update_activity',
    'delete_activity',
    'activity_timeline',
    'my_tasks',
    'create_task',
    'update_task',
    'complete_task',
    'overdue_tasks',
    'team_performance',
    'my_performance',
    'pipeline_overview',
    'conversion_rates',
]
