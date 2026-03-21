# Generated migration for multi-company support Phase 3
from django.db import migrations


def create_default_company(apps, schema_editor):
    """Create default company and assign to all existing records"""
    Company = apps.get_model('accounts', 'Company')
    User = apps.get_model('accounts', 'User')
    
    # Get models from other apps
    try:
        Lead = apps.get_model('leads', 'Lead')
    except LookupError:
        Lead = None
    
    try:
        Customer = apps.get_model('customers', 'Customer')
    except LookupError:
        Customer = None
    
    try:
        Project = apps.get_model('projects', 'Project')
    except LookupError:
        Project = None
    
    try:
        Task = apps.get_model('tasks', 'Task')
    except LookupError:
        Task = None
    
    try:
        Leave = apps.get_model('leaves', 'Leave')
    except LookupError:
        Leave = None
    
    try:
        Holiday = apps.get_model('holidays', 'Holiday')
    except LookupError:
        Holiday = None
    
    try:
        Announcement = apps.get_model('announcements', 'Announcement')
    except LookupError:
        Announcement = None
    
    try:
        ActivityLog = apps.get_model('activity_logs', 'ActivityLog')
    except LookupError:
        ActivityLog = None
    
    try:
        Notification = apps.get_model('notifications', 'Notification')
    except LookupError:
        Notification = None
    
    # Create default company
    default_company, created = Company.objects.get_or_create(
        code='ESWARI',
        defaults={
            'name': 'Eswari Group',
            'is_active': True
        }
    )
    
    if created:
        print(f"✓ Created default company: {default_company.name} ({default_company.code})")
    else:
        print(f"✓ Default company already exists: {default_company.name} ({default_company.code})")
    
    # Assign all existing users to default company
    user_count = User.objects.filter(company__isnull=True).update(
        company=default_company
    )
    print(f"✓ Assigned {user_count} users to {default_company.name}")
    
    # Assign all existing leads
    if Lead:
        lead_count = Lead.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {lead_count} leads to {default_company.name}")
    
    # Assign all existing customers
    if Customer:
        customer_count = Customer.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {customer_count} customers to {default_company.name}")
    
    # Assign all existing projects
    if Project:
        project_count = Project.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {project_count} projects to {default_company.name}")
    
    # Assign all existing tasks
    if Task:
        task_count = Task.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {task_count} tasks to {default_company.name}")
    
    # Assign all existing leaves
    if Leave:
        leave_count = Leave.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {leave_count} leaves to {default_company.name}")
    
    # Assign all existing holidays
    if Holiday:
        holiday_count = Holiday.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {holiday_count} holidays to {default_company.name}")
    
    # Assign all existing announcements
    if Announcement:
        announcement_count = Announcement.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {announcement_count} announcements to {default_company.name}")
    
    # Assign all existing activity logs
    if ActivityLog:
        activity_log_count = ActivityLog.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {activity_log_count} activity logs to {default_company.name}")
    
    # Assign all existing notifications
    if Notification:
        notification_count = Notification.objects.filter(company__isnull=True).update(
            company=default_company
        )
        print(f"✓ Assigned {notification_count} notifications to {default_company.name}")
    
    # Validate: Check for any remaining null company assignments
    models_to_check = [
        ('User', User),
    ]
    
    if Lead:
        models_to_check.append(('Lead', Lead))
    if Customer:
        models_to_check.append(('Customer', Customer))
    if Project:
        models_to_check.append(('Project', Project))
    if Task:
        models_to_check.append(('Task', Task))
    if Leave:
        models_to_check.append(('Leave', Leave))
    if Holiday:
        models_to_check.append(('Holiday', Holiday))
    if Announcement:
        models_to_check.append(('Announcement', Announcement))
    if ActivityLog:
        models_to_check.append(('ActivityLog', ActivityLog))
    if Notification:
        models_to_check.append(('Notification', Notification))
    
    print("\n" + "=" * 60)
    print("VALIDATION CHECK")
    print("=" * 60)
    
    all_valid = True
    for model_name, Model in models_to_check:
        null_count = Model.objects.filter(company__isnull=True).count()
        if null_count > 0:
            print(f"⚠ WARNING: {null_count} {model_name} records still have null company")
            all_valid = False
        else:
            total_count = Model.objects.count()
            print(f"✓ All {total_count} {model_name} records have company assignment")
    
    print("=" * 60)
    if all_valid:
        print("✓ MIGRATION COMPLETED SUCCESSFULLY")
    else:
        print("⚠ MIGRATION COMPLETED WITH WARNINGS - Review null assignments")
    print("=" * 60)


