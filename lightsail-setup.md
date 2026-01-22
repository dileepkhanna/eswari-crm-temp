# ESWARI CRM - AWS Lightsail Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Create Lightsail Instance
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS
- **Plan**: At least $10/month (2 GB RAM, 1 vCPU, 60 GB SSD)
- **Region**: Choose closest to your users

### 2. Upload Application Files
```bash
# From your local machine, upload files to Lightsail
scp -r eswari-crm-temp ubuntu@YOUR_LIGHTSAIL_IP:/home/ubuntu/
```

### 3. Connect to Instance and Run Deployment
```bash
# SSH into your Lightsail instance
ssh ubuntu@YOUR_LIGHTSAIL_IP

# Move files to web directory
sudo mv /home/ubuntu/eswari-crm-temp /var/www/eswari-crm
cd /var/www/eswari-crm

# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### 4. Configure Domain (Optional)
```bash
# Update Nginx configuration with your domain
sudo nano /etc/nginx/sites-available/eswari-crm

# Replace 'your-domain.com' with your actual domain
# Then restart Nginx
sudo systemctl restart nginx
```

### 5. Setup SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🔧 Manual Configuration Steps

### Database Setup
```bash
# Connect to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE eswari_crm;
CREATE USER 'eswari_user'@'localhost' IDENTIFIED BY 'eswari_password_2024';
GRANT ALL PRIVILEGES ON eswari_crm.* TO 'eswari_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Environment Variables
Update `/var/www/eswari-crm/backend/.env`:
```env
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this
DATABASE_NAME=eswari_crm
DATABASE_USER=eswari_user
DATABASE_PASSWORD=eswari_password_2024
DATABASE_HOST=localhost
DATABASE_PORT=3306
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,YOUR_LIGHTSAIL_IP
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Frontend Environment
Update `/var/www/eswari-crm/frontend/.env.production`:
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_NAME=ESWARI CONNECTS
```

## 🔄 Process Management

### Check Application Status
```bash
# Check PM2 processes
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check application logs
pm2 logs eswari-backend
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart Django application
pm2 restart eswari-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart MySQL
sudo systemctl restart mysql
```

## 🛡️ Security Checklist

- [ ] Change default database passwords
- [ ] Update Django SECRET_KEY
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Set up SSL certificate
- [ ] Configure regular backups
- [ ] Update ALLOWED_HOSTS and CORS settings
- [ ] Set up monitoring and alerts

## 📊 Monitoring & Maintenance

### Database Backup
```bash
# Create backup script
sudo tee /usr/local/bin/backup-eswari.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u eswari_user -peswari_password_2024 eswari_crm > /var/backups/eswari_crm_$DATE.sql
find /var/backups -name "eswari_crm_*.sql" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-eswari.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/backup-eswari.sh" | sudo crontab -
```

### Log Rotation
```bash
# Configure log rotation
sudo tee /etc/logrotate.d/eswari-crm << 'EOF'
/var/log/eswari-crm/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload eswari-backend
    endscript
}
EOF
```

## 🌐 Access Your Application

After successful deployment:
- **Frontend**: http://YOUR_LIGHTSAIL_IP or https://your-domain.com
- **Admin Panel**: http://YOUR_LIGHTSAIL_IP/admin or https://your-domain.com/admin

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check Django logs: `tail -f /var/log/eswari-crm/error.log`
4. Verify database connection: `mysql -u eswari_user -p eswari_crm`

## 🔄 Updates & Deployment

To deploy updates:
```bash
cd /var/www/eswari-crm

# Pull latest changes (if using Git)
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Update frontend
cd ../frontend
npm install
npm run build

# Restart services
pm2 restart eswari-backend
sudo systemctl reload nginx
```