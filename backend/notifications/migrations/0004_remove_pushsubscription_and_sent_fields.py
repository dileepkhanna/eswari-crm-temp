from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_make_company_nullable'),
    ]

    operations = [
        # Remove is_sent and sent_at from Notification
        migrations.RemoveField(
            model_name='notification',
            name='is_sent',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='sent_at',
        ),
        # Drop PushSubscription table entirely
        migrations.DeleteModel(
            name='PushSubscription',
        ),
    ]
