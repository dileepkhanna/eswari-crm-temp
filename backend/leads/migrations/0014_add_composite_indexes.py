# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0013_make_company_required'),
    ]

    operations = [
        # Leads - composite indexes for common queries
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['company', 'status'], name='lead_company_status_idx'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['company', 'assigned_to'], name='lead_company_assigned_idx'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['company', 'follow_up_date'], name='lead_company_followup_idx'),
        ),
    ]
