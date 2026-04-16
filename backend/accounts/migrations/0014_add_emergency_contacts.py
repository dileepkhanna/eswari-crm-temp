from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_add_personal_banking_fields'),
    ]

    operations = [
        migrations.AddField(model_name='user', name='emergency_contact1_name',
            field=models.CharField(max_length=100, blank=True, null=True)),
        migrations.AddField(model_name='user', name='emergency_contact1_phone',
            field=models.CharField(max_length=15, blank=True, null=True)),
        migrations.AddField(model_name='user', name='emergency_contact1_relation',
            field=models.CharField(max_length=50, blank=True, null=True)),
        migrations.AddField(model_name='user', name='emergency_contact2_name',
            field=models.CharField(max_length=100, blank=True, null=True)),
        migrations.AddField(model_name='user', name='emergency_contact2_phone',
            field=models.CharField(max_length=15, blank=True, null=True)),
        migrations.AddField(model_name='user', name='emergency_contact2_relation',
            field=models.CharField(max_length=50, blank=True, null=True)),
    ]
