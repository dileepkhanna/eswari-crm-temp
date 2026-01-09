# ESWARI CONNECTS CRM

A comprehensive Customer Relationship Management system built with React frontend and Django REST API backend.

## 🚀 Features

- **User Management**: Role-based access (Admin, Manager, Employee)
- **Lead Management**: Track and manage customer leads
- **Task Management**: Assign and track tasks with customer contact details
- **Project Management**: Manage real estate projects
- **Leave Management**: Employee leave requests and approvals
- **Activity Tracking**: System-wide activity logging
- **Announcements**: Internal communication system
- **Reports & Analytics**: Performance tracking and insights

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **React Context** for state management

### Backend
- **Django 5.0** with Django REST Framework
- **MySQL** database (AWS Lightsail)
- **JWT Authentication**
- **Django CORS** for cross-origin requests

## 🔧 Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- MySQL database

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port=8080
```

## 🌐 Access

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

## 🔐 Default Login

- **Admin**: admin@example.com / admin123
- **Manager**: manager@test.com / admin123
- **Employee**: employee@test.com / admin123

## 📱 Key Features

### Privacy Controls
- Customer contact details visible to Admins and Employees only
- Managers have restricted access to sensitive information

### Manager-Employee Relationships
- Employees must be assigned to managers
- Managers can view their assigned employees

### Monthly Leave Quota
- First leave per month: No document required
- Additional leaves: Document mandatory
- Monthly reset of leave quotas

## 🗄️ Database

Connected to AWS Lightsail MySQL for production-ready data storage.

## 📄 License

Private project for ESWARI CONNECTS.