from rest_framework import serializers
from .models import (
    CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService,
    LoanDocument, LoanApprovalStage, BankInterestRate, BankLoanStatus
)


class CapitalCustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()

    class Meta:
        model = CapitalCustomer
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class CapitalLeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()

    class Meta:
        model = CapitalLead
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']

 
class CapitalTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    loan_name = serializers.CharField(source='loan.applicant_name', read_only=True)
    loan_phone = serializers.CharField(source='loan.phone', read_only=True)
    service_name = serializers.CharField(source='service.client_name', read_only=True)
    service_type_display = serializers.CharField(source='service.get_service_type_display', read_only=True)

    class Meta:
        model = CapitalTask
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class CapitalLoanSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CapitalLoan
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class CapitalServiceSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    income_slab_display = serializers.CharField(source='get_income_slab_display', read_only=True)
    turnover_range_display = serializers.CharField(source='get_turnover_range_display', read_only=True)

    class Meta:
        model = CapitalService
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']



# Advanced Features Serializers

class LoanDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LoanDocument
        fields = '__all__'
        read_only_fields = ['verified_by', 'verified_at', 'created_at', 'updated_at']
    
    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return f"{obj.verified_by.first_name} {obj.verified_by.last_name}".strip() or obj.verified_by.username
        return None


class LoanApprovalStageSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LoanApprovalStage
        fields = '__all__'
        read_only_fields = ['completed_by', 'completed_at', 'created_at', 'updated_at']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.username
        return None
    
    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return f"{obj.completed_by.first_name} {obj.completed_by.last_name}".strip() or obj.completed_by.username
        return None


class BankInterestRateSerializer(serializers.ModelSerializer):
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    
    class Meta:
        model = BankInterestRate
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'company']


class BankLoanStatusSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    last_updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BankLoanStatus
        fields = '__all__'
        read_only_fields = ['last_updated_by', 'created_at', 'updated_at']
    
    def get_last_updated_by_name(self, obj):
        if obj.last_updated_by:
            return f"{obj.last_updated_by.first_name} {obj.last_updated_by.last_name}".strip() or obj.last_updated_by.username
        return None


class CapitalLoanDetailSerializer(CapitalLoanSerializer):
    """Extended loan serializer with related data"""
    documents = LoanDocumentSerializer(many=True, read_only=True)
    approval_stages = LoanApprovalStageSerializer(many=True, read_only=True)
    bank_status = BankLoanStatusSerializer(read_only=True)
    
    class Meta(CapitalLoanSerializer.Meta):
        fields = '__all__'
