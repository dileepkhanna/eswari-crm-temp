# AWS Lightsail Deployment Guide

## Changes Made for Production

### 1. Backend Configuration
- ✅ Changed admin path from `/admin/` to `/django-admin/` for security
- ✅ Updated `.env` file with AWS RDS MySQL database credentials
- ✅ Set `DEBUG=False` for production
- ✅ Added proper `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- ✅ Generated secure `SECRET_KEY`

### 2. Frontend Configuration
- ✅ Updated activity logger to use relative paths (`/api/activity-logs/`)
- ✅ API client already uses environment variables for base URL

## Deployment Steps on AWS Lightsail

### 1. Update Code on Server
```bash
# Navigate to project directory
cd /var/www/eswari-crm

# Pull latest changes from GitHub
git pull origin main

# Copy updated files from eswari-crm-temp to eswari-crm
cp -r eswari-crm-temp/* .
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd /var/www/eswari-crm/backend

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser (if needed)
python manage.py createsuperuser

# Test Django configuration
python manage.py check
```

### 3. Start Django with Gunicorn
```bash
# Start Gunicorn on port 8000
gunicorn --bind 0.0.0.0:8000 --workers 3 eswari_crm.wsgi:application

# Or run in background with nohup
nohup gunicorn --bind 0.0.0.0:8000 --workers 3 eswari_crm.wsgi:application &
```

### 4. Frontend Setup
```bash
# Navigate to frontend directory
cd /var/www/eswari-crm/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 5. Nginx Configuration
Create `/etc/nginx/conf.d/port-based.conf`:

```nginx
# Project 1 (Eswari CRM) - Port 80
server {
    listen 80;
    server_name 13.205.34.169;
    
    # Frontend (React build)
    location / {
        root /var/www/eswari-crm/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Django Admin
    location /django-admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /var/www/eswari-crm/backend/static/;
    }
    
    # Media files
    location /media/ {
        alias /var/www/eswari-crm/backend/media/;
    }
}

# Project 2 - Port 8080 (Configure based on second project requirements)
server {
    listen 8080;
    server_name 13.205.34.169;
    
    # Add configuration for second project here
    location / {
        # Configure based on second project type
        return 404;
    }
}
```

### 6. Start/Restart Services
```bash
# Test Nginx configuration
sudo nginx -t

# Start/restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check service status
sudo systemctl status nginx
```

### 7. Firewall Configuration
```bash
# Open required ports in Lightsail console:
# - Port 80 (HTTP)
# - Port 8080 (Second project)
# - Port 22 (SSH)
```

## Testing

### 1. Test Django Backend
```bash
# Test Django directly
curl http://13.205.34.169:8000/api/health/

# Test through Nginx
curl http://13.205.34.169/api/health/
```

### 2. Test Frontend
- Visit: `http://13.205.34.169/`
- Admin panel: `http://13.205.34.169/django-admin/`

### 3. Test Database Connection
```bash
cd /var/www/eswari-crm/backend
python manage.py shell

# In Django shell:
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT 1")
print("Database connection successful!")
```

## Database Credentials Used
- **Host**: `ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com`
- **Database**: `eswari_crm`
- **User**: `dbmasteruser`
- **Password**: `Eswari9966`
- **Port**: `3306`

## Security Notes
- Admin path changed to `/django-admin/` instead of `/admin/`
- `DEBUG=False` in production
- Secure `SECRET_KEY` generated
- CORS properly configured for production domain

## Troubleshooting
- Check Django logs: `tail -f /var/www/eswari-crm/backend/django.log`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check Gunicorn process: `ps aux | grep gunicorn`
- Test database connection: Use Django shell as shown above