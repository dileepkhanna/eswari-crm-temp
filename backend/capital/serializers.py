from rest_framework import serializers
from .models import CapitalCustomer, CapitalLead, CapitalTask, CapitalLoan, CapitalService


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
