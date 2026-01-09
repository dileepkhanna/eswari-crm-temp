#!/bin/bash

# ESWARI CONNECTS CRM - AWS Lightsail Deployment Script
# For Amazon Linux 2023

set -e

echo "🚀 Starting ESWARI CONNECTS CRM deployment on AWS Lightsail..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="eswari-crm"
PROJECT_DIR="/var/www/$PROJECT_NAME"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="/var/log/$PROJECT_NAME"
RUN_DIR="/var/run/$PROJECT_NAME"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Project Directory: $PROJECT_DIR"
echo "Backend Directory: $BACKEND_DIR"
echo "Frontend Directory: $FRONTEND_DIR"
echo "Log Directory: $LOG_DIR"
echo "Run Directory: $RUN_DIR"
echo

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_status "Step 1: Updating system packages..."
dnf update -y

print_status "Step 2: Installing required packages..."
# Install Node.js 18
dnf install -y nodejs npm

# Install Python 3.11 and pip
dnf install -y python3 python3-pip python3-devel

# Install MySQL client and development libraries
dnf install -y mysql mysql-devel

# Install Nginx
dnf install -y nginx

# Install Git
dnf install -y git

# Install build tools
dnf groupinstall -y "Development Tools"

print_status "Step 3: Creating project directories..."
mkdir -p $PROJECT_DIR
mkdir -p $LOG_DIR
mkdir -p $RUN_DIR
mkdir -p /var/www/$PROJECT_NAME/static
mkdir -p /var/www/$PROJECT_NAME/media

print_status "Step 4: Setting up users and permissions..."
# Create www-data user if it doesn't exist
if ! id "www-data" &>/dev/null; then
    useradd -r -s /bin/false www-data
fi

# Set ownership
chown -R www-data:www-data $PROJECT_DIR
chown -R www-data:www-data $LOG_DIR
chown -R www-data:www-data $RUN_DIR

print_status "Step 5: Cloning repository..."
cd /tmp
if [ -d "eswari-crm-temp" ]; then
    rm -rf eswari-crm-temp
fi

echo "Please enter your Git repository URL:"
read -p "Git URL: " GIT_URL

git clone $GIT_URL eswari-crm-temp
cp -r eswari-crm-temp/* $PROJECT_DIR/
rm -rf eswari-crm-temp

print_status "Step 6: Setting up Python virtual environment..."
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-prod.txt

print_status "Step 7: Setting up environment variables..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env
    print_warning "Please edit $BACKEND_DIR/.env with your actual configuration"
    print_warning "Press Enter to continue after editing the .env file..."
    read
fi

print_status "Step 8: Setting up Django..."
cd $BACKEND_DIR
source venv/bin/activate
python manage.py collectstatic --noinput --settings=eswari_crm.settings_production
python manage.py migrate --settings=eswari_crm.settings_production

print_status "Step 9: Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build

print_status "Step 10: Setting up Nginx..."
cat > /etc/nginx/conf.d/$PROJECT_NAME.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    # Frontend (React)
    location / {
        root /var/www/eswari-crm/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /var/www/eswari-crm/static/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Media files
    location /media/ {
        alias /var/www/eswari-crm/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Test Nginx configuration
nginx -t

print_status "Step 11: Setting up systemd service for Django..."
cat > /etc/systemd/system/$PROJECT_NAME-backend.service << EOF
[Unit]
Description=ESWARI CRM Backend (Django)
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --config $BACKEND_DIR/gunicorn.conf.py eswari_crm.wsgi_production:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

print_status "Step 12: Setting correct permissions..."
chown -R www-data:www-data $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 755 $LOG_DIR
chmod -R 755 $RUN_DIR

print_status "Step 13: Starting services..."
systemctl daemon-reload
systemctl enable $PROJECT_NAME-backend
systemctl start $PROJECT_NAME-backend
systemctl enable nginx
systemctl restart nginx

print_status "Step 14: Setting up firewall..."
# Open HTTP and HTTPS ports
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi

print_status "Step 15: Final checks..."
echo "Checking service status..."
systemctl status $PROJECT_NAME-backend --no-pager
systemctl status nginx --no-pager

echo
print_status "🎉 Deployment completed successfully!"
echo
echo -e "${GREEN}📋 Next Steps:${NC}"
echo "1. Edit $BACKEND_DIR/.env with your actual database credentials"
echo "2. Create a Django superuser: cd $BACKEND_DIR && source venv/bin/activate && python manage.py createsuperuser --settings=eswari_crm.settings_production"
echo "3. Your application should be accessible at: http://$(curl -s http://checkip.amazonaws.com/)"
echo "4. Django Admin: http://$(curl -s http://checkip.amazonaws.com/)/admin/"
echo
echo -e "${YELLOW}📝 Important Files:${NC}"
echo "- Backend logs: $LOG_DIR/"
echo "- Nginx config: /etc/nginx/conf.d/$PROJECT_NAME.conf"
echo "- Systemd service: /etc/systemd/system/$PROJECT_NAME-backend.service"
echo "- Environment file: $BACKEND_DIR/.env"
echo
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "- Restart backend: sudo systemctl restart $PROJECT_NAME-backend"
echo "- Restart nginx: sudo systemctl restart nginx"
echo "- View backend logs: sudo journalctl -u $PROJECT_NAME-backend -f"
echo "- View nginx logs: sudo tail -f /var/log/nginx/error.log"
echo
print_status "Deployment script completed!"