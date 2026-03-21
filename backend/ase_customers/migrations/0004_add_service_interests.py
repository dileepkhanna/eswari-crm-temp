# Generated migration for adding service_interests field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_customers', '0003_add_company_name_and_update_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='asecustomer',
            name='service_interests',
            field=models.JSONField(blank=True, default=list, help_text='Digital marketing services of interest'),
        ),
    ]