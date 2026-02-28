@echo off
title Deploy - Social Search AI

echo.
echo ============================================================
echo           Deploy Script - Social Search AI
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "RESOURCE_GROUP=test-all-ai"
set "FUNCTION_APP_NAME=func-test-all-ai"
set "STATIC_WEB_APP_NAME=test-all-ai-site"

echo Checking requirements...

:: Check Azure CLI
echo Checking Azure CLI...
call az version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Azure CLI is not installed.
    echo         Install from: https://docs.microsoft.com/cli/azure/install-azure-cli
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

:: Check Node.js
echo Checking Node.js...
call node --version > nul 2> nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    pause
    exit /b 1
)
echo [OK] Node.js found

:: Check SWA CLI
echo Checking SWA CLI...
call swa --version > nul 2> nul
if %errorlevel% neq 0 (
    echo [WARN] SWA CLI is not installed. Installing...
    call npm install -g @azure/static-web-apps-cli
)
echo [OK] SWA CLI found

echo.
echo ============================================================
echo   Deployment Configuration
echo ============================================================
echo   Resource Group:      %RESOURCE_GROUP%
echo   Function App:        %FUNCTION_APP_NAME%
echo   Static Web App:      %STATIC_WEB_APP_NAME%
echo ============================================================
echo.

set /p CONFIRM="Continue with deployment? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

:: Check Azure login
echo.
echo Checking Azure login...
call az account show > nul 2> nul
if %errorlevel% neq 0 (
    echo Not logged in. Starting Azure login...
    call az login
)
echo [OK] Logged in to Azure
echo.

:: Step 1: Build Frontend
echo ============================================================
echo   [1/4] Building Frontend
echo ============================================================
cd /d "%ROOT_DIR%frontend"
call npm install
call npm run build
echo [OK] Frontend build complete
echo.

:: Step 2: Deploy Backend
echo ============================================================
echo   [2/4] Deploying Backend to Azure Functions
echo ============================================================
cd /d "%ROOT_DIR%backend"
echo Deploying to Azure Functions...
echo (Ignore "nul" parameter error - it's a known Windows bug)
func azure functionapp publish %FUNCTION_APP_NAME% --python --build remote 2>&1 | findstr /V "nul"
echo [OK] Backend deployment complete
echo.

:: Step 3: Deploy Frontend to Static Web Apps
echo ============================================================
echo   [3/4] Deploying Frontend to Azure Static Web Apps
echo ============================================================
cd /d "%ROOT_DIR%frontend"

:: Get deployment token
echo Getting deployment token...
for /f "tokens=*" %%a in ('az staticwebapp secrets list --name %STATIC_WEB_APP_NAME% --query "properties.apiKey" -o tsv') do set "DEPLOYMENT_TOKEN=%%a"

if "%DEPLOYMENT_TOKEN%"=="" (
    echo [ERROR] Could not get deployment token.
    echo         Make sure the Static Web App exists: %STATIC_WEB_APP_NAME%
    pause
    exit /b 1
)

:: Deploy using SWA CLI
echo Deploying to Static Web Apps...
call swa deploy ./dist --deployment-token %DEPLOYMENT_TOKEN% --env production
echo [OK] Frontend deployment complete
echo.

:: Step 4: Done
echo ============================================================
echo   [4/4] Deployment Complete!
echo ============================================================
echo.
echo   Frontend: https://%STATIC_WEB_APP_NAME%.azurestaticapps.net/
echo   Backend:  https://%FUNCTION_APP_NAME%.azurewebsites.net/
echo.
echo ============================================================
pause
