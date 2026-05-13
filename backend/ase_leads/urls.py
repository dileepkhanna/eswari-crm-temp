from django.urls import path, include
from rest_framework.routers import DefaultRouter

# The views/ package re-exports ASELeadViewSet from the sibling views.py file
# and also exposes the new function-based views.
from .views import (
    ASELeadViewSet, my_lead_queue, dashboard_stats,
    qualify_lead, disqualify_lead,
    log_call, log_email,
    send_proposal, schedule_meeting, update_deal_stage,
    assign_to_boe, assign_to_cre, boe_users, cre_users,
    list_activities, create_activity, update_activity, delete_activity,
    activity_timeline,
    my_tasks, create_task, update_task, complete_task, overdue_tasks, delete_task,
    team_performance, my_performance, pipeline_overview, conversion_rates,
    add_lead, bulk_upload, download_template,
    bre_research_list, bre_research_update, bre_research_delete, bre_research_bulk_assign,
    bre_research_bulk_delete, boe_assigned_list, bre_dashboard_stats, bre_users_list,
    boe_update_call_status, boe_convert_to_lead, cre_users_list,
    boe_add_data, boe_edit_data, boe_delete_data, boe_bulk_delete_data,
    boe_leads_list, boe_leads_create, boe_leads_update, boe_leads_delete, boe_leads_assign_cre,
    boe_leads_export, boe_leads_template, boe_leads_import,
    boe_leads_bulk_delete, boe_leads_bulk_assign, boe_leads_creators,
    bre_research_auto_assign,
    cre_leads_list, cre_update_lead_status, cre_create_lead, cre_edit_lead, cre_delete_lead,
    cre_convert_to_task,
)

router = DefaultRouter()
router.register(r'ase-leads', ASELeadViewSet, basename='ase-leads')

