# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('activity_logs', '0003_add_company_to_activitylog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activitylog',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='activity_logs',
                to='accounts.company',
                help_text='Company this activity log belongs to'
            ),
        ),
    ]
