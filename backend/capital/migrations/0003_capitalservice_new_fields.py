from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('capital', '0002_capitalservice_capitalloan'),
    ]

    operations = [
        # Rename old service_type choices by altering the field
        migrations.AlterField(
            model_name='capitalservice',
            name='service_type',
            field=models.CharField(
                max_length=30,
                choices=[
                    ('gst_registration', 'GST Registration (New)'),
                    ('gst_filing_monthly', 'GST Return Filing (Monthly)'),
                    ('gst_filing_quarterly', 'GST Return Filing (Quarterly)'),
                    ('gst_amendment', 'GST Amendment / Update'),
                    ('gst_cancellation', 'GST Cancellation'),
                    ('lut_filing', 'LUT Filing (Exports)'),
                    ('eway_bill', 'E-Way Bill Generation'),
                    ('gst_consultation', 'GST Consultation / Advisory'),
                    ('msme_registration', 'MSME / Udyam Registration'),
                    ('msme_certificate', 'MSME Certificate Download'),
                    ('msme_amendment', 'MSME Amendment'),
                    ('itr_filing', 'Income Tax Filing'),
                    ('itr_notice', 'Income Tax Notice'),
                    ('company_registration', 'Company Registration'),
                    ('trademark', 'Trademark Registration'),
                    ('other', 'Other'),
                ],
            ),
        ),
        migrations.RemoveField(model_name='capitalservice', name='pan_number'),
        migrations.RemoveField(model_name='capitalservice', name='aadhaar_number'),
        migrations.AddField(
            model_name='capitalservice',
            name='city_state',
            field=models.CharField(max_length=255, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='business_type',
            field=models.CharField(
                max_length=20, blank=True,
                choices=[('proprietor', 'Proprietor'), ('partnership', 'Partnership'), ('company', 'Company')],
            ),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='turnover_range',
            field=models.CharField(
                max_length=20, blank=True,
                choices=[('below_20l', 'Below ₹20 Lakhs'), ('20l_1cr', '₹20L – ₹1 Cr'), ('above_1cr', 'Above ₹1 Cr')],
            ),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='existing_gst_number',
            field=models.BooleanField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='existing_msme_number',
            field=models.BooleanField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='udyam_number',
            field=models.CharField(max_length=20, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='date_of_birth',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='income_nature',
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='income_slab',
            field=models.CharField(
                max_length=20, blank=True,
                choices=[
                    ('0_5l', '0 to ₹5 Lakh'), ('5l_10l', '₹5 Lakh to ₹10 Lakh'),
                    ('10l_18l', '₹10 Lakh to ₹18 Lakh'), ('above_18l', '₹18 Lakh and above'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='pan_number',
            field=models.CharField(max_length=10, blank=True),
        ),
        migrations.AddField(
            model_name='capitalservice',
            name='aadhaar_number',
            field=models.CharField(max_length=12, blank=True),
        ),
    ]