urlpatterns = [
    # Standalone function-based views — registered BEFORE the router so they
    # take precedence over any router-generated URL with the same prefix.
    path('ase-leads/my-queue/', my_lead_queue, name='ase-leads-my-queue'),
    path('ase-leads/dashboard-stats/', dashboard_stats, name='ase-leads-dashboard-stats'),

    # BRE Qualification Actions
    path('ase-leads/<int:pk>/qualify/', qualify_lead, name='ase-leads-qualify'),
    path('ase-leads/<int:pk>/disqualify/', disqualify_lead, name='ase-leads-disqualify'),

    # BOE Call/Email Logging Actions
    path('ase-leads/<int:pk>/log-call/', log_call, name='ase-leads-log-call'),
    path('ase-leads/<int:pk>/log-email/', log_email, name='ase-leads-log-email'),

    # CRE Proposal/Meeting/Deal Stage Actions
    path('ase-leads/<int:pk>/send-proposal/', send_proposal, name='ase-leads-send-proposal'),
    path('ase-leads/<int:pk>/schedule-meeting/', schedule_meeting, name='ase-leads-schedule-meeting'),
    path('ase-leads/<int:pk>/update-stage/', update_deal_stage, name='ase-leads-update-stage'),

    # Lead Assignment Actions
    path('ase-leads/<int:pk>/assign-to-boe/', assign_to_boe, name='ase-leads-assign-to-boe'),
    path('ase-leads/<int:pk>/assign-to-cre/', assign_to_cre, name='ase-leads-assign-to-cre'),
    path('ase-leads/boe-users/', boe_users, name='ase-leads-boe-users'),
    path('ase-leads/cre-users/', cre_users, name='ase-leads-cre-users'),

    # Add Lead & Bulk Upload
    path('ase-leads/add-lead/', add_lead, name='ase-leads-add-lead'),
    path('ase-leads/bulk-upload/', bulk_upload, name='ase-leads-bulk-upload'),
    path('ase-leads/bulk-upload/template/', download_template, name='ase-leads-bulk-upload-template'),

    # BRE Research Data CRUD
    path('ase-leads/bre-research/', bre_research_list, name='ase-leads-bre-research-list'),
    path('ase-leads/bre-research/bulk-assign/', bre_research_bulk_assign, name='ase-leads-bre-research-bulk-assign'),
    path('ase-leads/bre-research/auto-assign/', bre_research_auto_assign, name='ase-leads-bre-research-auto-assign'),
    path('ase-leads/bre-research/bulk-delete/', bre_research_bulk_delete, name='ase-leads-bre-research-bulk-delete'),
    path('ase-leads/boe-assigned/', boe_assigned_list, name='ase-leads-boe-assigned'),
    path('ase-leads/boe-assigned/<int:pk>/call-status/', boe_update_call_status, name='ase-leads-boe-call-status'),
    path('ase-leads/boe-assigned/<int:pk>/convert-to-lead/', boe_convert_to_lead, name='ase-leads-boe-convert-to-lead'),
    path('ase-leads/boe-data/add/', boe_add_data, name='ase-leads-boe-add-data'),
    path('ase-leads/boe-data/<int:pk>/edit/', boe_edit_data, name='ase-leads-boe-edit-data'),
    path('ase-leads/boe-data/<int:pk>/delete/', boe_delete_data, name='ase-leads-boe-delete-data'),
    path('ase-leads/boe-data/bulk-delete/', boe_bulk_delete_data, name='ase-leads-boe-bulk-delete-data'),
    path('ase-leads/boe-leads/', boe_leads_list, name='ase-leads-boe-leads-list'),
    path('ase-leads/boe-leads/create/', boe_leads_create, name='ase-leads-boe-leads-create'),
    path('ase-leads/boe-leads/<int:pk>/update/', boe_leads_update, name='ase-leads-boe-leads-update'),
    path('ase-leads/boe-leads/<int:pk>/delete/', boe_leads_delete, name='ase-leads-boe-leads-delete'),
    path('ase-leads/boe-leads/<int:pk>/assign-cre/', boe_leads_assign_cre, name='ase-leads-boe-leads-assign-cre'),
    path('ase-leads/boe-leads/export/', boe_leads_export, name='ase-leads-boe-leads-export'),
    path('ase-leads/boe-leads/template/', boe_leads_template, name='ase-leads-boe-leads-template'),
    path('ase-leads/boe-leads/import/', boe_leads_import, name='ase-leads-boe-leads-import'),
    path('ase-leads/boe-leads/bulk-delete/', boe_leads_bulk_delete, name='ase-leads-boe-leads-bulk-delete'),
    path('ase-leads/boe-leads/bulk-assign/', boe_leads_bulk_assign, name='ase-leads-boe-leads-bulk-assign'),
    path('ase-leads/boe-leads/creators/', boe_leads_creators, name='ase-leads-boe-leads-creators'),
    path('ase-leads/bre-stats/', bre_dashboard_stats, name='ase-leads-bre-stats'),
    path('ase-leads/bre-users/', bre_users_list, name='ase-leads-bre-users'),
    path('ase-leads/bre-research/<int:pk>/', bre_research_update, name='ase-leads-bre-research-update'),
    path('ase-leads/bre-research/<int:pk>/delete/', bre_research_delete, name='ase-leads-bre-research-delete'),

    # Activity CRUD Endpoints
    path('ase-leads/<int:pk>/activities/', list_activities, name='ase-leads-list-activities'),
    path('ase-leads/<int:pk>/activities/create/', create_activity, name='ase-leads-create-activity'),
    path('ase-leads/activities/<int:activity_id>/update/', update_activity, name='ase-leads-update-activity'),
    path('ase-leads/activities/<int:activity_id>/delete/', delete_activity, name='ase-leads-delete-activity'),
    path('ase-leads/<int:pk>/timeline/', activity_timeline, name='ase-leads-activity-timeline'),

    # Task CRUD Endpoints
    path('ase-leads/tasks/my-tasks/', my_tasks, name='ase-leads-my-tasks'),
    path('ase-leads/tasks/', create_task, name='ase-leads-create-task'),
    path('ase-leads/tasks/<int:pk>/', update_task, name='ase-leads-update-task'),
    path('ase-leads/tasks/<int:pk>/complete/', complete_task, name='ase-leads-complete-task'),
    path('ase-leads/tasks/<int:pk>/delete/', delete_task, name='ase-leads-delete-task'),
    path('ase-leads/tasks/overdue/', overdue_tasks, name='ase-leads-overdue-tasks'),

    # Analytics Endpoints
    path('ase-leads/analytics/team-performance/', team_performance, name='ase-leads-team-performance'),
    path('ase-leads/analytics/my-performance/', my_performance, name='ase-leads-my-performance'),
    path('ase-leads/analytics/pipeline/', pipeline_overview, name='ase-leads-pipeline-overview'),
    path('ase-leads/analytics/conversion-rates/', conversion_rates, name='ase-leads-conversion-rates'),

    # CRE Leads Endpoints
    path('ase-leads/cre-leads/', cre_leads_list, name='ase-leads-cre-leads-list'),
    path('ase-leads/cre-leads/create/', cre_create_lead, name='ase-leads-cre-create-lead'),
    path('ase-leads/cre-leads/<int:pk>/update-status/', cre_update_lead_status, name='ase-leads-cre-update-status'),
    path('ase-leads/cre-leads/<int:pk>/edit/', cre_edit_lead, name='ase-leads-cre-edit-lead'),
    path('ase-leads/cre-leads/<int:pk>/delete/', cre_delete_lead, name='ase-leads-cre-delete-lead'),
    path('ase-leads/cre-leads/<int:pk>/convert-task/', cre_convert_to_task, name='ase-leads-cre-convert-task'),

    # ViewSet routes (CRUD + custom actions)
    path('', include(router.urls)),
]
