# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('customers', '0004_add_company_to_customer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customer',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='customers',
                to='accounts.company',
                help_text='Company this customer belongs to'
            ),
        ),
    ]
