#!/bin/bash

# ESWARI CRM Production Deployment Script for AWS Lightsail
# This script helps deploy the latest changes to production

echo "🚀 Starting ESWARI CRM Production Deployment..."

# Check if we're in the right directory
if [ ! -f "deploy.sh" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Add all changes to git
echo "📦 Adding changes to git..."
git add .

# Commit changes with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "💾 Committing changes..."
git commit -m "Production deployment - $TIMESTAMP"

# Push to remote repository
echo "🔄 Pushing to remote repository..."
git push origin main

echo "✅ Local deployment preparation complete!"
echo ""
echo "🔧 Next steps on your AWS Lightsail instance:"
echo "1. SSH into your instance: ssh -i your-key.pem ubuntu@13.205.34.169"
echo "2. Navigate to your project directory"
echo "3. Pull the latest changes: git pull origin main"
echo "4. Restart backend: sudo systemctl restart gunicorn"
echo "5. Restart frontend: sudo systemctl restart nginx"
echo "6. Check status: sudo systemctl status gunicorn nginx"
echo ""
echo "🌐 Your application will be available at:"
echo "   Frontend: http://13.205.34.169:8080"
echo "   Backend API: http://13.205.34.169:8001"