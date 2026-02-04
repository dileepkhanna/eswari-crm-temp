#!/bin/bash

# Server-side deployment script for AWS Lightsail with MySQL Database
# Run this script on your AWS Lightsail instance after pushing changes

echo "🚀 Starting server-side deployment with MySQL database..."

# Navigate to project directory (adjust path as needed)
PROJECT_DIR="/home/ubuntu/eswari-crm-temp"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
else
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "Please update the PROJECT_DIR variable in this script"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Backend deployment
echo "🔧 Deploying backend..."
cd backend

# Install/update Python dependencies (including MySQL client)
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install MySQL client if not already installed
echo "🗄️ Ensuring MySQL client is installed..."
sudo apt-get update
sudo apt-get install -y python3-dev default-libmysqlclient-dev build-essential pkg-config
pip install mysqlclient

# Test database connection
echo "🔌 Testing database connection..."
python manage.py check --database default

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# Create superuser if needed (optional - uncomment if needed)
# echo "👤 Creating superuser (if needed)..."
# python manage.py shell -c "
# from django.contrib.auth import get_user_model
# User = get_user_model()
# if not User.objects.filter(is_superuser=True).exists():
#     User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
#     print('Superuser created: admin/admin123')
# else:
#     print('Superuser already exists')
# "

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Restart backend services
echo "🔄 Restarting backend services..."
sudo systemctl restart gunicorn
sudo systemctl status gunicorn --no-pager

# Frontend deployment
echo "🎨 Deploying frontend..."
cd ../frontend

# Install/update Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Copy build files to nginx directory (adjust path as needed)
echo "📁 Copying build files..."
sudo cp -r dist/* /var/www/html/

# Restart frontend services
echo "🔄 Restarting frontend services..."
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should now be available at:"
echo "   Frontend: http://13.205.34.169:8080"
echo "   Backend API: http://13.205.34.169:8001"
echo ""
echo "🗄️ Database: MySQL (Lightsail RDS)"
echo "   Host: ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com"
echo "   Database: eswari_crm"
echo ""
echo "🔍 To check logs:"
echo "   Backend logs: sudo journalctl -u gunicorn -f"
echo "   Frontend logs: sudo journalctl -u nginx -f"
echo "   Database connection: python manage.py dbshell"