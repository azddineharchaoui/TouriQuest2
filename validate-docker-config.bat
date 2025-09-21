@echo off
echo =============================================================================
echo   TouriQuest Docker Configuration Validation
echo =============================================================================
echo.

set ERROR_COUNT=0

echo [1/3] Checking required files...

REM Check docker-compose.dev.yml
if exist "docker-compose.dev.yml" (
    echo ✅ docker-compose.dev.yml exists
) else (
    echo ❌ docker-compose.dev.yml is missing
    set /a ERROR_COUNT+=1
)

REM Check if pyproject.toml exists for all services
set SERVICES=api-gateway auth-service property-service poi-service booking-service experience-service ai-service media-service notification-service analytics-service admin-service communication-service integration-service monitoring-service recommendation-service

echo.
echo [2/3] Checking pyproject.toml files for all services...

for %%s in (%SERVICES%) do (
    if exist "touriquest-backend\services\%%s\pyproject.toml" (
        echo ✅ %%s has pyproject.toml
    ) else (
        echo ❌ %%s is missing pyproject.toml
        set /a ERROR_COUNT+=1
    )
)

echo.
echo [3/3] Checking Dockerfile.dev files for all services...

for %%s in (%SERVICES%) do (
    if exist "touriquest-backend\services\%%s\Dockerfile.dev" (
        echo ✅ %%s has Dockerfile.dev
    ) else (
        echo ❌ %%s is missing Dockerfile.dev
        set /a ERROR_COUNT+=1
    )
)

echo.
echo =============================================================================
if %ERROR_COUNT% EQU 0 (
    echo ✅ All required files are present! Docker build should work now.
    echo.
    echo You can now run:
    echo   • test-docker-fix.bat - to test Docker configuration
    echo   • start-dev.bat - to start all services
) else (
    echo ❌ Found %ERROR_COUNT% missing files. Please create them before proceeding.
)
echo =============================================================================
echo.
pause