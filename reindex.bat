@echo off
setlocal enabledelayedexpansion

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend

echo ========================================
echo   Reindex Blob Files to Vector DB
echo ========================================
echo.

pushd %BACKEND_DIR%
.venv\Scripts\python.exe reindex.py
popd

echo.
pause
