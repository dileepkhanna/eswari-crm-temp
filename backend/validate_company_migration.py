#!/usr/bin/env python
"""
Validation script to verify company migration completed successfully.
Run after Phase 3 (data population) and before Phase 4 (making fields required).

Usage:
    python validate_company_migration.py
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Company

User = get_user_model()


def get_model_safe(app_label, model_name):
    """Safely get a model, return None if not found"""
    try:
        from django.apps import apps
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None


def validate_migration():
    """Validate that all records have company assignments"""
    
    print("=" * 60)
    print("COMPANY MIGRATION VALIDATION")
    print("=" * 60)
    
    # Check companies exist
    company_count = Company.objects.count()
    print(f"\n✓ Companies created: {company_count}")
    
    if company_count == 0:
        print("\n✗ ERROR: No companies found in database!")
        print("  Please run the migration first: python manage.py migrate")
        return False
    
    for company in Company.objects.all():
        print(f"  - {company.name} ({company.code}) - Active: {company.is_active}")
    
    # Define models to check
    models_to_check = [
        ('Users', 'accounts', 'User', User),
        ('Leads', 'leads', 'Lead', get_model_safe('leads', 'Lead')),
        ('Customers', 'customers', 'Customer', get_model_safe('customers', 'Customer')),
        ('Projects', 'projects', 'Project', get_model_safe('projects', 'Project')),
        ('Tasks', 'tasks', 'Task', get_model_safe('tasks', 'Task')),
        ('Leaves', 'leaves', 'Leave', get_model_safe('leaves', 'Leave')),
        ('Holidays', 'holidays', 'Holiday', get_model_safe('holidays', 'Holiday')),
        ('Announcements', 'announcements', 'Announcement', get_model_safe('announcements', 'Announcement')),
        ('ActivityLogs', 'activity_logs', 'ActivityLog', get_model_safe('activity_logs', 'ActivityLog')),
        ('Notifications', 'notifications', 'Notification', get_model_safe('notifications', 'Notification')),
    ]
    
    all_valid = True
    total_records = 0
    total_with_company = 0
    total_without_company = 0
    
    print("\n" + "=" * 60)
    print("CHECKING COMPANY ASSIGNMENTS")
    print("=" * 60)
    
    for model_name, app_label, model_class_name, Model in models_to_check:
        if Model is None:
            print(f"\n⚠ {model_name}: Model not found (app may not be installed)")
            continue
        
        try:
            total = Model.objects.count()
            with_company = Model.objects.filter(company__isnull=False).count()
            without_company = Model.objects.filter(company__isnull=True).count()
            
            total_records += total
            total_with_company += with_company
            total_without_company += without_company
            
            if without_company > 0:
                print(f"\n✗ {model_name}: {without_company}/{total} records missing company")
                all_valid = False
                
                # Show sample records without company
                sample_records = Model.objects.filter(company__isnull=True)[:5]
                if sample_records:
                    print(f"  Sample records without company (showing up to 5):")
                    for record in sample_records:
                        print(f"    - ID: {record.id}")
            else:
                if total > 0:
                    print(f"\n✓ {model_name}: All {total} records have company assignment")
                else:
                    print(f"\n○ {model_name}: No records in database")
        except Exception as e:
            print(f"\n✗ {model_name}: Error checking model - {str(e)}")
            all_valid = False
    
    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    print(f"Total records checked: {total_records}")
    print(f"Records with company: {total_with_company}")
    print(f"Records without company: {total_without_company}")
    
    if total_records == 0:
        print("\n○ No records found in database - this is normal for a fresh installation")
        print("✓ VALIDATION PASSED - Safe to proceed to Phase 4")
        return True
    
    print("\n" + "=" * 60)
    if all_valid:
        print("✓ VALIDATION PASSED - Safe to proceed to Phase 4")
        print("\nNext steps:")
        print("  1. Review the migration logs above")
        print("  2. Run Phase 4 migrations to make company fields required:")
        print("     python manage.py migrate")
    else:
        print("✗ VALIDATION FAILED - DO NOT proceed to Phase 4")
        print("\nRequired actions:")
        print("  1. Review the records listed above that are missing company assignments")
        print("  2. Manually assign companies to these records using Django admin or shell")
        print("  3. Re-run this validation script")
        print("  4. Only proceed to Phase 4 after all records have company assignments")
    print("=" * 60)
    
    return all_valid


if __name__ == '__main__':
    try:
        result = validate_migration()
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"\n✗ VALIDATION ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
