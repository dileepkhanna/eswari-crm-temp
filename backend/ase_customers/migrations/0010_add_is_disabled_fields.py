# Generated migration for adding is_disabled field to ASECustomer and CallLog

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ase_customers', '0009_remove_asecustomeractivity_customer_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='asecustomer',
            name='is_disabled',
            field=models.BooleanField(
                default=False,
                help_text="Set to True when this customer record is converted to a lead and should be hidden from active customer lists"
            ),
        ),
        migrations.AddField(
            model_name='calllog',
            name='is_disabled',
            field=models.BooleanField(
                default=False,
                help_text="Set to True when this call is converted to a lead and should be hidden from active call lists"
            ),
        ),
        migrations.AddIndex(
            model_name='asecustomer',
            index=models.Index(fields=['is_disabled'], name='ase_customers_asecustomer_is_disabled_idx'),
        ),
        migrations.AddIndex(
            model_name='calllog',
            index=models.Index(fields=['is_disabled'], name='ase_customers_calllog_is_disabled_idx'),
        ),
    ]
