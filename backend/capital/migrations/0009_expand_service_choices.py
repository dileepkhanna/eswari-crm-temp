# Generated migration to expand service field choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0008_allow_custom_loan_types'),
    ]

    operations = [
        # Remove constraints on service_type to allow all values from updated choices
        migrations.AlterField(
            model_name='capitalservice',
            name='service_type',
            field=models.CharField(max_length=30),
        ),
        # Remove constraints on status to allow all values from updated choices
        migrations.AlterField(
            model_name='capitalservice',
            name='status',
            field=models.CharField(default='inquiry', max_length=20),
        ),
        # Remove constraints on business_type to allow all values from updated choices
        migrations.AlterField(
            model_name='capitalservice',
            name='business_type',
            field=models.CharField(blank=True, max_length=20),
        ),
        # Remove constraints on turnover_range to allow all values from updated choices
        migrations.AlterField(
            model_name='capitalservice',
            name='turnover_range',
            field=models.CharField(blank=True, max_length=20),
        ),
        # Remove constraints on income_slab to allow all values from updated choices
        migrations.AlterField(
            model_name='capitalservice',
            name='income_slab',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
