"""
Performance optimization migration: Add composite indexes for frequently queried fields.

These indexes support the ASE Marketing Panel's common query patterns:
  - Lead queue filtering by company + status
  - BRE views filtering by company + researched_by
  - BOE views filtering by company + contacted_by
  - CRE views filtering by company + managed_by
  - Dashboard/analytics sorting by status + priority
  - Timeline queries by company + created_at
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('ase_leads', '0013_aseleadtask'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "CREATE INDEX IF NOT EXISTS idx_aselead_company_status ON ase_leads_aselead (company_id, status);",
                "CREATE INDEX IF NOT EXISTS idx_aselead_company_researched_by ON ase_leads_aselead (company_id, researched_by_id);",
                "CREATE INDEX IF NOT EXISTS idx_aselead_company_contacted_by ON ase_leads_aselead (company_id, contacted_by_id);",
                "CREATE INDEX IF NOT EXISTS idx_aselead_company_managed_by ON ase_leads_aselead (company_id, managed_by_id);",
                "CREATE INDEX IF NOT EXISTS idx_aselead_status_priority ON ase_leads_aselead (status, priority);",
                "CREATE INDEX IF NOT EXISTS idx_aselead_company_created_at ON ase_leads_aselead (company_id, created_at);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_aselead_company_status;",
                "DROP INDEX IF EXISTS idx_aselead_company_researched_by;",
                "DROP INDEX IF EXISTS idx_aselead_company_contacted_by;",
                "DROP INDEX IF EXISTS idx_aselead_company_managed_by;",
                "DROP INDEX IF EXISTS idx_aselead_status_priority;",
                "DROP INDEX IF EXISTS idx_aselead_company_created_at;",
            ],
        ),
    ]
