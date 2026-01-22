#!/bin/bash

# ESWARI CRM - Initialize Git Repository
# Run this script on your local machine to set up Git repository

set -e

echo "🔧 ESWARI CRM - Initializing Git Repository..."

# Colors for output
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Git is installed
if ! command -v git &> /dev/null; then
    print_warning "Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/manage.py" ] && [ ! -f "frontend/package.json" ]; then
    print_warning "Please run this script from the eswari-crm-temp directory"
    exit 1
fi

# Initialize Git repository if not already initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
else
    print_info "Git repository already initialized"
fi

# Configure Git user (if not already configured)
if [ -z "$(git config --global user.name)" ]; then
    echo ""
    print_info "Git user configuration needed:"
    read -p "Enter your name: " GIT_NAME
    read -p "Enter your email: " GIT_EMAIL
    
    git config --global user.name "$GIT_NAME"
    git config --global user.email "$GIT_EMAIL"
    print_status "Git user configured"
fi

# Add all files to Git
print_status "Adding files to Git..."
git add .

# Create initial commit if no commits exist
if [ -z "$(git log --oneline 2>/dev/null)" ]; then
    print_status "Creating initial commit..."
    git commit -m "Initial commit: ESWARI CRM application with latest features

Features included:
- Complete CRM system with leads, customers, tasks management
- Role-based access control (Admin, Manager, Employee)
- Manager panel with employee-only views and activity monitoring
- Excel export functionality for leads and tasks with filtering
- Customer management with view-only access for managers
- Activity logging and real-time monitoring
- Responsive design for desktop and mobile
- React Native mobile app foundation"
else
    print_info "Repository already has commits"
fi

# Show current status
print_status "Repository status:"
git status --short

echo ""
print_info "📋 Next Steps:"
echo "1. Create a repository on GitHub/GitLab"
echo "2. Add remote origin:"
echo "   git remote add origin https://github.com/yourusername/eswari-crm.git"
echo "3. Push to remote:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🚀 Then on your AWS server:"
echo "1. Upload and run: ./setup-git-deployment.sh"
echo "2. For future updates: ssh user@server 'deploy'"
echo ""
print_status "Git repository initialization completed! 🎉"