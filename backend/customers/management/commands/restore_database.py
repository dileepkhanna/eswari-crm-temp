from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import gzip
import json

class Command(BaseCommand):
    help = 'Restore database from Django backup'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Path to the backup file to restore'
        )
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Flush database before restoring (WARNING: This will delete all data)'
        )

    def handle(self, *args, **options):
        backup_file = options['backup_file']
        flush_db = options['flush']
        
        if not os.path.exists(backup_file):
            self.stdout.write(
                self.style.ERROR(f'Backup file not found: {backup_file}')
            )
            return
        
        try:
            # Confirm flush operation
            if flush_db:
                confirm = input(
                    'WARNING: This will delete all existing data. '
                    'Are you sure you want to continue? (yes/no): '
                )
                if confirm.lower() != 'yes':
                    self.stdout.write('Operation cancelled.')
                    return
                
                self.stdout.write('Flushing database...')
                call_command('flush', '--noinput')
            
            self.stdout.write(f'Restoring from backup: {backup_file}')
            
            # Handle compressed files
            if backup_file.endswith('.gz'):
                self.stdout.write('Decompressing backup file...')
                with gzip.open(backup_file, 'rt') as f:
                    data = f.read()
                
                # Create temporary uncompressed file
                temp_file = backup_file.replace('.gz', '.temp')
                with open(temp_file, 'w') as f:
                    f.write(data)
                
                # Load data
                call_command('loaddata', temp_file)
                
                # Clean up temp file
                os.remove(temp_file)
            else:
                # Load data directly
                call_command('loaddata', backup_file)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Database restored successfully from: {backup_file}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Restore failed: {str(e)}')
            )