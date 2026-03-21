# Generated manually to fix migration issues

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_customers', '0002_auto_20260311_1100'),
    ]

    operations = [
        # Add company_name field
        migrations.AddField(
            model_name='asecustomer',
            name='company_name',
            field=models.CharField(blank=True, help_text='Company name (optional)', max_length=255, null=True),
        ),
        # Update name field to be optional
        migrations.AlterField(
            model_name='asecustomer',
            name='name',
            field=models.CharField(blank=True, help_text='Customer name (optional)', max_length=255, null=True),
        ),
        # Update email field help text
        migrations.AlterField(
            model_name='asecustomer',
            name='email',
            field=models.EmailField(blank=True, help_text='Email address (optional)', max_length=254, null=True),
        ),
        # Update phone field help text
        migrations.AlterField(
            model_name='asecustomer',
            name='phone',
            field=models.CharField(help_text='Primary phone number (required)', max_length=20),
        ),
    ]