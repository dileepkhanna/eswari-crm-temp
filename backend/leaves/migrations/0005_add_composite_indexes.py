# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0004_make_company_required'),
    ]

    operations = [
        # Leaves - composite indexes
        migrations.AddIndex(
            model_name='leave',
            index=models.Index(fields=['company', 'status'], name='leave_company_status_idx'),
        ),
        migrations.AddIndex(
            model_name='leave',
            index=models.Index(fields=['company', 'user'], name='leave_company_user_idx'),
        ),
        migrations.AddIndex(
            model_name='leave',
            index=models.Index(fields=['company', 'start_date'], name='leave_company_start_idx'),
        ),
    ]
