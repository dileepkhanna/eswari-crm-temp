# Generated migration for user approval workflow

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_add_designation_to_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='pending_approval',
            field=models.BooleanField(
                default=False,
                help_text='Whether this user is pending admin approval'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_users',
                to=settings.AUTH_USER_MODEL,
                help_text='Admin who approved this user'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When this user was approved'
            ),
        ),
    ]
