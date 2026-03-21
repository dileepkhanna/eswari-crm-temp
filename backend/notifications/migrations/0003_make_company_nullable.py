from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('notifications', '0002_make_company_required'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='notifications',
                to='accounts.company',
                help_text='Company this notification belongs to',
            ),
        ),
    ]
