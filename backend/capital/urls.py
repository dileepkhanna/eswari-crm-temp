from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CapitalCustomerViewSet, CapitalLeadViewSet, CapitalTaskViewSet, 
    CapitalLoanViewSet, CapitalServiceViewSet, capital_company_info,
    LoanDocumentViewSet, LoanApprovalStageViewSet, 
    BankInterestRateViewSet, BankLoanStatusViewSet
)

router = DefaultRouter()
router.register(r'customers', CapitalCustomerViewSet, basename='capital-customer')
router.register(r'leads', CapitalLeadViewSet, basename='capital-lead')
router.register(r'tasks', CapitalTaskViewSet, basename='capital-task')
router.register(r'loans', CapitalLoanViewSet, basename='capital-loan')
router.register(r'services', CapitalServiceViewSet, basename='capital-service')
# Advanced features
router.register(r'loan-documents', LoanDocumentViewSet, basename='loan-document')
router.register(r'loan-approval-stages', LoanApprovalStageViewSet, basename='loan-approval-stage')
router.register(r'bank-rates', BankInterestRateViewSet, basename='bank-rate')
router.register(r'bank-loan-status', BankLoanStatusViewSet, basename='bank-loan-status')

urlpatterns = [
    path('company-info/', capital_company_info, name='capital-company-info'),
    path('', include(router.urls)),
]
