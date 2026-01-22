#!/bin/bash

# ESWARI CRM - Setup Git-based Deployment
# Run this script ONCE on your AWS instance to set up Git deployment

set -e

echo "🔧 ESWARI CRM - Setting up Git-based Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Install Git if not already installed
if ! command -v git &> /dev/null; then
    print_status "Installing Git..."
    sudo apt update
    sudo apt install -y git
fi

# Install jq for JSON parsing (used in health checks)
if ! command -v jq &> /dev/null; then
    print_status "Installing jq..."
    sudo apt install -y jq
fi

# Get Git repository URL from user
echo ""
print_info "Please provide your Git repository details:"
read -p "Git repository URL (e.g., https://github.com/username/eswari-crm.git): " GIT_REPO
read -p "Branch name (default: main): " GIT_BRANCH
GIT_BRANCH=${GIT_BRANCH:-main}

# Validate Git repository URL
if [ -z "$GIT_REPO" ]; then
    print_error "Git repository URL is required"
    exit 1
fi

# Setup deployment directory
DEPLOY_DIR="/var/www/eswari-crm"
print_status "Setting up deployment directory: $DEPLOY_DIR"

# Backup existing installation if it exists
if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_DIR="/tmp/eswari-crm-backup-$(date +%Y%m%d_%H%M%S)"
    print_warning "Existing installation found. Creating backup at $BACKUP_DIR"
    sudo cp -r $DEPLOY_DIR $BACKUP_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
fi

# Create deployment directory
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

# Clone repository
print_status "Cloning repository..."
cd /var/www
rm -rf eswari-crm 2>/dev/null || true
git clone $GIT_REPO eswari-crm
cd eswari-crm

# Checkout specified branch
if [ "$GIT_BRANCH" != "main" ]; then
    print_status "Checking out branch: $GIT_BRANCH"
    git checkout $GIT_BRANCH
fi

# Make deployment scripts executable
chmod +x git-deploy.sh 2>/dev/null || true
chmod +x quick-deploy.sh 2>/dev/null || true
chmod +x configure-ip.sh 2>/dev/null || true

# Setup Git configuration for deployment user
print_status "Setting up Git configuration..."
git config --global user.name "AWS Deployment"
git config --global user.email "deploy@eswari-crm.local"
git config --global init.defaultBranch main

# Create deployment configuration
print_status "Creating deployment configuration..."
cat > deploy-config.sh << EOF
#!/bin/bash
# Deployment Configuration
export GIT_REPO="$GIT_REPO"
export GIT_BRANCH="$GIT_BRANCH"
export DEPLOY_DIR="$DEPLOY_DIR"
export BACKUP_RETENTION_DAYS=7
EOF

chmod +x deploy-config.sh

# Setup automated deployment alias
print_status "Setting up deployment alias..."
echo "alias deploy='cd $DEPLOY_DIR && ./git-deploy.sh'" >> ~/.bashrc
echo "alias deploy-status='cd $DEPLOY_DIR && git status && pm2 status'" >> ~/.bashrc
echo "alias deploy-logs='pm2 logs eswari-backend'" >> ~/.bashrc

# Create deployment log directory
sudo mkdir -p /var/log/eswari-crm
sudo chown -R $USER:$USER /var/log/eswari-crm

# Setup log rotation for deployment logs
sudo tee /etc/logrotate.d/eswari-crm > /dev/null << 'EOF'
/var/log/eswari-crm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF

# Create deployment webhook script (optional)
print_status "Creating webhook deployment script..."
cat > webhook-deploy.sh << 'EOF'
#!/bin/bash
# Webhook deployment script
# Use this with GitHub webhooks for automatic deployment

cd /var/www/eswari-crm
echo "$(date): Webhook deployment triggered" >> /var/log/eswari-crm/webhook.log
./git-deploy.sh >> /var/log/eswari-crm/webhook.log 2>&1
EOF

chmod +x webhook-deploy.sh

# Run initial deployment
print_status "Running initial deployment..."
./quick-deploy.sh

print_status "Git-based deployment setup completed! 🎉"
echo ""
echo "📋 Setup Summary:"
echo "   Repository: $GIT_REPO"
echo "   Branch: $GIT_BRANCH"
echo "   Deploy Directory: $DEPLOY_DIR"
echo ""
echo "🚀 Deployment Commands:"
echo "   Deploy latest: cd $DEPLOY_DIR && ./git-deploy.sh"
echo "   Or use alias: deploy"
echo ""
echo "📊 Monitoring Commands:"
echo "   Check status: deploy-status"
echo "   View logs: deploy-logs"
echo "   PM2 status: pm2 status"
echo ""
echo "🔄 Workflow:"
echo "   1. Push changes to Git: git push origin $GIT_BRANCH"
echo "   2. Deploy on server: ssh user@server 'deploy'"
echo ""
echo "📝 Next Steps:"
echo "   1. Test deployment: deploy"
echo "   2. Setup SSH keys for passwordless Git access (if using private repo)"
echo "   3. Configure webhook for automatic deployment (optional)"
echo ""
echo "💡 Tips:"
echo "   - Always test changes locally before pushing"
echo "   - Use 'git status' to check for uncommitted changes"
echo "   - Deployment logs are stored in /var/log/eswari-crm/"