# Generated migration for adding custom_services field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_leads', '0002_alter_aselead_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='aselead',
            name='custom_services',
            field=models.TextField(blank=True, help_text='Custom services not in predefined list', null=True),
        ),
    ]