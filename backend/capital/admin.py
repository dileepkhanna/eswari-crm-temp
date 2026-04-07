from django.contrib import admin
from .models import CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService

admin.site.register(CapitalCustomer)
admin.site.register(CapitalLead)
admin.site.register(CapitalTask)
admin.site.register(CapitalLoan)
admin.site.register(CapitalService)
