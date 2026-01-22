#!/bin/bash

# Script to configure IP address after deployment
# Run this on your AWS Lightsail instance if you need to update the IP

echo "🔧 ESWARI CRM - IP Configuration Script"

# Get current IP
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
echo "Current server IP: $CURRENT_IP"

# Ask for confirmation or custom IP
read -p "Use this IP address? (y/n) or enter custom IP: " input

if [[ $input == "y" || $input == "Y" ]]; then
    SERVER_IP=$CURRENT_IP
elif [[ $input == "n" || $input == "N" ]]; then
    read -p "Enter your server IP address: " SERVER_IP
else
    SERVER_IP=$input
fi

echo "Configuring for IP: $SERVER_IP"

# Update backend .env
cd /var/www/eswari-crm/backend
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

# Update frontend .env.production
cd ../frontend
cat > .env.production << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
VITE_APP_NAME=ESWARI CONNECTS
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
EOF

# Rebuild frontend
echo "Rebuilding frontend..."
npm run build

# Restart backend
echo "Restarting backend..."
pm2 restart eswari-backend

# Restart nginx
echo "Restarting nginx..."
sudo systemctl restart nginx

echo "✅ Configuration updated successfully!"
echo "🌐 Access your application at: http://$SERVER_IP"
echo "🔧 Admin panel: http://$SERVER_IP/admin"