# Generated migration to add performance indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0009_expand_service_choices'),
    ]

    operations = [
        # Add composite indexes for common query patterns
        migrations.AddIndex(
            model_name='capitalservice',
            index=models.Index(fields=['company', '-created_at'], name='capital_srv_comp_created_idx'),
        ),
        migrations.AddIndex(
            model_name='capitalservice',
            index=models.Index(fields=['company', 'status'], name='capital_srv_comp_status_idx'),
        ),
        migrations.AddIndex(
            model_name='capitalservice',
            index=models.Index(fields=['company', 'service_type'], name='capital_srv_comp_type_idx'),
        ),
        migrations.AddIndex(
            model_name='capitalloan',
            index=models.Index(fields=['company', '-created_at'], name='capital_loan_comp_created_idx'),
        ),
        migrations.AddIndex(
            model_name='capitalloan',
            index=models.Index(fields=['company', 'status'], name='capital_loan_comp_status_idx'),
        ),
        migrations.AddIndex(
            model_name='capitalcustomer',
            index=models.Index(fields=['company', '-created_at'], name='capital_cust_comp_created_idx'),
        ),
        migrations.AddIndex(
            model_name='capitaltask',
            index=models.Index(fields=['company', '-created_at'], name='capital_task_comp_created_idx'),
        ),
    ]
