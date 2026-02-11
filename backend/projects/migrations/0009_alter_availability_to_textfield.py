# Generated migration to change availability from JSONField to TextField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0008_add_availability_field'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='availability',
            field=models.TextField(blank=True, default='', help_text='Floor-wise and facing-wise flat availability data'),
        ),
    ]
