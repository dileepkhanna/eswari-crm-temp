from django.urls import path
from . import views

urlpatterns = [
    # Bulk Assign
    path('assign/leads/', views.bulk_assign_leads, name='bulk-assign-leads'),
    path('assign/ase-leads/', views.bulk_assign_ase_leads, name='bulk-assign-ase-leads'),
    path('assign/capital-customers/', views.bulk_assign_capital_customers, name='bulk-assign-capital-customers'),

    # Bulk Status Update
    path('status/leads/', views.bulk_update_lead_status, name='bulk-update-lead-status'),
    path('status/ase-leads/', views.bulk_update_ase_lead_status, name='bulk-update-ase-lead-status'),
    path('status/tasks/', views.bulk_update_task_status, name='bulk-update-task-status'),
    path('status/capital-loans/', views.bulk_update_capital_loan_status, name='bulk-update-capital-loan-status'),
]
