# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('leaves', '0003_add_company_to_leave'),
    ]

    operations = [
        migrations.AlterField(
            model_name='leave',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leaves',
                to='accounts.company',
                help_text='Company this leave belongs to'
            ),
        ),
    ]
