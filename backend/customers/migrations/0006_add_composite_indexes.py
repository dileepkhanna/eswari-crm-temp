# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0005_make_company_required'),
    ]

    operations = [
        # Customers - composite indexes
        migrations.AddIndex(
            model_name='customer',
            index=models.Index(fields=['company', 'call_status'], name='customer_company_status_idx'),
        ),
        migrations.AddIndex(
            model_name='customer',
            index=models.Index(fields=['company', 'assigned_to'], name='customer_company_assigned_idx'),
        ),
        migrations.AddIndex(
            model_name='customer',
            index=models.Index(fields=['company', 'scheduled_date'], name='customer_company_scheduled_idx'),
        ),
    ]
