# Generated migration for announcement document fields

from django.db import migrations, models
import announcements.models


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='document',
            field=models.FileField(blank=True, help_text='Optional document attachment (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)', null=True, upload_to=announcements.models.announcement_document_path),
        ),
        migrations.AddField(
            model_name='announcement',
            name='document_name',
            field=models.CharField(blank=True, help_text='Original filename of the uploaded document', max_length=255, null=True),
        ),
    ]