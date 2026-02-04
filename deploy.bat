@echo off
REM ESWARI CRM Production Deployment Script for AWS Lightsail (Windows)
REM This script helps deploy the latest changes to production

echo 🚀 Starting ESWARI CRM Production Deployment...

REM Check if we're in the right directory
if not exist "deploy.bat" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

REM Add all changes to git
echo 📦 Adding changes to git...
git add .

REM Commit changes with timestamp
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set mydate=%%k-%%j-%%i
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set mytime=%%i:%%j
echo 💾 Committing changes...
git commit -m "Production deployment - %mydate% %mytime%"

REM Push to remote repository
echo 🔄 Pushing to remote repository...
git push origin main

echo ✅ Local deployment preparation complete!
echo.
echo 🔧 Next steps on your AWS Lightsail instance:
echo 1. SSH into your instance: ssh -i your-key.pem ubuntu@13.205.34.169
echo 2. Navigate to your project directory
echo 3. Pull the latest changes: git pull origin main
echo 4. Restart backend: sudo systemctl restart gunicorn
echo 5. Restart frontend: sudo systemctl restart nginx
echo 6. Check status: sudo systemctl status gunicorn nginx
echo.
echo 🌐 Your application will be available at:
echo    Frontend: http://13.205.34.169:8080
echo    Backend API: http://13.205.34.169:8001

pause