from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Report name/title', max_length=200)),
                ('frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly (Monday)'), ('monthly', 'Monthly (1st)')], default='weekly', max_length=10)),
                ('report_type', models.CharField(choices=[('overview', 'Cross-Company Overview'), ('funnel', 'Conversion Funnel'), ('scorecards', 'Employee Scorecards'), ('revenue', 'Revenue Summary'), ('capital', 'Capital Services Report')], default='overview', max_length=20)),
                ('recipients', models.JSONField(default=list, help_text='List of email addresses to send the report to')),
                ('is_active', models.BooleanField(default=True)),
                ('last_sent_at', models.DateTimeField(blank=True, null=True)),
                ('next_send_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_report_schedules', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
