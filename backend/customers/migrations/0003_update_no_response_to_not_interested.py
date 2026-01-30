# Generated migration to update no_response to not_interested

from django.db import migrations, models

def update_no_response_to_not_interested(apps, schema_editor):
    """Update existing 'no_response' status to 'not_interested'"""
    Customer = apps.get_model('customers', 'Customer')
    Customer.objects.filter(call_status='no_response').update(call_status='not_interested')

def reverse_update_not_interested_to_no_response(apps, schema_editor):
    """Reverse migration: update 'not_interested' back to 'no_response'"""
    Customer = apps.get_model('customers', 'Customer')
    Customer.objects.filter(call_status='not_interested').update(call_status='no_response')

class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0002_add_unique_phone_constraint'),
    ]

    operations = [
        migrations.RunPython(
            update_no_response_to_not_interested,
            reverse_update_not_interested_to_no_response
        ),
        migrations.AlterField(
            model_name='customer',
            name='call_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('answered', 'Answered'),
                    ('not_answered', 'Not Answered'),
                    ('busy', 'Busy'),
                    ('not_interested', 'Not Interested'),
                    ('custom', 'Custom')
                ],
                default='pending',
                max_length=20
            ),
        ),
    ]