#!/bin/bash

# ESWARI CRM Deployment Script for AWS Lightsail
# This script sets up the application on a fresh Ubuntu instance

set -e

echo "🚀 Starting ESWARI CRM deployment on AWS Lightsail..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx mysql-server git curl

# Install PM2 for process management
echo "📱 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/eswari-crm
sudo chown -R $USER:$USER /var/www/eswari-crm
cd /var/www/eswari-crm

# Clone or copy application files (assuming files are already uploaded)
echo "📋 Application files should be in /var/www/eswari-crm/"

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd /var/www/eswari-crm/backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt
pip install gunicorn mysqlclient

# Setup MySQL database
echo "🗄️ Setting up MySQL database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS eswari_crm;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'eswari_user'@'localhost' IDENTIFIED BY 'eswari_password_2024';"
sudo mysql -e "GRANT ALL PRIVILEGES ON eswari_crm.* TO 'eswari_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Setup environment variables
echo "⚙️ Setting up environment variables..."
cat > .env << EOF
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production
DATABASE_NAME=eswari_crm
DATABASE_USER=eswari_user
DATABASE_PASSWORD=eswari_password_2024
DATABASE_HOST=localhost
DATABASE_PORT=3306
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,https://your-domain.com
EOF

# Run Django migrations
echo "🔄 Running Django migrations..."
python manage.py collectstatic --noinput
python manage.py migrate

# Create superuser (optional - can be done manually)
echo "👤 Creating superuser (you'll be prompted)..."
python manage.py createsuperuser --noinput --username admin --email admin@eswari.com || true

# Build frontend
echo "🎨 Building frontend..."
cd /var/www/eswari-crm/frontend
npm install
npm run build

# Setup Nginx configuration
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/eswari-crm << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend (React build)
    location / {
        root /var/www/eswari-crm/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Django static files
    location /static/ {
        alias /var/www/eswari-crm/backend/staticfiles/;
    }
    
    # Django media files
    location /media/ {
        alias /var/www/eswari-crm/backend/media/;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/eswari-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup PM2 for Django
echo "🔄 Setting up PM2 for Django..."
cd /var/www/eswari-crm/backend
pm2 start gunicorn --name "eswari-backend" -- --bind 127.0.0.1:8000 eswari_crm.wsgi:application
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Your application should be accessible at your Lightsail instance IP"
echo "📝 Don't forget to:"
echo "   1. Update your domain name in Nginx config"
echo "   2. Set up SSL certificate (Let's Encrypt recommended)"
echo "   3. Update CORS_ALLOWED_ORIGINS in .env"
echo "   4. Change SECRET_KEY in .env"
echo "   5. Set up database backups"