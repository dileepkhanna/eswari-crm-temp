# 🚀 ESWARI CRM - AWS Lightsail Deployment Commands

## 🔧 URGENT: Database Fix Required

The server is showing 500 errors because database tables don't exist after clearing data. Follow the fix below:

### Database Reset Commands (Current Issue Fix)

#### 1. Connect to Server
```bash
ssh -i ~/.ssh/LightsailDefaultKey-ap-south-1.pem ec2-user@15.206.229.201
```

#### 2. Fix Database Tables
```bash
# Navigate to backend
cd /var/www/project/eswari-crm-temp/backend

# Activate virtual environment
source venv/bin/activate

# Run migrations to recreate tables
python manage.py migrate

# Clear all data (if needed)
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
print('All data cleared successfully')
"

# Verify database state
python manage.py shell -c "
from accounts.models import User
print('Total users:', User.objects.count())
print('Admin users:', User.objects.filter(role='admin').count())
"

# Restart Django backend
pm2 restart eswari-backend

# Check status
pm2 status
```

#### 3. Test Application
```bash
# Test API endpoint
curl http://localhost:8000/api/auth/setup/check/
# Should return: {"admin_exists": false, "needs_setup": true}
```

## ✅ Status: Ready for Deployment

Your application is working perfectly locally and ready for AWS Lightsail deployment.

## 📋 Deployment Commands

### Step 1: Upload Files to AWS Lightsail
```bash
# Replace YOUR_LIGHTSAIL_IP with your actual IP (e.g., 15.206.229.201)
scp -r eswari-crm-temp ubuntu@YOUR_LIGHTSAIL_IP:/home/ubuntu/
```

### Step 2: SSH into Your Instance
```bash
ssh ubuntu@YOUR_LIGHTSAIL_IP
```

### Step 3: Deploy (One Command Does Everything!)
```bash
# Move files to web directory
sudo mv /home/ubuntu/eswari-crm-temp /var/www/eswari-crm

# Navigate to application directory
cd /var/www/eswari-crm

# Make scripts executable (this is where chmod is needed - on Linux, not Windows)
chmod +x quick-deploy.sh configure-ip.sh update-ip.sh

# Run the deployment script
./quick-deploy.sh
```

## 🎯 What the Deployment Script Does

1. **System Setup**: Updates packages, installs Python, Node.js, Nginx, MySQL
2. **Database Setup**: Creates MySQL database and user
3. **IP Detection**: Automatically detects your server IP
4. **Environment Configuration**: Creates `.env` files with correct IP settings
5. **Backend Setup**: Installs Python dependencies, runs migrations
6. **Frontend Build**: Builds production frontend with correct API URL
7. **Service Configuration**: Sets up Nginx, PM2 for process management
8. **Auto-Start**: Configures services to start automatically

## 🌐 After Deployment

Your application will be available at:
- **Frontend**: `http://YOUR_LIGHTSAIL_IP`
- **Admin Panel**: `http://YOUR_LIGHTSAIL_IP/admin`
- **API**: `http://YOUR_LIGHTSAIL_IP/api`

**Default Login**: `admin` / `admin123`

## 🔧 If You Need to Update IP Later

If your Lightsail IP changes, run this on your server:
```bash
cd /var/www/eswari-crm
./configure-ip.sh
```

## 🆘 Troubleshooting Commands

```bash
# Check service status
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# View logs
pm2 logs eswari-backend
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart eswari-backend
sudo systemctl restart nginx
```

## 📝 Notes

- **Windows Users**: Don't worry about the `chmod` error on Windows - it's only needed on Linux
- **Deployment Time**: Approximately 10-15 minutes
- **No Manual Configuration**: Everything is automated
- **CORS Issues**: Resolved automatically by IP detection

---

## 🎉 You're Ready to Deploy!

Your ESWARI CRM application is fully configured and tested. The deployment process is completely automated and will handle all CORS and configuration issues automatically.

**Next Step**: Upload to your AWS Lightsail instance and run the deployment script!