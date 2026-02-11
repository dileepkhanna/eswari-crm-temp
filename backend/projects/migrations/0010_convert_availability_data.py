# Data migration to convert availability from JSON string to plain text

from django.db import migrations


def convert_availability_data(apps, schema_editor):
    """Convert availability from JSON format to plain text"""
    Project = apps.get_model('projects', 'Project')
    
    for project in Project.objects.all():
        # If availability is '{}' or empty dict string, set to empty string
        if project.availability in ['{}', '[]', 'null', 'None']:
            project.availability = ''
            project.save(update_fields=['availability'])


def reverse_conversion(apps, schema_editor):
    """Reverse migration - convert back to empty dict"""
    Project = apps.get_model('projects', 'Project')
    
    for project in Project.objects.all():
        if not project.availability or project.availability.strip() == '':
            project.availability = '{}'
            project.save(update_fields=['availability'])


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0009_alter_availability_to_textfield'),
    ]

    operations = [
        migrations.RunPython(convert_availability_data, reverse_conversion),
    ]
