#!/bin/bash

# ESWARI CRM - Git-based Deployment Script for AWS
# Run this script on your AWS instance to update from Git

set -e

echo "🚀 ESWARI CRM - Git Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "manage.py" ] && [ ! -f "backend/manage.py" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Determine project structure
if [ -f "manage.py" ]; then
    BACKEND_DIR="."
    FRONTEND_DIR="../frontend"
    PROJECT_ROOT=".."
else
    BACKEND_DIR="backend"
    FRONTEND_DIR="frontend"
    PROJECT_ROOT="."
fi

print_info "Using backend directory: $BACKEND_DIR"
print_info "Using frontend directory: $FRONTEND_DIR"

# Backup current state
print_status "Creating backup of current deployment..."
BACKUP_DIR="/tmp/eswari-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r $PROJECT_ROOT $BACKUP_DIR/ 2>/dev/null || true

# Pull latest changes from Git
print_status "Pulling latest changes from Git..."
cd $PROJECT_ROOT
git fetch origin
git pull origin main

# Check if there are any changes
if [ $? -ne 0 ]; then
    print_error "Git pull failed. Please resolve conflicts manually."
    exit 1
fi

# Get current commit info
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
print_info "Deploying commit: $COMMIT_HASH"
print_info "Commit message: $COMMIT_MESSAGE"

# Backend updates
print_status "Updating backend..."
cd $BACKEND_DIR

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    print_status "Activated Python virtual environment"
else
    print_warning "Virtual environment not found, using system Python"
fi

# Install/update Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput

# Frontend updates
print_status "Updating frontend..."
cd $PROJECT_ROOT/$FRONTEND_DIR

# Install/update Node dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build frontend
print_status "Building frontend for production..."
npm run build

# Restart services
print_status "Restarting services..."

# Restart PM2 (Django backend)
pm2 restart eswari-backend 2>/dev/null || {
    print_warning "PM2 restart failed, trying to start..."
    cd $PROJECT_ROOT/$BACKEND_DIR
    source venv/bin/activate 2>/dev/null || true
    pm2 start gunicorn --name "eswari-backend" -- --bind 127.0.0.1:8000 eswari_crm.wsgi:application
}

# Reload Nginx
sudo systemctl reload nginx

# Health check
print_status "Performing health check..."
sleep 3

# Check PM2 status
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="eswari-backend") | .pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$PM2_STATUS" = "online" ]; then
    print_status "Backend service is running"
else
    print_warning "Backend service status: $PM2_STATUS"
fi

# Check Nginx status
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_warning "Nginx is not running properly"
fi

# Test API endpoint
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ 2>/dev/null || echo "000")
if [ "$API_TEST" = "200" ] || [ "$API_TEST" = "404" ]; then
    print_status "API endpoint is responding"
else
    print_warning "API endpoint test returned: $API_TEST"
fi

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Deployment Summary:"
echo "   Commit: $COMMIT_HASH"
echo "   Message: $COMMIT_MESSAGE"
echo "   Backend Status: $PM2_STATUS"
echo "   Server IP: $SERVER_IP"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$SERVER_IP"
echo "   Admin: http://$SERVER_IP/admin"
echo ""
echo "🔧 Useful commands:"
echo "   Check logs: pm2 logs eswari-backend"
echo "   Check status: pm2 status"
echo "   Manual restart: pm2 restart eswari-backend"
echo ""
echo "💾 Backup created at: $BACKUP_DIR"