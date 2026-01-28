#!/bin/bash
# Deployment script to fix file upload size limits

echo "Moving files to correct locations..."

# Find the project directory
PROJECT_DIR=$(find /home/ec2-user -name "eswari_crm" -type d | grep backend | head -1 | xargs dirname | xargs dirname)

if [ -z "$PROJECT_DIR" ]; then
    echo "Error: Could not find project directory"
    exit 1
fi

echo "Project found at: $PROJECT_DIR"

# Backup existing files
echo "Creating backups..."
sudo cp "$PROJECT_DIR/backend/eswari_crm/settings.py" "$PROJECT_DIR/backend/eswari_crm/settings.py.bak" 2>/dev/null || true
sudo cp "$PROJECT_DIR/backend/gunicorn.conf.py" "$PROJECT_DIR/backend/gunicorn.conf.py.bak" 2>/dev/null || true

# Move updated files
echo "Updating files..."
sudo cp ~/settings.py "$PROJECT_DIR/backend/eswari_crm/settings.py"
sudo cp ~/gunicorn.conf.py "$PROJECT_DIR/backend/gunicorn.conf.py"

# Update nginx configuration
NGINX_CONF=$(sudo find /etc/nginx -name "nginx.conf" -o -name "default" | head -1)
if [ ! -z "$NGINX_CONF" ]; then
    echo "Updating nginx config at: $NGINX_CONF"
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"
    sudo cp ~/nginx.conf "$NGINX_CONF" 2>/dev/null || echo "Manual nginx update needed"
fi

# Restart services
echo "Restarting services..."
sudo systemctl restart gunicorn 2>/dev/null || sudo pkill -HUP gunicorn
sudo systemctl restart nginx 2>/dev/null || sudo nginx -s reload

echo "Deployment complete!"
echo "Testing if services are running..."
sudo systemctl status gunicorn --no-pager | head -5
sudo systemctl status nginx --no-pager | head -5