def reverse_populate(apps, schema_editor):
    """Rollback: Set all company assignments to null and delete default company"""
    Company = apps.get_model('accounts', 'Company')
    User = apps.get_model('accounts', 'User')
    
    # Get models from other apps
    try:
        Lead = apps.get_model('leads', 'Lead')
    except LookupError:
        Lead = None
    
    try:
        Customer = apps.get_model('customers', 'Customer')
    except LookupError:
        Customer = None
    
    try:
        Project = apps.get_model('projects', 'Project')
    except LookupError:
        Project = None
    
    try:
        Task = apps.get_model('tasks', 'Task')
    except LookupError:
        Task = None
    
    try:
        Leave = apps.get_model('leaves', 'Leave')
    except LookupError:
        Leave = None
    
    try:
        Holiday = apps.get_model('holidays', 'Holiday')
    except LookupError:
        Holiday = None
    
    try:
        Announcement = apps.get_model('announcements', 'Announcement')
    except LookupError:
        Announcement = None
    
    try:
        ActivityLog = apps.get_model('activity_logs', 'ActivityLog')
    except LookupError:
        ActivityLog = None
    
    try:
        Notification = apps.get_model('notifications', 'Notification')
    except LookupError:
        Notification = None
    
    print("\n" + "=" * 60)
    print("ROLLING BACK COMPANY ASSIGNMENTS")
    print("=" * 60)
    
    # Clear all company assignments
    User.objects.all().update(company=None)
    print("✓ Cleared company assignments from User records")
    
    if Lead:
        Lead.objects.all().update(company=None)
        print("✓ Cleared company assignments from Lead records")
    
    if Customer:
        Customer.objects.all().update(company=None)
        print("✓ Cleared company assignments from Customer records")
    
    if Project:
        Project.objects.all().update(company=None)
        print("✓ Cleared company assignments from Project records")
    
    if Task:
        Task.objects.all().update(company=None)
        print("✓ Cleared company assignments from Task records")
    
    if Leave:
        Leave.objects.all().update(company=None)
        print("✓ Cleared company assignments from Leave records")
    
    if Holiday:
        Holiday.objects.all().update(company=None)
        print("✓ Cleared company assignments from Holiday records")
    
    if Announcement:
        Announcement.objects.all().update(company=None)
        print("✓ Cleared company assignments from Announcement records")
    
    if ActivityLog:
        ActivityLog.objects.all().update(company=None)
        print("✓ Cleared company assignments from ActivityLog records")
    
    if Notification:
        Notification.objects.all().update(company=None)
        print("✓ Cleared company assignments from Notification records")
    
    # Delete default company
    deleted_count, _ = Company.objects.filter(code='ESWARI').delete()
    if deleted_count > 0:
        print(f"✓ Deleted default company (ESWARI)")
    
    print("=" * 60)
    print("✓ ROLLBACK COMPLETED")
    print("=" * 60)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_add_company_to_user'),
        ('leads', '0012_add_company_to_lead'),
        ('customers', '0004_add_company_to_customer'),
        ('projects', '0011_add_company_to_project'),
        ('tasks', '0007_add_company_to_task'),
        ('leaves', '0003_add_company_to_leave'),
        ('holidays', '0003_add_company_to_holiday'),
        ('announcements', '0004_add_company_to_announcement'),
        ('activity_logs', '0003_add_company_to_activitylog'),
        ('notifications', '0001_add_company_to_notification'),
    ]

    operations = [
        migrations.RunPython(
            create_default_company,
            reverse_code=reverse_populate
        ),
    ]
