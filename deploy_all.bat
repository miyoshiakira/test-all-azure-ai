@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Full Stack Deploy (Backend + Frontend)
echo ========================================
echo.

REM --- Configuration ---
set APP_NAME=test-all-ai-func
set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

REM --- 1. Azure Login Check ---
echo [1/4] Checking Azure authentication...
call az account show >nul 2>&1
if errorlevel 1 (
    echo    Login required. Opening browser...
    call az login
    if errorlevel 1 (
        echo    ERROR: Azure login failed.
        pause
        exit /b 1
    )
)
echo    OK: Authenticated.

REM --- 2. Deploy Backend ---
echo.
echo [2/4] Deploying Backend (Azure Functions)...
echo    This may take a few minutes...

set FUNC_PYTHON_SKIP_VERSION_CHECK=1
pushd %BACKEND_DIR%
call func azure functionapp publish %APP_NAME% --build remote --verbose
if errorlevel 1 (
    echo    ERROR: Backend deployment failed.
    popd
    pause
    exit /b 1
)
popd
echo    OK: Backend deployed.

REM --- 3. Build & Deploy Frontend ---
echo.
echo [3/3] Building and Deploying Frontend...
echo    NOTE: Frontend is deployed via GitHub Actions on push to master.
echo    Building locally to verify the build succeeds...

pushd %FRONTEND_DIR%
call npm run build
if errorlevel 1 (
    echo    ERROR: Frontend build failed.
    popd
    pause
    exit /b 1
)
popd
echo    OK: Frontend build succeeded.
echo.
echo    To deploy frontend: git add, commit, and push to master.
echo    GitHub Actions will auto-deploy to Azure Static Web Apps.

echo.
echo ========================================
echo   All deployments completed successfully!
echo ========================================
echo.
echo    Backend:  https://%APP_NAME%.azurewebsites.net/api/health
echo    Frontend: Check your Static Web Apps URL
echo.
pause
