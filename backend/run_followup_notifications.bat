@echo off
REM Run follow-up notifications check
cd /d "%~dp0"
python manage.py send_followup_notifications
