from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_add_user_approval_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='permanent_address',
            field=models.TextField(blank=True, null=True, help_text='Permanent address'),
        ),
        migrations.AddField(
            model_name='user',
            name='present_address',
            field=models.TextField(blank=True, null=True, help_text='Present/current address'),
        ),
        migrations.AddField(
            model_name='user',
            name='bank_name',
            field=models.CharField(max_length=100, blank=True, null=True, help_text='Bank name'),
        ),
        migrations.AddField(
            model_name='user',
            name='bank_account_number',
            field=models.CharField(max_length=30, blank=True, null=True, help_text='Bank account number'),
        ),
        migrations.AddField(
            model_name='user',
            name='bank_ifsc',
            field=models.CharField(max_length=20, blank=True, null=True, help_text='IFSC code'),
        ),
        migrations.AddField(
            model_name='user',
            name='blood_group',
            field=models.CharField(max_length=5, blank=True, null=True, help_text='Blood group'),
        ),
        migrations.AddField(
            model_name='user',
            name='aadhar_number',
            field=models.CharField(max_length=12, blank=True, null=True, help_text='12-digit Aadhar card number'),
        ),
    ]
