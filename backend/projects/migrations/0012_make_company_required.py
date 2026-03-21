# Generated migration for making company field required
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_populate_default_company'),
        ('projects', '0011_add_company_to_project'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='projects',
                to='accounts.company',
                help_text='Company this project belongs to'
            ),
        ),
    ]
