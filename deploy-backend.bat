@echo off
title Deploy Backend - Social Search AI

echo.
echo ============================================================
echo           Deploy Backend to Azure Functions
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "FUNCTION_APP_NAME=func-test-all-ai"

:: Check Azure CLI
echo Checking Azure CLI...
call az version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Azure CLI is not installed.
    pause
    exit /b 1
)
echo [OK] Azure CLI found

:: Check Azure Functions Core Tools
echo Checking Azure Functions Core Tools...
call func --version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Azure Functions Core Tools is not installed.
    echo         Install with: npm install -g azure-functions-core-tools@4
    pause
    exit /b 1
)
echo [OK] Azure Functions Core Tools found

:: Check login
echo Checking Azure login...
call az account show > nul 2> nul
if %errorlevel% neq 0 (
    echo [INFO] Logging in to Azure...
    call az login
)
echo [OK] Logged in to Azure

cd /d "%ROOT_DIR%backend"

echo.
echo Deploying to Azure Functions...
echo (Ignore "nul" parameter error - it's a known Windows bug)
echo.

func azure functionapp publish %FUNCTION_APP_NAME% --python --build remote 2>&1 | findstr /V "nul"

echo.
echo ============================================================
echo Deployment attempted. Verifying...
echo ============================================================

:: Verify deployment by checking health endpoint
echo Checking health endpoint...
curl -s "https://%FUNCTION_APP_NAME%.azurewebsites.net/api/health" > nul 2> nul
if %errorlevel% equ 0 (
    echo [OK] Backend is responding!
) else (
    echo [WARN] Health check failed - may need a few minutes to start
)

echo.
echo URL: https://%FUNCTION_APP_NAME%.azurewebsites.net/
echo.
pause
