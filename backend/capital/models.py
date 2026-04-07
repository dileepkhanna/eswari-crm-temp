from django.db import models
from django.conf import settings


class CapitalCustomer(models.Model):
    CALL_STATUS_CHOICES = [
        ('pending', 'Pending'), ('answered', 'Answered'), ('not_answered', 'Not Answered'),
        ('busy', 'Busy'), ('not_interested', 'Not Interested'), ('custom', 'Custom'),
    ]
    INTEREST_CHOICES = [
        ('none', 'Not Decided'),
        ('loan', 'Loan'),
        ('gst', 'GST Service'),
        ('msme', 'MSME Service'),
        ('itr', 'Income Tax Filing'),
    ]
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    call_status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='pending')
    custom_call_status = models.CharField(max_length=100, blank=True, null=True)
    interest = models.CharField(max_length=10, choices=INTEREST_CHOICES, default='none')
    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='capital_customers')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_assigned_customers')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='capital_created_customers')
    scheduled_date = models.DateTimeField(null=True, blank=True)
    call_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    is_converted = models.BooleanField(default=False)
    converted_lead_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('phone', 'company')]
        indexes = [models.Index(fields=['company']), models.Index(fields=['call_status']), models.Index(fields=['assigned_to'])]

    def __str__(self): return f"{self.name or 'Unknown'} - {self.phone}"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None

    @property
    def created_by_name(self):
        return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username


class CapitalLead(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'), ('hot', 'Hot'), ('warm', 'Warm'), ('cold', 'Cold'),
        ('not_interested', 'Not Interested'), ('reminder', 'Reminder'),
    ]
    name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source = models.CharField(max_length=100, default='website')
    follow_up_date = models.DateTimeField(null=True, blank=True)
    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='capital_leads')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_assigned_leads')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='capital_created_leads', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('phone', 'company')]
        indexes = [models.Index(fields=['company']), models.Index(fields=['status']), models.Index(fields=['assigned_to'])]

    def __str__(self): return f"{self.name} - {self.get_status_display()}"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None


class CapitalTask(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'), ('follow_up', 'Follow Up'), ('document_collection', 'Document Collection'),
        ('processing', 'Processing'), ('completed', 'Completed'), ('rejected', 'Rejected'),
    ]
    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')]

    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='in_progress')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    loan = models.ForeignKey('CapitalLoan', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    service = models.ForeignKey('CapitalService', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='capital_tasks')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_assigned_tasks')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='capital_created_tasks', null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company']), models.Index(fields=['status']), models.Index(fields=['assigned_to'])]

    def __str__(self): return f"{self.title or 'Task'} - {self.get_status_display()}"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None


class CapitalLoan(models.Model):
    LOAN_TYPE_CHOICES = [
        ('personal', 'Personal Loan'), ('business', 'Business Loan'), ('home', 'Home Loan'),
        ('vehicle', 'Vehicle Loan'), ('education', 'Education Loan'), ('gold', 'Gold Loan'),
        ('mortgage', 'Mortgage Loan'), ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('inquiry', 'Inquiry'), ('documents_pending', 'Documents Pending'), ('under_review', 'Under Review'),
        ('approved', 'Approved'), ('disbursed', 'Disbursed'), ('rejected', 'Rejected'), ('closed', 'Closed'),
    ]
    applicant_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPE_CHOICES, default='personal')
    loan_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    tenure_months = models.PositiveIntegerField(null=True, blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bank_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='inquiry')
    notes = models.TextField(blank=True)
    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='capital_loans')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_assigned_loans')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='capital_created_loans', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('phone', 'loan_type', 'company')]
        indexes = [models.Index(fields=['company']), models.Index(fields=['status']), models.Index(fields=['loan_type']), models.Index(fields=['assigned_to'])]

    def __str__(self): return f"{self.applicant_name} - {self.get_loan_type_display()} ({self.get_status_display()})"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None


