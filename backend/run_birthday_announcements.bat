@echo off
REM Batch script to run daily birthday announcements
REM This will be scheduled to run every morning

cd /d "%~dp0"

echo [%date% %time%] Starting birthday announcements...

REM Activate virtual environment if you have one (uncomment and adjust path if needed)
REM call venv\Scripts\activate.bat

REM Run the Django management command
python manage.py create_birthday_announcements >> logs\birthday_announcements.log 2>&1

echo [%date% %time%] Birthday announcements completed.
