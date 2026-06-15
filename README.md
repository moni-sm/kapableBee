# KapableBee — AI-Powered Talent Intelligence Platform

**KapableBee** is a talent intelligence platform that ranks candidates using semantic scoring. It is structured as a monorepo consisting of a **Vite React** frontend and a **Django REST Framework** backend connected to **MongoDB Atlas** for document storage and **SQLite** for secure recruiter authentication.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Frontend (Vite + React)
        A[React App] --> B[JobContext State]
        B --> C[Axios Client with JWT Interceptors]
    end

    subgraph Backend (Django + DRF)
        C --> D[Django URL Router]
        D --> E[User Auth & SQLite]
        D --> F[MongoDB pyMongo API Wrapper]
        F --> G[(MongoDB Atlas Cluster)]
        E --> H[(SQLite db.sqlite3)]
        D --> I[Semantic Scorer Engine]
    end
```

### Key Technologies
* **Frontend**: React, Axios, Custom CSS variables, Google Fonts (Syne, DM Sans), Tabler Icons.
* **Backend**: Django 5.x, Django REST Framework (DRF), `djangorestframework-simplejwt` (JWT Auth), PyMongo (MongoDB connection), python-dotenv, django-cors-headers.
* **Databases**:
  * **SQLite**: For recruiter profiles, passwords, and sessions.
  * **MongoDB Atlas**: For unstructured, high-fidelity candidate resumes and job configurations.

---

## ⚙️ Prerequisites

Ensure you have the following installed on your machine:
* **Python** (version 3.12+)
* **Node.js** (version 18+ & npm)
* **MongoDB Atlas account** (or a local MongoDB instance running)

---

## 🚀 Setup & Installation

### 1. Backend Setup (Django + MongoDB)

Open your terminal, navigate to the `backend` directory, and perform the following:

```bash
# 1. Navigate to backend
cd backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create a .env file and set your configurations
# Example contents of backend/.env:
# SECRET_KEY=your-django-secret-key
# DEBUG=True
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
# MONGODB_DB=kapablebee

# 6. Apply system auth migrations (initializes SQLite db.sqlite3)
python manage.py migrate

# 7. Start the Django backend server
python manage.py runserver
```
The backend API will start running locally at `http://localhost:8000/api/`.

---

### 2. Frontend Setup (Vite + React)

Open a new terminal window, navigate to the `frontend` directory, and perform the following:

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install package dependencies
npm install

# 3. Start the Vite development server
npm start
```
The React frontend will spin up and open automatically at [http://localhost:5173/](http://localhost:5173/).

---

## 🧪 Running Automated Tests

A DRF integration test suite is included to verify registration, JWT authentication token issuance, PyMongo MongoDB listings, and ranking computations:

```bash
# Navigate to the backend directory, activate the venv, and run:
python manage.py test
```

---

## 🛡️ Recruiter Guest Flow vs. Signed In Flow

* **Guest Mode (Default)**: If you run the frontend without signing in, KapableBee operates in **Local Guest Mode**. Candidates are stored in the browser's temporary memory, and candidate matching is computed via a local client-side simulation.
* **Recruiter Mode (Authenticated)**: Once you click **Sign In / Register** in the sidebar, create an account, and log in, the application uses **JWT bearer tokens** to authorize CRUD transactions. Job configurations, uploaded resumes, and manual candidate fields are written to MongoDB Atlas in real-time.
