# accounts/permissions.py
"""
Hierarchical Permission System for Employee-Manager-Admin relationships

This module provides utilities for filtering querysets based on user roles
and manager-employee hierarchies.

Role Hierarchy:
- Admin: Can see all data
- Manager: Can see their own data + data of employees under them
- Employee: Can only see their own data
"""

from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()


def get_accessible_user_ids(user):
    """
    Get list of user IDs that the current user can access data for with strict access control.
    
    Args:
        user: The current authenticated user
        
    Returns:
        list: List of user IDs accessible to this user
    """
    if user.role == 'admin':
        # Admin can access all users across all companies
        return list(User.objects.values_list('id', flat=True))
    
    elif user.role == 'hr':
        # HR can access all users within their company only
        return list(User.objects.filter(company=user.company).values_list('id', flat=True))
    
    elif user.role == 'manager':
        # Manager can access ONLY their assigned employees' data + their own data
        employee_ids = list(
            User.objects.filter(manager=user, company=user.company).values_list('id', flat=True)
        )
        employee_ids.append(user.id)  # Include manager's own ID
        return employee_ids
    
    elif user.role == 'employee':
        # Employee can ONLY access their own data
        return [user.id]
    
    return []

def filter_by_user_access(queryset, user, assigned_to_field='assigned_to', created_by_field='created_by'):
    """
    Filter a queryset based on user's role and accessible users with strict access control.
    
    This function filters data so that:
    - Admins see all data across all companies
    - HR see all data within their company
    - Managers see their own data + their assigned employees' data only
    - Employees see only their own data
    
    Args:
        queryset: Django queryset to filter
        user: Current authenticated user
        assigned_to_field: Name of the field that stores who the record is assigned to
        created_by_field: Name of the field that stores who created the record
        
    Returns:
        Filtered queryset
    """
    if user.role == 'admin':
        # Admin can see ALL data across all companies
        return queryset.all()
    
    if user.role == 'hr':
        # HR can see all data within their company
        company_filter = Q()
        if hasattr(queryset.model, 'company'):
            company_filter = Q(company=user.company)
        return queryset.filter(company_filter)
    
    # Get accessible user IDs for manager/employee roles
    accessible_user_ids = get_accessible_user_ids(user)
    
    # Build Q objects for filtering
    filters = Q()
    
    # Filter by assigned_to if field exists
    if assigned_to_field and hasattr(queryset.model, assigned_to_field):
        filters |= Q(**{f'{assigned_to_field}__id__in': accessible_user_ids})
    
    # Filter by created_by if field exists
    if created_by_field and hasattr(queryset.model, created_by_field):
        filters |= Q(**{f'{created_by_field}__id__in': accessible_user_ids})
    
    # Also filter by company to ensure data isolation
    if hasattr(queryset.model, 'company'):
        filters &= Q(company=user.company)
    
    return queryset.filter(filters).distinct()


def can_access_user_data(requesting_user, target_user):
    """
    Check if requesting_user can access target_user's data.
    
    Args:
        requesting_user: User making the request
        target_user: User whose data is being accessed
        
    Returns:
        bool: True if access is allowed, False otherwise
    """
    if requesting_user.role == 'admin':
        return True
    
    if requesting_user.id == target_user.id:
        return True
    
    if requesting_user.role == 'manager':
        # Check if target_user is an employee under this manager
        return target_user.manager_id == requesting_user.id
    
    return False


def can_hr_access_module(module_name):
    """
    Determine if HR role can access a specific module.
    
    HR can access: employees, leaves, holidays, announcements, reports
    HR cannot access: leads, customers, projects, tasks
    
    Args:
        module_name: Name of the module to check access for
        
    Returns:
        bool: True if HR can access the module, False otherwise
    """
    hr_allowed_modules = [
        'users', 
        'employees', 
        'leaves', 
        'holidays', 
        'announcements', 
        'reports', 
        'settings'
    ]
    return module_name in hr_allowed_modules


def should_hide_contact_details(requesting_user, data_owner_user):
    """
    Determine if contact details should be hidden from the requesting user.
    
    Contact details (phone, email, address) should be hidden when:
    - An employee is viewing another employee's data
    - An employee is viewing their manager's data
    
    Contact details should be visible when:
    - Admin viewing any data
    - Manager viewing their employees' data
    - User viewing their own data
    
    Args:
        requesting_user: User making the request
        data_owner_user: User who owns/created the data
        
    Returns:
        bool: True if contact details should be hidden, False otherwise
    """
    # Admin can see everything
    if requesting_user.role == 'admin':
        return False
    
    # Users can see their own data
    if requesting_user.id == data_owner_user.id:
        return False
    
    # Managers can see their employees' data
    if requesting_user.role == 'manager' and data_owner_user.manager_id == requesting_user.id:
        return False
    
    # All other cases: hide contact details
    # This includes:
    # - Employee viewing another employee's data
    # - Employee viewing manager's data
    # - Employee viewing admin's data
    return True


def mask_contact_details(data, requesting_user, owner_user_id=None, owner_user=None):
    """
    Mask sensitive contact details in data if necessary.
    
    Args:
        data: Dictionary containing the data
        requesting_user: User making the request
        owner_user_id: ID of the user who owns the data (optional)
        owner_user: User object who owns the data (optional)
        
    Returns:
        dict: Data with masked contact details if necessary
    """
    if not owner_user and owner_user_id:
        try:
            owner_user = User.objects.get(id=owner_user_id)
        except User.DoesNotExist:
            return data
    
    if not owner_user:
        return data
    
    if should_hide_contact_details(requesting_user, owner_user):
        # Mask sensitive fields
        if 'phone' in data:
            data['phone'] = '***HIDDEN***'
        if 'email' in data:
            data['email'] = '***HIDDEN***'
        if 'address' in data:
            data['address'] = '***HIDDEN***'
        if 'contact' in data:
            data['contact'] = '***HIDDEN***'
    
    return data


# Company-based access control
from rest_framework import permissions


class CompanyAccessPermission(permissions.BasePermission):
    """
    Permission class to enforce company-based access control.
    
    Access Rules:
    - Admin and HR: Can access any company's data
    - Manager and Employee: Can only access their own company's data
    
    Returns 403 Forbidden for cross-company access attempts by restricted roles.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access the specific object.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The object being accessed
            
        Returns:
            bool: True if access is allowed, False otherwise (403 will be returned)
        """
        user = request.user
        
        # Admin and HR have access to all companies
        if user.role in ['admin', 'hr']:
            return True
        
        # Check if object has company attribute
        if not hasattr(obj, 'company'):
            return True  # No company restriction
        
        # Managers and Employees can only access their company's data
        return obj.company_id == user.company_id
