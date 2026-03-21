# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0005_make_company_required'),
    ]

    operations = [
        # Announcements - composite indexes
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(fields=['company', 'is_active'], name='announcement_company_active_idx'),
        ),
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(fields=['company', 'priority'], name='announcement_company_priority_idx'),
        ),
    ]
