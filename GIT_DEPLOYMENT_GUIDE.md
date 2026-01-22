# 🚀 Git-Based Deployment Guide for AWS

## Overview
This guide helps you set up Git-based deployment for your ESWARI CRM application on AWS, allowing you to push changes to Git and easily update your production server.

## 📋 Prerequisites

### Local Development Machine
- Git installed and configured
- Your ESWARI CRM project ready
- GitHub/GitLab account (or other Git hosting)

### AWS Lightsail Instance
- Ubuntu 20.04/22.04 LTS
- SSH access configured
- Basic server setup completed

## 🔧 Setup Process

### Step 1: Push Your Code to Git Repository

#### 1.1 Initialize Git Repository (if not already done)
```bash
# On your local machine, in the eswari-crm-temp directory
cd eswari-crm-temp

# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: ESWARI CRM application"
```

#### 1.2 Create Remote Repository
1. Go to GitHub/GitLab
2. Create a new repository named `eswari-crm`
3. Copy the repository URL

#### 1.3 Push to Remote Repository
```bash
# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/yourusername/eswari-crm.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 2: Setup Git Deployment on AWS

#### 2.1 Upload Setup Script
```bash
# From your local machine
scp setup-git-deployment.sh ubuntu@YOUR_AWS_IP:/home/ubuntu/
```

#### 2.2 Run Setup Script on AWS
```bash
# SSH into your AWS instance
ssh ubuntu@YOUR_AWS_IP

# Make script executable and run
chmod +x setup-git-deployment.sh
./setup-git-deployment.sh
```

#### 2.3 Provide Repository Information
When prompted, enter:
- **Git repository URL**: `https://github.com/yourusername/eswari-crm.git`
- **Branch name**: `main` (or your preferred branch)

## 🚀 Deployment Workflow

### Step 1: Make Changes Locally
```bash
# Make your changes to the code
# Test locally to ensure everything works

# Stage changes
git add .

# Commit changes
git commit -m "Add Excel export functionality to admin panel"

# Push to Git
git push origin main
```

### Step 2: Deploy to AWS
```bash
# SSH into your AWS instance
ssh ubuntu@YOUR_AWS_IP

# Deploy latest changes
deploy

# Or use the full command
cd /var/www/eswari-crm && ./git-deploy.sh
```

## 📊 Monitoring and Management

### Useful Commands on AWS Server

#### Deployment Commands
```bash
# Deploy latest changes
deploy

# Check deployment status
deploy-status

# View deployment logs
deploy-logs

# Manual PM2 restart
pm2 restart eswari-backend

# Check all services
pm2 status
sudo systemctl status nginx
```

#### Git Commands
```bash
# Check current commit
cd /var/www/eswari-crm
git log --oneline -5

# Check for uncommitted changes
git status

# View recent changes
git diff HEAD~1

# Check remote status
git fetch origin
git status
```

#### Log Monitoring
```bash
# View deployment logs
tail -f /var/log/eswari-crm/deploy.log

# View application logs
pm2 logs eswari-backend

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Automated Deployment (Optional)

### Setup GitHub Webhook
1. Go to your GitHub repository
2. Navigate to Settings → Webhooks
3. Add webhook with:
   - **URL**: `http://YOUR_AWS_IP/webhook` (requires additional setup)
   - **Content type**: `application/json`
   - **Events**: Push events

### Webhook Handler Setup
```bash
# On AWS server, create webhook endpoint
sudo apt install -y nodejs npm
sudo npm install -g webhook

# Create webhook configuration
cat > /var/www/eswari-crm/webhook.json << 'EOF'
[
  {
    "id": "eswari-deploy",
    "execute-command": "/var/www/eswari-crm/webhook-deploy.sh",
    "command-working-directory": "/var/www/eswari-crm",
    "response-message": "Deployment triggered"
  }
]
EOF

# Start webhook service
webhook -hooks /var/www/eswari-crm/webhook.json -verbose
```

## 🛠️ Troubleshooting

### Common Issues

#### Git Pull Fails
```bash
# Check for local changes
git status

# Stash local changes if needed
git stash

# Pull latest changes
git pull origin main

# Apply stashed changes if needed
git stash pop
```

#### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/eswari-crm

# Fix permissions
chmod +x /var/www/eswari-crm/*.sh
```

#### Service Restart Issues
```bash
# Check PM2 status
pm2 status

# Restart PM2 process
pm2 restart eswari-backend

# If PM2 process doesn't exist
cd /var/www/eswari-crm/backend
source venv/bin/activate
pm2 start gunicorn --name "eswari-backend" -- --bind 127.0.0.1:8000 eswari_crm.wsgi:application
```

#### Database Migration Issues
```bash
# Run migrations manually
cd /var/www/eswari-crm/backend
source venv/bin/activate
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

### Rollback Procedure
```bash
# Check recent commits
git log --oneline -10

# Rollback to previous commit
git reset --hard HEAD~1

# Or rollback to specific commit
git reset --hard COMMIT_HASH

# Redeploy
./git-deploy.sh
```

## 📈 Best Practices

### Development Workflow
1. **Always test locally** before pushing to Git
2. **Use descriptive commit messages**
3. **Create feature branches** for major changes
4. **Review changes** before deployment
5. **Monitor logs** after deployment

### Security Considerations
1. **Use SSH keys** for Git authentication
2. **Keep server updated**: `sudo apt update && sudo apt upgrade`
3. **Monitor access logs**: `sudo tail -f /var/log/auth.log`
4. **Use strong passwords** for database and admin accounts
5. **Setup firewall**: `sudo ufw enable`

### Performance Optimization
1. **Monitor resource usage**: `htop`
2. **Check disk space**: `df -h`
3. **Optimize database**: Regular backups and cleanup
4. **Monitor PM2 processes**: `pm2 monit`

## 📞 Quick Reference

### Essential Commands
```bash
# Local development
git add . && git commit -m "message" && git push origin main

# AWS deployment
ssh ubuntu@YOUR_AWS_IP 'deploy'

# Check status
ssh ubuntu@YOUR_AWS_IP 'deploy-status'

# View logs
ssh ubuntu@YOUR_AWS_IP 'deploy-logs'
```

### File Locations
- **Application**: `/var/www/eswari-crm`
- **Logs**: `/var/log/eswari-crm/`
- **Nginx config**: `/etc/nginx/sites-available/eswari-crm`
- **Environment**: `/var/www/eswari-crm/backend/.env`

This Git-based deployment setup provides a professional, scalable way to manage your ESWARI CRM application updates on AWS while maintaining version control and deployment history.