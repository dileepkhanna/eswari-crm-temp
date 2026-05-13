# Generated migration to revert marketing roles from User model
# Marketing categories are now team-level, not user-level

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_update_invite_token_marketing_roles'),
    ]

    operations = [
        # Revert User role field to original 5 roles
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('manager', 'Manager'),
                    ('team_lead', 'Team Lead'),
                    ('employee', 'Employee'),
                    ('hr', 'HR'),
                ],
                default='employee',
                max_length=20,
            ),
        ),
        # Revert InviteToken role field to original choices
        migrations.AlterField(
            model_name='invitetoken',
            name='role',
            field=models.CharField(
                choices=[
                    ('manager', 'Manager'),
                    ('employee', 'Employee'),
                ],
                default='employee',
                max_length=20,
            ),
        ),
    ]
