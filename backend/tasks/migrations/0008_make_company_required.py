# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('tasks', '0007_add_company_to_task'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='tasks',
                to='accounts.company',
                help_text='Company this task belongs to'
            ),
        ),
    ]
