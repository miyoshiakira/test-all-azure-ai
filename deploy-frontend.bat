@echo off
title Deploy Frontend - Social Search AI

echo.
echo ============================================================
echo         Deploy Frontend to Azure Static Web Apps
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "STATIC_WEB_APP_NAME=test-all-ai-site"

:: Check Azure CLI
call az version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Azure CLI is not installed.
    pause
    exit /b 1
)
echo [OK] Azure CLI found

:: Check Node.js
call node --version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    pause
    exit /b 1
)
echo [OK] Node.js found

:: Check SWA CLI
call swa --version > nul 2> nul
if %errorlevel% neq 0 (
    echo [WARN] SWA CLI is not installed. Installing...
    call npm install -g @azure/static-web-apps-cli
)
echo [OK] SWA CLI found

:: Check login
call az account show > nul 2> nul
if %errorlevel% neq 0 (
    echo [INFO] Logging in to Azure...
    call az login
)

cd /d "%ROOT_DIR%frontend"

echo [1/3] Installing dependencies...
call npm install

echo [2/3] Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo [3/3] Deploying to Azure Static Web Apps...

:: Get deployment token
for /f "tokens=*" %%a in ('az staticwebapp secrets list --name %STATIC_WEB_APP_NAME% --query "properties.apiKey" -o tsv') do set "DEPLOYMENT_TOKEN=%%a"

if "%DEPLOYMENT_TOKEN%"=="" (
    echo [ERROR] Could not get deployment token.
    pause
    exit /b 1
)

call swa deploy ./dist --deployment-token %DEPLOYMENT_TOKEN% --env production

echo.
echo [OK] Frontend deployed successfully!
echo URL: https://%STATIC_WEB_APP_NAME%.azurestaticapps.net/
echo.
pause
