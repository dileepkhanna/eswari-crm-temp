# Generated migration for adding document_url field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0009_add_multiple_companies'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='document_url',
            field=models.URLField(blank=True, help_text='URL to an external document or image', max_length=500, null=True),
        ),
    ]