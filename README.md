# AI-Based Resume Screening & Job Matching App

This is a MERN stack application with a Python-based AI service for resuming screening.

## Prerequisites (What to Install)
Before running the project, ensure you have the following installed on your machine:
1. **Node.js**: [Download Here](https://nodejs.org/) (Required for Backend & Frontend).
2. **Python**: [Download Here](https://www.python.org/downloads/) (Required for AI Analysis).
3. **MongoDB**: [Download Community Server](https://www.mongodb.com/try/download/community) (Required Database).

---

## Installation & Setup

### 1. Database Setup
- Install and start MongoDB.
- Ensure it is running on the default port `27017`.
- You don't need to create the database manually; the app will do it automatically.

### 2. Backend Setup (Server)
Open a terminal in the `server` folder:
```bash
cd server
npm install
```
*Creates `node_modules` folder with all dependencies.*

### 3. Frontend Setup (Client)
Open a new terminal in the `client` folder:
```bash
cd client
npm install
```
*Creates `node_modules` folder.*

### 4. AI Service Setup (Python)
Open a new terminal in the `ai-service` folder:
```bash
cd ai-service
# Create a virtual environment
python -m venv venv

# Activate Virtual Environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install Dependencies
pip install flask flask-cors pypdf2
```

---

## How to Run
You need 3 separate terminals running at the same time.

**Terminal 1: Backend**
```bash
cd server
npm start
```
*Running on http://localhost:5000*

**Terminal 2: AI Service**
```bash
cd ai-service
.\venv\Scripts\activate
python app.py
```
*Running on http://localhost:5001*

**Terminal 3: Frontend**
```bash
cd client
npm run dev
```
*Running on http://localhost:5173* (Open this link in your browser)

## Usage
1. Open browser to http://localhost:5173.
2. Register separate accounts for **Company** and **Candidate**.
3. As a Company: Post a job.
4. As a Candidate: Upload PDF resume -> Click 'Analyze Fit' on a job -> Apply.
5. As a Company: View Applicants -> View Analysis.
