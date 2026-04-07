from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0004_capitalcustomer_interest'),
    ]

    operations = [
        migrations.RemoveField(model_name='capitaltask', name='lead'),
        migrations.AddField(
            model_name='capitaltask',
            name='loan',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tasks', to='capital.capitalloan',
            ),
        ),
        migrations.AddField(
            model_name='capitaltask',
            name='service',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tasks', to='capital.capitalservice',
            ),
        ),
        migrations.AlterField(
            model_name='capitaltask',
            name='status',
            field=models.CharField(
                max_length=30,
                choices=[
                    ('in_progress', 'In Progress'),
                    ('follow_up', 'Follow Up'),
                    ('document_collection', 'Document Collection'),
                    ('processing', 'Processing'),
                    ('completed', 'Completed'),
                    ('rejected', 'Rejected'),
                ],
                default='in_progress',
            ),
        ),
    ]
