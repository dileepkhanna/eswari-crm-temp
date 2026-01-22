#!/bin/bash

# Fix Database Script for Lightsail
# This script will recreate all database tables and clear all data

echo "🔧 Fixing database on Lightsail server..."

# Navigate to backend directory
cd /var/www/project/eswari-crm-temp/backend

# Activate virtual environment
source venv/bin/activate

echo "📋 Running migrations to recreate tables..."
python manage.py migrate

echo "🧹 Clearing all existing data..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
from leads.models import Lead
from tasks.models import Task
from projects.models import Project
from announcements.models import Announcement
from leaves.models import Leave
from activity_logs.models import ActivityLog
from holidays.models import Holiday

User = get_user_model()

# Clear all data
User.objects.all().delete()
Lead.objects.all().delete()
Task.objects.all().delete()
Project.objects.all().delete()
Announcement.objects.all().delete()
Leave.objects.all().delete()
ActivityLog.objects.all().delete()
Holiday.objects.all().delete()

print('✅ All data cleared successfully')
"

echo "🔍 Verifying database state..."
python manage.py shell -c "
from accounts.models import User
print(f'Total users: {User.objects.count()}')
print(f'Admin users: {User.objects.filter(role=\"admin\").count()}')
"

echo "🔄 Restarting Django backend..."
pm2 restart eswari-backend

echo "✅ Database fix completed!"
echo "🌐 Visit http://15.206.229.201 to test the application"
echo "📝 You should now see the admin setup page since no admin exists"