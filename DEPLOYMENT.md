# ESWARI CRM Production Deployment Guide

## 🌐 Production URLs
- **Frontend**: http://13.205.34.169:8080
- **Backend API**: http://13.205.34.169:8001

## 🗄️ Database Configuration
- **Type**: MySQL (AWS Lightsail RDS)
- **Host**: ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com
- **Database**: eswari_crm
- **User**: dbmasteruser
- **Port**: 3306

## 📋 Configuration Summary

### Backend Configuration (`.env`)
```
DEBUG=False
SECRET_KEY=eswari-crm-production-secret-key-2024-very-long-and-secure-change-this
USE_SQLITE=False
DATABASE_NAME=eswari_crm
DATABASE_USER=dbmasteruser
DATABASE_PASSWORD=Eswari9966
DATABASE_HOST=ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com
DATABASE_PORT=3306
ALLOWED_HOSTS=*,13.205.34.169,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://13.205.34.169:8080,http://13.205.34.169,http://localhost:8080,http://127.0.0.1:8080
```

### Frontend Configuration (`.env`)
```
VITE_API_BASE_URL=http://13.205.34.169:8001/api
VITE_APP_NAME=ESWARI CONNECTS
```

## 🚀 Deployment Process

### Step 1: Local Preparation
Run from your local machine:
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

### Step 2: Server Deployment
SSH into your AWS Lightsail instance and run:
```bash
ssh -i your-key.pem ubuntu@13.205.34.169
./server-deploy.sh
```

### Step 3: Status Check
Check if everything is working:
```bash
./check-status.sh
```

## 🔧 Manual Deployment Steps

If you prefer manual deployment:

### Backend
```bash
cd backend
git pull origin main
pip install -r requirements.txt
# Install MySQL client
sudo apt-get install -y python3-dev default-libmysqlclient-dev build-essential pkg-config
pip install mysqlclient
# Test database connection
python manage.py check --database default
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn
```

### Frontend
```bash
cd frontend
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

## 🗄️ Database Management

### Connect to Database
```bash
cd backend
python manage.py dbshell
```

### Run Migrations
```bash
python manage.py migrate
```

### Create Superuser
```bash
python manage.py createsuperuser
```

### Backup Database
```bash
python manage.py dumpdata > backup.json
```

### Restore Database
```bash
python manage.py loaddata backup.json
```

## 🔍 Troubleshooting

### Check Service Status
```bash
sudo systemctl status gunicorn
sudo systemctl status nginx
```

### View Logs
```bash
# Backend logs
sudo journalctl -u gunicorn -f

# Frontend logs
sudo journalctl -u nginx -f

# System logs
sudo tail -f /var/log/syslog
```

### Database Connection Issues
```bash
# Test database connection
python manage.py check --database default

# Check MySQL client installation
pip show mysqlclient

# Install MySQL client if missing
sudo apt-get install -y python3-dev default-libmysqlclient-dev build-essential pkg-config
pip install mysqlclient
```

### Restart Services
```bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

## 📁 Important Paths
- Project Directory: `/home/ubuntu/eswari-crm-temp`
- Static Files: `/var/www/html/`
- Nginx Config: `/etc/nginx/sites-available/default`
- Gunicorn Service: `/etc/systemd/system/gunicorn.service`

## 🔐 Security Notes
- Database is using MySQL on AWS Lightsail RDS
- DEBUG is set to False in production
- CORS is configured for the production domain
- Static files are served by Nginx
- Database credentials are stored in environment variables

## 📞 Support
If you encounter issues:
1. Check the logs using the commands above
2. Verify the service status
3. Test database connectivity with `python manage.py check --database default`
4. Ensure the `.env` files have the correct configuration
5. Make sure the AWS Lightsail security groups allow traffic on ports 8001 and 8080
6. Verify MySQL client is installed: `pip show mysqlclient`