# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('holidays', '0003_add_company_to_holiday'),
    ]

    operations = [
        migrations.AlterField(
            model_name='holiday',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='holidays',
                to='accounts.company',
                help_text='Company this holiday belongs to'
            ),
        ),
    ]
