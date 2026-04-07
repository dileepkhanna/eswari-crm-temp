from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0003_capitalservice_new_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='capitalcustomer',
            name='interest',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('none', 'Not Decided'),
                    ('loan', 'Loan'),
                    ('gst', 'GST Service'),
                    ('msme', 'MSME Service'),
                    ('itr', 'Income Tax Filing'),
                ],
                default='none',
            ),
        ),
    ]
