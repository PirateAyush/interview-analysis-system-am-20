# Interview Analysis System

A full-stack web application for conducting and analyzing interviews using AI-powered insights.

## Features

- 🏢 **Multi-Organization Support** - Organizations get unique hexadecimal IDs
- 👥 **User Management** - Role-based access (Admin, HR, Interviewer)
- 🔐 **Secure Authentication** - Mobile + Password with Email OTP verification
- 🎯 **JWT-based Sessions** - Secure token-based authentication
- 📊 **Dashboard** - User and organization management

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Axios for API calls
- React Router

### Backend
- Flask (Python)
- SQLAlchemy ORM
- Flask-JWT-Extended
- Flask-Bcrypt
- SQLite Database

## Installation

### Backend Setup
```bash
cd backend
python -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
python run.py


### Frontend Setup
cd frontend
npm install
npm start
