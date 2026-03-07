@echo off
title Employee Search AI - Quick Start

echo.
echo ============================================================
echo        Employee Search AI - Quick Start (Skip Install)
echo ============================================================
echo   Backend:  http://localhost:7071
echo   Frontend: http://localhost:3000
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/2] Starting Backend...
start "Employee Search AI - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call .venv\Scripts\activate.bat && python function_app.py"

echo [2/2] Starting Frontend...
timeout /t 2 /nobreak > nul
start "Employee Search AI - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

timeout /t 3 /nobreak > nul
start http://localhost:3000

echo.
echo Both servers started. Browser opening...
echo.
