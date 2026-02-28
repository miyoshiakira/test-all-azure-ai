@echo off

echo.
echo ============================================================
echo           NEURAL DOCS - Stop All Servers
echo ============================================================
echo.

echo Stopping Backend (Python/uvicorn)...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq NEURAL DOCS - Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq NEURAL DOCS - Backend*" 2>nul

echo Stopping Frontend (Node/Vite)...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq NEURAL DOCS - Frontend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq NEURAL DOCS - Frontend*" 2>nul

echo.
echo All development servers stopped.
echo.
pause
