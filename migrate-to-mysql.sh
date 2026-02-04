#!/bin/bash

# Migration script to move from SQLite to MySQL
# Run this script on your AWS Lightsail instance

echo "🔄 Migrating from SQLite to MySQL Database..."

# Navigate to backend directory
cd /home/ubuntu/eswari-crm-temp/backend

# Backup current SQLite data (if exists)
if [ -f "db.sqlite3" ]; then
    echo "💾 Backing up SQLite data..."
    python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission > sqlite_backup.json
    echo "✅ SQLite data backed up to sqlite_backup.json"
else
    echo "ℹ️ No SQLite database found, proceeding with fresh MySQL setup"
fi

# Update environment to use MySQL
echo "🔧 Updating environment configuration..."
sed -i 's/USE_SQLITE=True/USE_SQLITE=False/' .env
echo "✅ Environment updated to use MySQL"

# Install MySQL client dependencies
echo "📦 Installing MySQL client dependencies..."
sudo apt-get update
sudo apt-get install -y python3-dev default-libmysqlclient-dev build-essential pkg-config
pip install mysqlclient

# Test database connection
echo "🔌 Testing MySQL database connection..."
python manage.py check --database default
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed. Please check your database credentials."
    exit 1
fi

# Run migrations to create tables
echo "🗄️ Creating database tables..."
python manage.py migrate

# Load data from SQLite backup (if exists)
if [ -f "sqlite_backup.json" ]; then
    echo "📥 Loading data from SQLite backup..."
    python manage.py loaddata sqlite_backup.json
    echo "✅ Data migration completed"
else
    echo "ℹ️ No backup data to load, starting with fresh database"
fi

# Create superuser if none exists
echo "👤 Checking for superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print('No superuser found. Please create one:')
    exit(1)
else:
    print('Superuser already exists')
"

if [ $? -ne 0 ]; then
    echo "🔐 Creating superuser..."
    python manage.py createsuperuser
fi

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart gunicorn
sudo systemctl status gunicorn --no-pager

echo "✅ Migration to MySQL completed successfully!"
echo ""
echo "🗄️ Database Details:"
echo "   Type: MySQL (Lightsail RDS)"
echo "   Host: ls-9f81218bf6b469cae6a9db9158f70a15ea310190.cz6myou6w43k.ap-south-1.rds.amazonaws.com"
echo "   Database: eswari_crm"
echo ""
echo "🔍 To verify the migration:"
echo "   python manage.py check --database default"
echo "   python manage.py dbshell"