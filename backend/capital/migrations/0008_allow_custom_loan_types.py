# Generated migration to allow custom loan types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0007_bankloanstatus_loandocument_loanapprovalstage_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='capitalloan',
            name='loan_type',
            field=models.CharField(max_length=100, default='personal'),
        ),
    ]
