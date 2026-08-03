# Migration to add converted_at field to ASELead

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_leads', '0026_add_is_disabled_to_leads'),
    ]

    operations = [
        migrations.AddField(
            model_name='aselead',
            name='converted_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="Date and time when the customer was converted to this lead"
            ),
        ),
        migrations.AddIndex(
            model_name='aselead',
            index=models.Index(fields=['converted_at'], name='ase_leads_aselead_converted_at_idx'),
        ),
    ]
