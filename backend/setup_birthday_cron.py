#!/usr/bin/env python
"""
Script to set up automatic birthday announcement creation.
This script creates a cron job that runs daily to create birthday announcements.
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

def create_cron_script():
    """Create a shell script for the cron job"""
    
    script_content = f"""#!/bin/bash
# Birthday Announcement Cron Job
# This script runs daily to create birthday announcements

# Change to the project directory
cd {BASE_DIR}

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Run the birthday announcement command
python manage.py create_birthday_announcements

# Log the execution
echo "$(date): Birthday announcement cron job executed" >> birthday_cron.log
"""
    
    script_path = BASE_DIR / 'birthday_cron.sh'
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    
    return script_path

def print_cron_instructions(script_path):
    """Print instructions for setting up the cron job"""
    
    print("🎂 Birthday Announcement Cron Job Setup")
    print("=" * 50)
    print()
    print(f"1. A shell script has been created at: {script_path}")
    print()
    print("2. To set up the cron job, run the following command:")
    print("   crontab -e")
    print()
    print("3. Add the following line to run the job daily at 9:00 AM:")
    print(f"   0 9 * * * {script_path}")
    print()
    print("4. Alternative times you might want to use:")
    print("   0 8 * * *   # 8:00 AM daily")
    print("   0 9 * * *   # 9:00 AM daily (recommended)")
    print("   0 10 * * *  # 10:00 AM daily")
    print()
    print("5. To verify the cron job is set up, run:")
    print("   crontab -l")
    print()
    print("6. To test the script manually, run:")
    print(f"   {script_path}")
    print()
    print("7. Check the log file for execution history:")
    print(f"   tail -f {BASE_DIR}/birthday_cron.log")
    print()
    print("Note: Make sure your system's timezone is set correctly!")
    print()

def test_birthday_service():
    """Test the birthday service to make sure it works"""
    try:
        from birthdays.services import BirthdayAnnouncementService
        
        print("Testing birthday announcement service...")
        service = BirthdayAnnouncementService()
        
        # Get statistics
        stats = service.get_birthday_statistics()
        print(f"✅ Service working! Statistics: {stats}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing service: {e}")
        return False

def main():
    print("Setting up Birthday Announcement Automation...")
    print()
    
    # Test the service first
    if not test_birthday_service():
        print("❌ Service test failed. Please check your Django setup.")
        return
    
    # Create the cron script
    script_path = create_cron_script()
    print(f"✅ Created cron script: {script_path}")
    
    # Print setup instructions
    print_cron_instructions(script_path)
    
    print("🎉 Setup complete! Follow the instructions above to activate the cron job.")

if __name__ == '__main__':
    main()