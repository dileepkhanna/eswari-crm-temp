# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('holidays', '0004_make_company_required'),
    ]

    operations = [
        # Holidays - composite indexes
        migrations.AddIndex(
            model_name='holiday',
            index=models.Index(fields=['company', 'holiday_type'], name='holiday_company_type_idx'),
        ),
    ]
