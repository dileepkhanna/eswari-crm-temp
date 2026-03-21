# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0008_make_company_required'),
    ]

    operations = [
        # Tasks - composite indexes
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['company', 'created_at'], name='task_company_created_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['company', 'assigned_to'], name='task_company_assigned_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['company', 'due_date'], name='task_company_due_idx'),
        ),
    ]
