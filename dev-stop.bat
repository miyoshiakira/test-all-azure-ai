@echo off

echo.
echo ============================================================
echo           Employee Search AI - Stop All Servers
echo ============================================================
echo.

echo Stopping Backend (Python/uvicorn)...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Employee Search AI - Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Employee Search AI - Backend*" 2>nul

echo Stopping Frontend (Node/Vite)...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Employee Search AI - Frontend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Employee Search AI - Frontend*" 2>nul

echo.
echo All development servers stopped.
echo.
pause
