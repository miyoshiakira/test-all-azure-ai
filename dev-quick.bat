@echo off
title NEURAL DOCS - Quick Start

echo.
echo ============================================================
echo        NEURAL DOCS - Quick Start (Skip Install)
echo ============================================================
echo   Backend:  http://localhost:7071
echo   Frontend: http://localhost:3000
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/2] Starting Backend...
start "NEURAL DOCS - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && python main.py"

echo [2/2] Starting Frontend...
timeout /t 2 /nobreak > nul
start "NEURAL DOCS - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

timeout /t 3 /nobreak > nul
start http://localhost:3000

echo.
echo Both servers started. Browser opening...
echo.
