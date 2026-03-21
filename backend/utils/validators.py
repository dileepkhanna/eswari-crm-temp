"""
Validation utilities for company-related operations.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CompanyValidationMixin:
    """
    Mixin for serializers that need to validate company fields.
    
    Validates:
    - Company exists
    - Company is active
    - Provides descriptive error messages
    """
    
    def validate_company(self, value):
        """
        Validate that the company exists and is active.
        
        Args:
            value: Company instance
            
        Returns:
            Company instance if valid
            
        Raises:
            serializers.ValidationError: If company doesn't exist or is inactive
        """
        if value is None:
            raise serializers.ValidationError("Company is required")
        
        # Check if company is active
        if not value.is_active:
            raise serializers.ValidationError("Company is not active")
        
        return value


class ManagerValidationMixin:
    """
    Mixin for serializers that need to validate manager assignments.
    
    Validates:
    - Manager is from the same company as the employee
    - Provides descriptive error messages
    """
    
    def validate_manager_company(self, manager, employee_company):
        """
        Validate that manager is from the same company as the employee.
        
        Args:
            manager: User instance (manager)
            employee_company: Company instance (employee's company)
            
        Raises:
            serializers.ValidationError: If manager is from different company
        """
        if manager and employee_company:
            if manager.company_id != employee_company.id:
                raise serializers.ValidationError({
                    'manager': 'Manager must be from the same company'
                })
