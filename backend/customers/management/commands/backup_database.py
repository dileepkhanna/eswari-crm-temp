from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.management import call_command
import os
import subprocess
import datetime
import gzip
import shutil

class Command(BaseCommand):
    help = 'Create a database backup using Django'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='/var/backups/eswari-crm',
            help='Directory to store backup files'
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Compress the backup file'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        compress = options['compress']
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'eswari_crm_django_backup_{timestamp}.json'
        filepath = os.path.join(output_dir, filename)
        
        try:
            self.stdout.write(f'Creating Django database backup...')
            
            # Create Django fixture backup
            with open(filepath, 'w') as f:
                call_command('dumpdata', 
                           '--natural-foreign', 
                           '--natural-primary',
                           '--indent=2',
                           stdout=f)
            
            self.stdout.write(f'Backup created: {filepath}')
            
            # Compress if requested
            if compress:
                compressed_filepath = f'{filepath}.gz'
                with open(filepath, 'rb') as f_in:
                    with gzip.open(compressed_filepath, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Remove uncompressed file
                os.remove(filepath)
                filepath = compressed_filepath
                self.stdout.write(f'Backup compressed: {filepath}')
            
            # Get file size
            file_size = os.path.getsize(filepath)
            size_mb = file_size / (1024 * 1024)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Database backup completed successfully!\n'
                    f'File: {filepath}\n'
                    f'Size: {size_mb:.2f} MB'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Backup failed: {str(e)}')
            )
            # Clean up partial file
            if os.path.exists(filepath):
                os.remove(filepath)