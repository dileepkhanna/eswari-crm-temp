from django.urls import path
from . import views

urlpatterns = [
    path('overview/', views.cross_company_overview, name='analytics-overview'),
    path('funnel/', views.conversion_funnel, name='analytics-funnel'),
    path('scorecards/', views.employee_scorecards, name='analytics-scorecards'),
    path('revenue-trend/', views.revenue_trend, name='analytics-revenue-trend'),
    path('report-schedules/', views.report_schedules, name='analytics-report-schedules'),
]
