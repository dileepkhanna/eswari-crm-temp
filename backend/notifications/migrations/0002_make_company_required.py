# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('notifications', '0001_add_company_to_notification'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='notifications',
                to='accounts.company',
                help_text='Company this notification belongs to'
            ),
        ),
    ]
