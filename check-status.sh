#!/bin/bash

# Quick status check script for AWS Lightsail deployment with MySQL

echo "🔍 ESWARI CRM Production Status Check"
echo "======================================"

# Check if services are running
echo "📊 Service Status:"
echo "Backend (Gunicorn):"
sudo systemctl is-active gunicorn
sudo systemctl status gunicorn --no-pager -l

echo ""
echo "Frontend (Nginx):"
sudo systemctl is-active nginx
sudo systemctl status nginx --no-pager -l

echo ""
echo "🗄️ Database Connection Test:"
cd /home/ubuntu/eswari-crm-temp/backend
python manage.py check --database default
if [ $? -eq 0 ]; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
fi

echo ""
echo "🌐 Testing Endpoints:"

# Test backend API
echo "Backend API Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://13.205.34.169:8001/api/

# Test frontend
echo "Frontend Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://13.205.34.169:8080/

echo ""
echo "📁 Disk Usage:"
df -h

echo ""
echo "💾 Memory Usage:"
free -h

echo ""
echo "🗄️ Database Info:"
echo "   Type: MySQL (Lightsail RDS)"
echo "   Host: ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com"
echo "   Database: eswari_crm"
echo "   User: dbmasteruser"

echo ""
echo "🔗 Application URLs:"
echo "   Frontend: http://13.205.34.169:8080"
echo "   Backend API: http://13.205.34.169:8001"