class CapitalService(models.Model):
    """GST, MSME, Income Tax and other compliance services."""
    SERVICE_TYPE_CHOICES = [
        # GST Services
        ('gst_registration', 'GST Registration (New)'),
        ('gst_filing_monthly', 'GST Return Filing (Monthly)'),
        ('gst_filing_quarterly', 'GST Return Filing (Quarterly)'),
        ('gst_amendment', 'GST Amendment / Update'),
        ('gst_cancellation', 'GST Cancellation'),
        ('lut_filing', 'LUT Filing (Exports)'),
        ('eway_bill', 'E-Way Bill Generation'),
        ('gst_consultation', 'GST Consultation / Advisory'),
        # MSME Services
        ('msme_registration', 'MSME / Udyam Registration'),
        ('msme_certificate', 'MSME Certificate Download'),
        ('msme_amendment', 'MSME Amendment'),
        # Income Tax Services
        ('itr_filing', 'Income Tax Filing'),
        ('itr_notice', 'Income Tax Notice'),
        # Other
        ('company_registration', 'Company Registration'),
        ('trademark', 'Trademark Registration'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('inquiry', 'Inquiry'), ('documents_pending', 'Documents Pending'),
        ('in_progress', 'In Progress'), ('completed', 'Completed'), ('rejected', 'Rejected'),
    ]
    BUSINESS_TYPE_CHOICES = [
        ('proprietor', 'Proprietor'), ('partnership', 'Partnership'), ('company', 'Company'),
    ]
    TURNOVER_CHOICES = [
        ('below_20l', 'Below ₹20 Lakhs'),
        ('20l_1cr', '₹20L – ₹1 Cr'),
        ('above_1cr', 'Above ₹1 Cr'),
    ]
    INCOME_SLAB_CHOICES = [
        ('0_5l', '0 to ₹5 Lakh'),
        ('5l_10l', '₹5 Lakh to ₹10 Lakh'),
        ('10l_18l', '₹10 Lakh to ₹18 Lakh'),
        ('above_18l', '₹18 Lakh and above'),
    ]

    # Basic Info (common to all)
    client_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True)
    city_state = models.CharField(max_length=255, blank=True)

    # Service
    service_type = models.CharField(max_length=30, choices=SERVICE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inquiry')

    # GST / MSME shared
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPE_CHOICES, blank=True)

    # GST specific
    turnover_range = models.CharField(max_length=20, choices=TURNOVER_CHOICES, blank=True)
    existing_gst_number = models.BooleanField(null=True, blank=True)
    gstin = models.CharField(max_length=15, blank=True)

    # MSME specific
    existing_msme_number = models.BooleanField(null=True, blank=True)
    udyam_number = models.CharField(max_length=20, blank=True)

    # Income Tax specific
    date_of_birth = models.DateField(null=True, blank=True)
    income_nature = models.JSONField(default=list, blank=True)  # ['salaried', 'shares', 'rental', 'other']
    income_slab = models.CharField(max_length=20, choices=INCOME_SLAB_CHOICES, blank=True)

    # Common optional
    pan_number = models.CharField(max_length=10, blank=True)
    aadhaar_number = models.CharField(max_length=12, blank=True)
    financial_year = models.CharField(max_length=10, blank=True)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='capital_services')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_assigned_services')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='capital_created_services', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('phone', 'service_type', 'financial_year', 'company')]
        indexes = [models.Index(fields=['company']), models.Index(fields=['status']), models.Index(fields=['service_type']), models.Index(fields=['assigned_to'])]

    def __str__(self): return f"{self.client_name} - {self.get_service_type_display()} ({self.get_status_display()})"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return f"{self.assigned_to.first_name} {self.assigned_to.last_name}".strip() or self.assigned_to.username
        return None

    @property
    def created_by_name(self):
        if self.created_by:
            return f"{self.created_by.first_name} {self.created_by.last_name}".strip() or self.created_by.username
        return None
