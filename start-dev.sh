#!/bin/bash

echo "Starting ESWARI CONNECTS CRM Development Servers..."
echo

echo "Starting Backend (Django)..."
cd backend
source venv/bin/activate
python manage.py runserver &
BACKEND_PID=$!
cd ..

echo "Starting Frontend (React)..."
cd frontend
npm run dev -- --port=8080 &
FRONTEND_PID=$!
cd ..

echo
echo "Development servers are running..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080"
echo
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait