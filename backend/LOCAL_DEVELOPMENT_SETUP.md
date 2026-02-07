# Local Development Setup - SQLite Configuration

## Current Configuration

Your Django backend is now configured to use **SQLite** for local development.

### Environment Variables (`.env`)

```env
DEBUG=True
USE_SQLITE=True
```

### Database Configuration

The `settings.py` file automatically uses SQLite when either:
- `DEBUG=True` (development mode), OR
- `USE_SQLITE=True` (explicit SQLite mode)

**SQLite Database Location:** `eswari-crm-temp/backend/db.sqlite3`

## Running the Local Server

### 1. Activate Virtual Environment (if using one)
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Run Migrations (if needed)
```bash
python manage.py migrate
```

### 3. Create Superuser (if needed)
```bash
python manage.py createsuperuser
```

### 4. Start Development Server
```bash
python manage.py runserver
```

The server will run at: `http://127.0.0.1:8000/`

## Switching Between SQLite and MySQL

### For Local Development (SQLite)
Update `.env`:
```env
DEBUG=True
USE_SQLITE=True
```

### For Production (MySQL)
Update `.env`:
```env
DEBUG=False
USE_SQLITE=False
DATABASE_NAME=eswari_crm
DATABASE_USER=dbmasteruser
DATABASE_PASSWORD=your_password
DATABASE_HOST=your_mysql_host
DATABASE_PORT=3306
```

## Useful Commands

### Check Database Configuration
```bash
python manage.py check --database default
```

### View Current Database Settings
```bash
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DATABASES)
```

### Reset SQLite Database (if needed)
```bash
# Delete the database file
del db.sqlite3  # Windows
rm db.sqlite3   # Linux/Mac

# Run migrations again
python manage.py migrate
python manage.py createsuperuser
```

## CORS Configuration

The `.env` file is configured for local development with these allowed origins:
- `http://localhost:3000` (React default)
- `http://localhost:5173` (Vite default)
- `http://localhost:8080` (Custom frontend)
- `http://localhost:8001` (Alternative port)

## Notes

- SQLite is perfect for local development and testing
- The SQLite database file (`db.sqlite3`) is already in `.gitignore`
- For production, always use MySQL/PostgreSQL for better performance and concurrency
- The existing `db.sqlite3` file contains your current local data
