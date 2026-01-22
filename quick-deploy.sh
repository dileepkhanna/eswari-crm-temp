#!/bin/bash

# ESWARI CRM - Quick Deployment Script for AWS Lightsail
# Run this script on your Lightsail instance after uploading the files

set -e

echo "🚀 ESWARI CRM - Quick Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx mysql-server git curl

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Setup MySQL
print_status "Setting up MySQL..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS eswari_crm;" 2>/dev/null || true
sudo mysql -e "CREATE USER IF NOT EXISTS 'eswari_user'@'localhost' IDENTIFIED BY 'eswari_password_2024';" 2>/dev/null || true
sudo mysql -e "GRANT ALL PRIVILEGES ON eswari_crm.* TO 'eswari_user'@'localhost';" 2>/dev/null || true
sudo mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

# Setup application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www/eswari-crm
sudo chown -R $USER:$USER /var/www/eswari-crm

# Copy files if not already there
if [ ! -d "/var/www/eswari-crm/backend" ]; then
    print_status "Copying application files..."
    cp -r . /var/www/eswari-crm/
fi

cd /var/www/eswari-crm

# Clean up unnecessary files
print_status "Cleaning up unnecessary files..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true
rm -f backend/db.sqlite3 2>/dev/null || true
rm -f backend/test_document.txt 2>/dev/null || true
rm -f clear_tokens.html clear_browser_tokens.js 2>/dev/null || true

# Setup Python environment
print_status "Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Get server IP address
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
print_status "Detected server IP: $SERVER_IP"

# Setup environment file
print_status "Setting up environment variables..."
if [ ! -f .env ]; then
    # Create .env from production template with actual IP
    cat > .env << EOF
# Production Environment Variables for AWS Lightsail
DEBUG=False
SECRET_KEY=eswari-crm-production-secret-key-2024-very-long-and-secure-change-this
DATABASE_NAME=eswari_crm
DATABASE_USER=eswari_user
DATABASE_PASSWORD=eswari_password_2024
DATABASE_HOST=localhost
DATABASE_PORT=3306
ALLOWED_HOSTS=*,$SERVER_IP,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://$SERVER_IP,http://localhost,http://127.0.0.1
EOF
    print_warning "Created .env file with IP: $SERVER_IP"
fi

# Run Django setup
print_status "Running Django migrations..."
python manage.py collectstatic --noinput
python manage.py migrate

# Create superuser
print_status "Creating superuser..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@eswari.com', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

# Build frontend
print_status "Building frontend..."
cd ../frontend

# Remove node_modules if it exists (will be reinstalled fresh)
rm -rf node_modules 2>/dev/null || true

# Create production .env file with correct API URL
cat > .env.production << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
VITE_APP_NAME=ESWARI CONNECTS
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
EOF

npm install
npm run build

# Setup Nginx
print_status "Setting up Nginx..."
sudo cp /var/www/eswari-crm/nginx.conf /etc/nginx/sites-available/eswari-crm 2>/dev/null || {
    sudo tee /etc/nginx/sites-available/eswari-crm > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        root /var/www/eswari-crm/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /var/www/eswari-crm/backend/staticfiles/;
    }
    
    location /media/ {
        alias /var/www/eswari-crm/backend/media/;
    }
}
EOF
}

# Enable site
sudo ln -sf /etc/nginx/sites-available/eswari-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup PM2
print_status "Setting up PM2 for Django..."
cd /var/www/eswari-crm/backend
source venv/bin/activate
pm2 delete eswari-backend 2>/dev/null || true
pm2 start gunicorn --name "eswari-backend" -- --bind 127.0.0.1:8000 eswari_crm.wsgi:application
pm2 save
pm2 startup | tail -1 | sudo bash

# Create log directories
sudo mkdir -p /var/log/eswari-crm
sudo chown -R www-data:www-data /var/log/eswari-crm

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Next Steps:"
echo "1. Update your domain in /etc/nginx/sites-available/eswari-crm (if using custom domain)"
echo "2. Setup SSL certificate: sudo certbot --nginx (if using custom domain)"
echo "3. Configure firewall: sudo ufw allow 'Nginx Full'"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$SERVER_IP"
echo "   Admin: http://$SERVER_IP/admin"
echo "   Login: admin / admin123"
echo ""
echo "🔧 Useful commands:"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs eswari-backend"
echo "   Restart: pm2 restart eswari-backend"
echo ""
echo "📝 Configuration:"
echo "   Server IP: $SERVER_IP"
echo "   Backend: http://$SERVER_IP/api"
echo "   CORS configured for: http://$SERVER_IP"