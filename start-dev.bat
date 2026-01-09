@echo off
echo Starting ESWARI CONNECTS CRM Development Servers...
echo.

echo Starting Backend (Django)...
start "Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"

echo Starting Frontend (React)...
start "Frontend" cmd /k "cd frontend && npm run dev -- --port=8080"

echo.
echo Development servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
echo.
echo Press any key to exit...
pause > nul