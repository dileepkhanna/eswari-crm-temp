# ESWARI CONNECTS CRM - Project Structure

## 📁 Project Organization

```
eswari-connects-crm/
├── backend/                    # Django REST API Backend
│   ├── accounts/              # User management & authentication
│   ├── activity_logs/         # System activity tracking
│   ├── announcements/         # Announcements system
│   ├── eswari_crm/           # Django project settings
│   ├── leads/                # Lead management
│   ├── leaves/               # Leave management
│   ├── projects/             # Project management
│   ├── tasks/                # Task management
│   ├── venv/                 # Python virtual environment
│   ├── .env                  # Backend environment variables
│   ├── manage.py             # Django management script
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Frontend
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components
│   │   │   ├── announcements/    # Announcement components
│   │   │   ├── common/           # Shared components
│   │   │   ├── dashboard/        # Dashboard widgets
│   │   │   ├── layout/           # Layout components
│   │   │   ├── leads/            # Lead management UI
│   │   │   ├── leaves/           # Leave management UI
│   │   │   ├── projects/         # Project management UI
│   │   │   ├── reports/          # Reports and analytics
│   │   │   ├── tasks/            # Task management UI
│   │   │   ├── ui/               # Base UI components
│   │   │   └── users/            # User management UI
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Page components
│   │   │   ├── admin/        # Admin panel pages
│   │   │   ├── manager/      # Manager panel pages
│   │   │   └── staff/        # Staff panel pages
│   │   ├── types/            # TypeScript type definitions
│   │   └── main.tsx          # React app entry point
│   ├── public/               # Static assets
│   ├── node_modules/         # Frontend dependencies
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.ts        # Vite configuration
│   └── tailwind.config.ts    # Tailwind CSS configuration
│
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
└── PROJECT_STRUCTURE.md     # This file
```

## 🚀 Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
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

## 🔧 Configuration

### Backend (.env)
- Database: AWS Lightsail MySQL
- Authentication: JWT tokens
- File uploads: Django media handling

### Frontend
- Framework: React + TypeScript
- Styling: Tailwind CSS
- Build tool: Vite
- State management: React Context

## 🌐 Deployment

- **Backend**: Django on port 8000
- **Frontend**: React on port 8080
- **Database**: AWS Lightsail MySQL

## 🔐 Authentication

- **Admin**: Full system access
- **Manager**: Limited access (no customer contact details)
- **Employee**: Full access to assigned tasks and leads