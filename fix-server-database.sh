#!/bin/bash

# One-command database fix for Lightsail server
echo "🔧 Fixing database on Lightsail server..."

# SSH into server and run the fix commands
ssh -i ~/.ssh/LightsailDefaultKey-ap-south-1.pem ec2-user@15.206.229.201 << 'EOF'
cd /var/www/project/eswari-crm-temp/backend
source venv/bin/activate
echo "📋 Running migrations..."
python manage.py migrate
echo "🧹 Clearing all data..."
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
echo "🔍 Verifying database..."
python manage.py shell -c "
from accounts.models import User
print('Total users:', User.objects.count())
print('Admin users:', User.objects.filter(role='admin').count())
"
echo "🔄 Restarting backend..."
pm2 restart eswari-backend
echo "✅ Database fix completed!"
echo "🌐 Test at: http://15.206.229.201"
EOF