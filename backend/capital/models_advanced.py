from django.db import models
from django.conf import settings
from decimal import Decimal
import math


class LoanDocument(models.Model):
    """Track required documents for loan applications"""
    DOCUMENT_TYPE_CHOICES = [
        ('identity', 'Identity Proof (Aadhaar/PAN/Passport)'),
        ('address', 'Address Proof'),
        ('income', 'Income Proof (Salary Slips/ITR)'),
        ('bank_statement', 'Bank Statement (6 months)'),
        ('business_proof', 'Business Proof (GST/Registration)'),
        ('property_docs', 'Property Documents'),
        ('photo', 'Passport Size Photo'),
        ('form16', 'Form 16'),
        ('itr', 'Income Tax Returns'),
        ('balance_sheet', 'Balance Sheet'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    loan = models.ForeignKey('CapitalLoan', on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    file_path = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_documents')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['document_type']
        unique_together = [('loan', 'document_type')]
    
    def __str__(self):
        return f"{self.loan.applicant_name} - {self.get_document_type_display()}"


class LoanApprovalStage(models.Model):
    """Multi-stage approval workflow for loans"""
    STAGE_CHOICES = [
        ('initial_review', 'Initial Review'),
        ('document_verification', 'Document Verification'),
        ('credit_check', 'Credit Check'),
        ('manager_approval', 'Manager Approval'),
        ('bank_submission', 'Bank Submission'),
        ('bank_processing', 'Bank Processing'),
        ('final_approval', 'Final Approval'),
        ('disbursement', 'Disbursement'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
        ('on_hold', 'On Hold'),
    ]
    
    loan = models.ForeignKey('CapitalLoan', on_delete=models.CASCADE, related_name='approval_stages')
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approval_stages')
    notes = models.TextField(blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_stages')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        unique_together = [('loan', 'stage')]
    
    def __str__(self):
        return f"{self.loan.applicant_name} - {self.get_stage_display()}"


class BankInterestRate(models.Model):
    """Store and compare interest rates from different banks"""
    LOAN_TYPE_CHOICES = [
        ('personal', 'Personal Loan'),
        ('business', 'Business Loan'),
        ('home', 'Home Loan'),
        ('vehicle', 'Vehicle Loan'),
        ('education', 'Education Loan'),
        ('gold', 'Gold Loan'),
        ('mortgage', 'Mortgage Loan'),
    ]
    
    bank_name = models.CharField(max_length=255)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPE_CHOICES)
    min_interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    max_interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    processing_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    min_loan_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    max_loan_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    min_tenure_months = models.PositiveIntegerField(default=12)
    max_tenure_months = models.PositiveIntegerField(default=360)
    features = models.JSONField(default=list, blank=True)  # ['no_prepayment_charges', 'flexible_emi', etc.]
    is_active = models.BooleanField(default=True)
    company = models.ForeignKey('accounts.Company', on_delete=models.PROTECT, related_name='bank_rates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['bank_name', 'loan_type']
        unique_together = [('bank_name', 'loan_type', 'company')]
    
    def __str__(self):
        return f"{self.bank_name} - {self.get_loan_type_display()} ({self.min_interest_rate}% - {self.max_interest_rate}%)"
    
    @staticmethod
    def calculate_emi(principal, annual_rate, tenure_months):
        """Calculate EMI using the standard formula"""
        if principal <= 0 or tenure_months <= 0:
            return 0
        
        if annual_rate == 0:
            return principal / tenure_months
        
        monthly_rate = Decimal(annual_rate) / Decimal(12) / Decimal(100)
        emi = (principal * monthly_rate * ((1 + monthly_rate) ** tenure_months)) / (((1 + monthly_rate) ** tenure_months) - 1)
        return round(emi, 2)
    
    @staticmethod
    def calculate_total_payment(emi, tenure_months):
        """Calculate total amount to be paid"""
        return round(emi * tenure_months, 2)
    
    @staticmethod
    def calculate_total_interest(total_payment, principal):
        """Calculate total interest payable"""
        return round(total_payment - principal, 2)


class BankLoanStatus(models.Model):
    """Track loan status with bank integration"""
    STATUS_CHOICES = [
        ('not_submitted', 'Not Submitted to Bank'),
        ('submitted', 'Submitted to Bank'),
        ('under_review', 'Under Bank Review'),
        ('additional_docs_required', 'Additional Documents Required'),
        ('approved', 'Approved by Bank'),
        ('rejected', 'Rejected by Bank'),
        ('disbursed', 'Loan Disbursed'),
    ]
    
    loan = models.OneToOneField('CapitalLoan', on_delete=models.CASCADE, related_name='bank_status')
    bank_name = models.CharField(max_length=255)
    bank_reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='not_submitted')
    submitted_date = models.DateField(null=True, blank=True)
    approved_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    approved_interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    approved_tenure_months = models.PositiveIntegerField(null=True, blank=True)
    disbursement_date = models.DateField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    bank_remarks = models.TextField(blank=True)
    last_updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.loan.applicant_name} - {self.bank_name} ({self.get_status_display()})"
