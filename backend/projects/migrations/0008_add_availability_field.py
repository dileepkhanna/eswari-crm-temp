# Generated migration for adding availability field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0007_alter_project_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='availability',
            field=models.JSONField(blank=True, default=dict, help_text='Floor-wise and facing-wise flat availability data'),
        ),
    ]
