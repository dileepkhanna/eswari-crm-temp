# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('leads', '0012_add_company_to_lead'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lead',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leads',
                to='accounts.company',
                help_text='Company this lead belongs to'
            ),
        ),
    ]
