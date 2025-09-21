@echo off
echo 🔧 Fixing Dockerfile.dev Poetry install commands...

set SERVICES_DIR=touriquest-backend\services

REM List of all services
set SERVICES=admin-service ai-service analytics-service api-gateway auth-service booking-service communication-service experience-service integrations-service media-service monitoring-service notification-service poi-service property-service recommendation-service

echo 🔍 Updating Poetry install commands in Dockerfile.dev files...

for %%s in (%SERVICES%) do (
    set dockerfile=%SERVICES_DIR%\%%s\Dockerfile.dev
    if exist "!dockerfile!" (
        echo    Fixing %%s...
        powershell -Command "(Get-Content '!dockerfile!') -replace '--with dev', '--with dev' | Set-Content '!dockerfile!'"
        echo    ✅ Fixed %%s
    ) else (
        echo    ⚠️  !dockerfile! not found
    )
)

echo.
echo ✅ All Dockerfile.dev files updated!
echo 🐳 You can now try building the services:
echo docker-compose -f docker-compose.dev.yml build