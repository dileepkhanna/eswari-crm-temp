# Generated migration for adding is_disabled field to ASELeadTask

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_leads', '0023_update_lead_status_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='aseleadtask',
            name='is_disabled',
            field=models.BooleanField(
                default=False,
                help_text="Set to True when this task is converted to a lead and should be hidden from active task lists"
            ),
        ),
        migrations.AddIndex(
            model_name='aseleadtask',
            index=models.Index(fields=['is_disabled'], name='ase_leads_aseleadtask_is_disabled_idx'),
        ),
    ]
