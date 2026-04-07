from django.contrib import admin
from .models import (
    CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService,
    LoanDocument, LoanApprovalStage, BankInterestRate, BankLoanStatus
)

admin.site.register(CapitalCustomer)
admin.site.register(CapitalLead)
admin.site.register(CapitalTask)
admin.site.register(CapitalLoan)
admin.site.register(CapitalService)
admin.site.register(LoanDocument)
admin.site.register(LoanApprovalStage)
admin.site.register(BankInterestRate)
admin.site.register(BankLoanStatus)
