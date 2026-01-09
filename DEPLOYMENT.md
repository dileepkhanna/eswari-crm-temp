# 🚀 AWS Lightsail Deployment Guide

## Prerequisites

- AWS Lightsail instance with Amazon Linux 2023
- MySQL database (AWS Lightsail or RDS)
- Domain name (optional)

## Quick Deployment

### Option 1: Automated Script (Recommended)

1. **Upload the deployment script to your Lightsail instance:**
```bash
scp deploy-lightsail.sh ec2-user@YOUR_LIGHTSAIL_IP:~/
```

2. **SSH into your Lightsail instance:**
```bash
ssh ec2-user@YOUR_LIGHTSAIL_IP
```

3. **Run the deployment script:**
```bash
chmod +x deploy-lightsail.sh
sudo ./deploy-lightsail.sh
```

4. **Follow the prompts and provide your Git repository URL**

### Option 2: Manual Deployment

#### Step 1: System Setup

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y nodejs npm python3 python3-pip python3-devel mysql mysql-devel nginx git
sudo dnf groupinstall -y "Development Tools"
```

#### Step 2: Create Project Structure

```bash
# Create directories
sudo mkdir -p /var/www/eswari-crm
sudo mkdir -p /var/log/eswari-crm
sudo mkdir -p /var/run/eswari-crm

# Create www-data user
sudo useradd -r -s /bin/false www-data

# Set permissions
sudo chown -R www-data:www-data /var/www/eswari-crm
sudo chown -R www-data:www-data /var/log/eswari-crm
sudo chown -R www-data:www-data /var/run/eswari-crm
```

#### Step 3: Deploy Code

```bash
# Clone your repository
cd /tmp
git clone YOUR_GIT_REPOSITORY_URL eswari-crm-temp
sudo cp -r eswari-crm-temp/* /var/www/eswari-crm/
rm -rf eswari-crm-temp
```

#### Step 4: Setup Backend

```bash
# Setup Python environment
cd /var/www/eswari-crm/backend
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install -r requirements-prod.txt

# Setup environment variables
sudo cp .env.example .env
sudo nano .env  # Edit with your actual values

# Setup Django
sudo -u www-data venv/bin/python manage.py collectstatic --noinput --settings=eswari_crm.settings_production
sudo -u www-data venv/bin/python manage.py migrate --settings=eswari_crm.settings_production
```

#### Step 5: Setup Frontend

```bash
cd /var/www/eswari-crm/frontend
sudo -u www-data npm install
sudo -u www-data npm run build
```

#### Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/conf.d/eswari-crm.conf
```

Copy the Nginx configuration from the deployment script.

#### Step 7: Setup Systemd Service

```bash
sudo nano /etc/systemd/system/eswari-crm-backend.service
```

Copy the systemd service configuration from the deployment script.

#### Step 8: Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable eswari-crm-backend
sudo systemctl start eswari-crm-backend
sudo systemctl enable nginx
sudo systemctl restart nginx
```

## Environment Variables

### Backend (.env)

```env
DEBUG=False
SECRET_KEY=your-very-secure-secret-key-here
DB_NAME=eswari_crm
DB_USER=dbmasteruser
DB_PASSWORD=Eswari9966
DB_HOST=ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com
DB_PORT=3306
ALLOWED_HOSTS=your-domain.com,your-lightsail-ip
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://your-lightsail-ip
STATIC_ROOT=/var/www/eswari-crm/static/
MEDIA_ROOT=/var/www/eswari-crm/media/
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://your-lightsail-ip
VITE_APP_NAME=ESWARI CONNECTS
```

## Post-Deployment

### Create Django Superuser

```bash
cd /var/www/eswari-crm/backend
sudo -u www-data venv/bin/python manage.py createsuperuser --settings=eswari_crm.settings_production
```

### SSL Certificate (Optional)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
sudo journalctl -u eswari-crm-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Django logs
sudo tail -f /var/log/eswari-crm/django.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart eswari-crm-backend

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status eswari-crm-backend
sudo systemctl status nginx
```

### Update Deployment

```bash
# Pull latest changes
cd /var/www/eswari-crm
sudo git pull origin main

# Update backend
cd backend
sudo -u www-data venv/bin/pip install -r requirements-prod.txt
sudo -u www-data venv/bin/python manage.py migrate --settings=eswari_crm.settings_production
sudo -u www-data venv/bin/python manage.py collectstatic --noinput --settings=eswari_crm.settings_production

# Update frontend
cd ../frontend
sudo -u www-data npm install
sudo -u www-data npm run build

# Restart services
sudo systemctl restart eswari-crm-backend
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure all files are owned by www-data
2. **Database Connection**: Check .env file and database credentials
3. **Static Files Not Loading**: Run collectstatic command
4. **502 Bad Gateway**: Check if backend service is running

### Health Checks

```bash
# Check if backend is responding
curl http://localhost:8000/api/health/

# Check if frontend is built
ls -la /var/www/eswari-crm/frontend/dist/

# Check service status
sudo systemctl status eswari-crm-backend nginx
```

## Security Considerations

1. **Firewall**: Only open necessary ports (80, 443, 22)
2. **SSL**: Use HTTPS in production
3. **Database**: Use strong passwords and restrict access
4. **Updates**: Keep system and packages updated
5. **Backups**: Regular database and file backups

## Access Points

- **Frontend**: http://your-lightsail-ip/
- **Backend API**: http://your-lightsail-ip/api/
- **Django Admin**: http://your-lightsail-ip/admin/