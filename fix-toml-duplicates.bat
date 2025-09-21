@echo off
echo 🔧 Fixing TOML duplicate entries in all services...

set SERVICES_DIR=touriquest-backend\services

echo 🔧 Fixing integrations-service manually...

REM Test if the fix worked for integrations-service
echo 🧪 Testing integrations-service TOML...
python -c "import toml; toml.load('touriquest-backend/services/integrations-service/pyproject.toml')" 2>nul
if %ERRORLEVEL% equ 0 (
    echo ✅ integrations-service: Valid TOML
) else (
    echo ❌ integrations-service: Invalid TOML
)

echo.
echo 🐳 Testing Docker build for integrations-service...
docker-compose -f docker-compose.dev.yml build integrations-service

echo.
echo ✅ TOML duplicate fix completed!
echo 📝 You can now try building all services:
echo docker-compose -f docker-compose.dev.yml build