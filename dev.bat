@echo off
title Employee Search AI - Development Environment

echo.
echo ============================================================
echo           Employee Search AI - Development Environment
echo ============================================================
echo   Backend:  http://localhost:7071
echo   Frontend: http://localhost:3000
echo ============================================================
echo.

:: Get the directory where this script is located
set "ROOT_DIR=%~dp0"

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/4] Setting up backend virtual environment...
cd /d "%ROOT_DIR%backend"
if not exist ".venv" (
    echo       Creating virtual environment...
    python -m venv .venv
)

echo       Installing backend dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q
call .venv\Scripts\deactivate.bat

echo [2/4] Starting Backend Server...
start "Employee Search AI - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call .venv\Scripts\activate.bat && echo. && echo ======================================== && echo   Backend running on http://localhost:7071 && echo ======================================== && echo. && python function_app.py"

echo [3/4] Checking frontend dependencies...
cd /d "%ROOT_DIR%frontend"
if not exist "node_modules" (
    echo       Installing npm packages...
    call npm install
)

echo [4/4] Starting Frontend Server...
timeout /t 3 /nobreak > nul
start "Employee Search AI - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && echo. && echo ======================================== && echo   Frontend running on http://localhost:3000 && echo ======================================== && echo. && npm run dev"

echo.
echo ============================================================
echo   Both servers are starting in separate windows.
echo   Press any key to open the app in your browser...
echo ============================================================
echo.
pause

:: Open browser after a short delay
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo To stop the servers, close the terminal windows or press Ctrl+C in each.
echo.
