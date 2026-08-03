# Generated migration for adding is_disabled field to ASELead

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_leads', '0025_add_is_disabled_to_tasks'),
    ]

    operations = [
        migrations.AddField(
            model_name='aselead',
            name='is_disabled',
            field=models.BooleanField(
                default=False,
                help_text="Set to True when this lead is converted to a task and should be hidden from active lead lists"
            ),
        ),
        migrations.AddField(
            model_name='aselead',
            name='converted_task_id',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text="ID of converted task"
            ),
        ),
        migrations.AddIndex(
            model_name='aselead',
            index=models.Index(fields=['is_disabled'], name='ase_leads_aselead_is_disabled_idx'),
        ),
    ]
