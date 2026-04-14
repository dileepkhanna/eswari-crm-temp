"""Optimized serializers for faster API responses"""
from rest_framework import serializers
from .models import CapitalService, CapitalLoan, CapitalCustomer, CapitalTask


class FastCapitalServiceSerializer(serializers.ModelSerializer):
    """Optimized serializer with minimal fields for list views"""
    assigned_to_name = serializers.CharField(source='assigned_to_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by_name', read_only=True)
    
    class Meta:
        model = CapitalService
        fields = [
            'id', 'client_name', 'phone', 'email', 'business_name',
            'service_type', 'status', 'financial_year',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class FastCapitalLoanSerializer(serializers.ModelSerializer):
    """Optimized serializer with minimal fields for list views"""
    assigned_to_name = serializers.CharField(source='assigned_to_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by_name', read_only=True)
    
    class Meta:
        model = CapitalLoan
        fields = [
            'id', 'applicant_name', 'phone', 'email',
            'loan_type', 'loan_amount', 'tenure_months', 'bank_name', 'status',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class FastCapitalCustomerSerializer(serializers.ModelSerializer):
    """Optimized serializer with minimal fields for list views"""
    assigned_to_name = serializers.CharField(source='assigned_to_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by_name', read_only=True)
    
    class Meta:
        model = CapitalCustomer
        fields = [
            'id', 'name', 'phone', 'email', 'company_name',
            'call_status', 'interest', 'is_converted',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']


class FastCapitalTaskSerializer(serializers.ModelSerializer):
    """Optimized serializer with minimal fields for list views"""
    assigned_to_name = serializers.CharField(source='assigned_to_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by_name', read_only=True)
    
    class Meta:
        model = CapitalTask
        fields = [
            'id', 'title', 'description', 'status', 'priority',
            'due_date',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'company']
