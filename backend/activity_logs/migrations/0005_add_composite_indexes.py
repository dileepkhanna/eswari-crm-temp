# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0004_make_company_required'),
    ]

    operations = [
        # ActivityLogs - composite indexes
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['company', 'module'], name='activitylog_company_module_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['company', 'user'], name='activitylog_company_user_idx'),
        ),
    ]
