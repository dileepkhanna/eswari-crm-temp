#!/bin/bash

# Script to update IP address in environment files
# Usage: ./update-ip.sh YOUR_IP_ADDRESS

if [ -z "$1" ]; then
    echo "Usage: $0 <IP_ADDRESS>"
    echo "Example: $0 15.206.229.201"
    exit 1
fi

IP_ADDRESS=$1

echo "🔧 Updating environment files with IP: $IP_ADDRESS"

# Update backend .env
cat > backend/.env << EOF
# Production Environment Variables for AWS Lightsail
DEBUG=False
SECRET_KEY=eswari-crm-production-secret-key-2024-very-long-and-secure-change-this
DATABASE_NAME=eswari_crm
DATABASE_USER=eswari_user
DATABASE_PASSWORD=eswari_password_2024
DATABASE_HOST=localhost
DATABASE_PORT=3306
ALLOWED_HOSTS=*,$IP_ADDRESS,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://$IP_ADDRESS,http://localhost,http://127.0.0.1
EOF

# Update frontend .env.production
cat > frontend/.env.production << EOF
VITE_API_BASE_URL=http://$IP_ADDRESS/api
VITE_APP_NAME=ESWARI CONNECTS
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
EOF

echo "✅ Environment files updated successfully!"
echo "Backend .env: CORS allows http://$IP_ADDRESS"
echo "Frontend .env.production: API URL set to http://$IP_ADDRESS/api"