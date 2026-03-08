@echo off
title HireMind AI - Startup Manager
color 0b

echo ==========================================================
echo               HIREMIND AI - SYSTEM STARTUP
echo ==========================================================
echo.
echo This script will install all required dependencies and start 
echo the React Frontend, Node.js Backend, and Python AI Service.
echo.
echo Please wait while the terminal windows open...
echo ==========================================================
echo.

:: Start the Node.js Backend
echo [1/3] Initializing Node.js API Server (Port 5000)...
start "HireMind - Backend Server" cmd /k "cd /d "%~dp0server" && echo Installing Backend Dependencies... && npm install && echo Starting Backend... && npm start"

:: Start the React Frontend
echo [2/3] Initializing React Client UI (Port 5173)...
start "HireMind - Frontend App" cmd /k "cd /d "%~dp0client" && echo Installing Frontend Dependencies... && npm install && echo Starting Frontend... && npm run dev"

:: Start the Python AI Engine
echo [3/3] Initializing Python AI Model (Port 5001)...
start "HireMind - AI Engine" cmd /k "cd /d "%~dp0ai-service" && echo Checking Virtual Environment... && if not exist venv (python -m venv venv) && call venv\Scripts\activate.bat && echo Installing AI Dependencies... && pip install -r requirements.txt && echo Starting AI Service... && python app.py"

echo.
echo SUCCESS! All 3 services are launching in separate windows.
echo.
echo Keep those windows open to view the live processing logs.
echo If this is your first time running, they might take a moment to
echo download the dependencies and the BERT AI Model.
echo.
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo    AI Model: http://localhost:5001
echo.
echo You can now minimize this window.
pause
