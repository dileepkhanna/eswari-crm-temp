# 🚀 ESWARI CRM - AWS Lightsail Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. AWS Lightsail Instance Setup
- [ ] Create Lightsail instance (Ubuntu 20.04/22.04 LTS)
- [ ] Choose appropriate plan (minimum $10/month - 2GB RAM)
- [ ] Configure networking (open ports 80, 443, 22)
- [ ] Assign static IP address
- [ ] Configure DNS (if using custom domain)

### 2. Local Preparation
- [ ] Update frontend/.env.production with your domain
- [ ] Update backend/.env.production with secure credentials
- [ ] Test application locally
- [ ] Create deployment package

## 🔧 Deployment Steps

### Step 1: Upload Files
```bash
# From your local machine
scp -r eswari-crm-temp ubuntu@YOUR_LIGHTSAIL_IP:/home/ubuntu/
```

### Step 2: Connect and Deploy
```bash
# SSH into your instance
ssh ubuntu@YOUR_LIGHTSAIL_IP

# Move files and deploy
sudo mv /home/ubuntu/eswari-crm-temp /var/www/eswari-crm
cd /var/www/eswari-crm
chmod +x quick-deploy.sh configure-ip.sh
./quick-deploy.sh
```

### Step 3: Post-Deployment Configuration (Optional)
The deployment script automatically configures the correct IP address. If you need to change it later:

```bash
# Update IP configuration manually
cd /var/www/eswari-crm
./configure-ip.sh

# Or update manually
nano /var/www/eswari-crm/backend/.env
nano /var/www/eswari-crm/frontend/.env.production

# Rebuild and restart
cd /var/www/eswari-crm/frontend
npm run build
pm2 restart eswari-backend
sudo systemctl restart nginx
```

## 🔒 Security Configuration

### SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Firewall Setup
```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Database Security
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create backup user
sudo mysql -e "CREATE USER 'backup'@'localhost' IDENTIFIED BY 'backup_password';"
sudo mysql -e "GRANT SELECT, LOCK TABLES ON eswari_crm.* TO 'backup'@'localhost';"
```

## 📊 Monitoring & Maintenance

### Log Monitoring
```bash
# View application logs
pm2 logs eswari-backend

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# View Django logs
tail -f /var/log/eswari-crm/django.log
```

### Database Backup
```bash
# Create backup script
sudo tee /usr/local/bin/backup-eswari.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u backup -pbackup_password eswari_crm > /var/backups/eswari_crm_$DATE.sql
find /var/backups -name "eswari_crm_*.sql" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-eswari.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-eswari.sh" | sudo crontab -
```

### Performance Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop

# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor database
sudo mysql -e "SHOW PROCESSLIST;"
```

## 🔄 Update Deployment

### Code Updates
```bash
cd /var/www/eswari-crm

# Update backend
cd backend
source venv/bin/activate
git pull origin main  # if using Git
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

## 🆘 Troubleshooting

### Common Issues

**CORS issues:**
```bash
# Check current IP configuration
cd /var/www/eswari-crm
grep CORS backend/.env
grep VITE_API frontend/.env.production

# Fix CORS for your IP
./configure-ip.sh

# Or manually update
nano backend/.env
# Add your IP to: CORS_ALLOWED_ORIGINS=http://YOUR_IP,http://localhost,http://127.0.0.1

nano frontend/.env.production  
# Set: VITE_API_BASE_URL=http://YOUR_IP/api

# Rebuild and restart
cd frontend && npm run build
pm2 restart eswari-backend
```

**Application not loading:**
```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
pm2 logs eswari-backend
sudo tail -f /var/log/nginx/error.log
```

**Database connection issues:**
```bash
# Test database connection
mysql -u eswari_user -p eswari_crm

# Check MySQL status
sudo systemctl status mysql
```

**Static files not loading:**
```bash
# Recollect static files
cd /var/www/eswari-crm/backend
source venv/bin/activate
python manage.py collectstatic --noinput

# Check permissions
sudo chown -R www-data:www-data /var/www/eswari-crm/backend/staticfiles/
```

## 📞 Support Commands

### Service Management
```bash
# Restart all services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mysql

# Check service status
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# View system resources
free -h
df -h
top
```

### Application Management
```bash
# Django management commands
cd /var/www/eswari-crm/backend
source venv/bin/activate

# Create superuser
python manage.py createsuperuser

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic

# Django shell
python manage.py shell
```

## 🎯 Success Criteria

- [ ] Frontend loads at http://YOUR_IP or https://yourdomain.com
- [ ] Admin panel accessible at /admin
- [ ] API endpoints responding at /api/
- [ ] Database connections working
- [ ] Static files serving correctly
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Backups configured
- [ ] Monitoring in place
- [ ] Logs accessible and rotating

## 📋 Final Notes

- **Default Admin**: username: `admin`, password: `admin123`
- **Database**: `eswari_crm` with user `eswari_user`
- **Application Path**: `/var/www/eswari-crm`
- **Logs**: `/var/log/eswari-crm/`
- **Backups**: `/var/backups/`

Remember to:
1. Change default passwords
2. Update SECRET_KEY in production
3. Configure proper domain names
4. Set up SSL certificates
5. Configure regular backups
6. Monitor application performance