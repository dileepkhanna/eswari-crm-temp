# Generated migration for composite indexes optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0012_make_company_required'),
    ]

    operations = [
        # Projects - composite indexes
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['company', 'status'], name='project_company_status_idx'),
        ),
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['company', 'type'], name='project_company_type_idx'),
        ),
    ]
