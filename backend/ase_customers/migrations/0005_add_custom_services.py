# Generated migration for adding custom_services field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_customers', '0004_add_service_interests'),
    ]

    operations = [
        migrations.AddField(
            model_name='asecustomer',
            name='custom_services',
            field=models.TextField(blank=True, help_text='Custom services not in predefined list', null=True),
        ),
    ]