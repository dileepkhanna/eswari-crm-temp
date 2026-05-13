# Generated migration to update marketing_category choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0003_add_marketing_category'),
    ]

    operations = [
        migrations.AlterField(
            model_name='team',
            name='marketing_category',
            field=models.CharField(
                blank=True,
                choices=[
                    ('bre', 'Business Research Executive (BRE)'),
                    ('boe', 'Business Outreach Executive (BOE)'),
                    ('cre', 'Client Research Executive (CRE)'),
                    ('marketing_lead', 'Marketing Team Lead')
                ],
                help_text='Marketing team category (only for marketing teams)',
                max_length=20,
                null=True
            ),
        ),
    ]
