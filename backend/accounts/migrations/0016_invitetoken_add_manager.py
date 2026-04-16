import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_add_invite_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitetoken',
            name='manager',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='invite_manager',
                limit_choices_to={'role': 'manager'},
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
