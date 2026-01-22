#!/bin/bash

echo "Testing API endpoints on Lightsail server..."

# Test the admin check endpoint
echo "1. Testing admin exists check:"
ssh -i ~/.ssh/LightsailDefaultKey-ap-south-1.pem ec2-user@15.206.229.201 "curl -s http://localhost:8000/api/auth/setup/check/"

echo -e "\n\n2. Testing database state:"
ssh -i ~/.ssh/LightsailDefaultKey-ap-south-1.pem ec2-user@15.206.229.201 "cd /home/ec2-user/eswari-crm-temp/backend && source venv/bin/activate && python manage.py shell -c \"
from accounts.models import User
print('Total users:', User.objects.count())
print('Admin users:', User.objects.filter(role='admin').count())
\""

echo -e "\n\n3. Testing external API access:"
curl -s http://15.206.229.201/api/auth/setup/check/

echo -e "\n\nDone!"