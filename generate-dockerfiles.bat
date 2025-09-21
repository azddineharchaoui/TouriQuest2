@echo off
REM =============================================================================
REM TouriQuest - Generate Missing Development Dockerfiles
REM =============================================================================

echo.
echo ===============================================
echo   Generating Missing Development Dockerfiles
echo ===============================================
echo.

set SERVICES_DIR=touriquest-backend\services
set TEMPLATE_FILE=DOCKERFILE_TEMPLATE.dev

if not exist "%TEMPLATE_FILE%" (
    echo ❌ Template file %TEMPLATE_FILE% not found!
    echo Please ensure the template file exists.
    goto :end
)

echo [1/16] Creating Dockerfile.dev for auth-service...
if not exist "%SERVICES_DIR%\auth-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\auth-service\Dockerfile.dev"
    echo EXPOSE 8001 >> "%SERVICES_DIR%\auth-service\Dockerfile.dev.tmp"
    echo CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"] >> "%SERVICES_DIR%\auth-service\Dockerfile.dev.tmp"
    move "%SERVICES_DIR%\auth-service\Dockerfile.dev.tmp" "%SERVICES_DIR%\auth-service\Dockerfile.dev"
    echo ✅ auth-service Dockerfile.dev created
) else (
    echo ⚠️  auth-service Dockerfile.dev already exists
)

echo [2/16] Creating Dockerfile.dev for user-service...
if not exist "%SERVICES_DIR%\user-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\user-service\Dockerfile.dev"
    echo ✅ user-service Dockerfile.dev created
) else (
    echo ⚠️  user-service Dockerfile.dev already exists
)

echo [3/16] Creating Dockerfile.dev for property-service...
if not exist "%SERVICES_DIR%\property-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\property-service\Dockerfile.dev"
    echo ✅ property-service Dockerfile.dev created
) else (
    echo ⚠️  property-service Dockerfile.dev already exists
)

echo [4/16] Creating Dockerfile.dev for poi-service...
if not exist "%SERVICES_DIR%\poi-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\poi-service\Dockerfile.dev"
    echo ✅ poi-service Dockerfile.dev created
) else (
    echo ⚠️  poi-service Dockerfile.dev already exists
)

echo [5/16] Creating Dockerfile.dev for booking-service...
if not exist "%SERVICES_DIR%\booking-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\booking-service\Dockerfile.dev"
    echo ✅ booking-service Dockerfile.dev created
) else (
    echo ⚠️  booking-service Dockerfile.dev already exists
)

echo [6/16] Creating Dockerfile.dev for experience-service...
if not exist "%SERVICES_DIR%\experience-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\experience-service\Dockerfile.dev"
    echo ✅ experience-service Dockerfile.dev created
) else (
    echo ⚠️  experience-service Dockerfile.dev already exists
)

echo [7/16] Creating Dockerfile.dev for media-service...
if not exist "%SERVICES_DIR%\media-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\media-service\Dockerfile.dev"
    echo ✅ media-service Dockerfile.dev created
) else (
    echo ⚠️  media-service Dockerfile.dev already exists
)

echo [8/16] Creating Dockerfile.dev for notification-service...
if not exist "%SERVICES_DIR%\notification-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\notification-service\Dockerfile.dev"
    echo ✅ notification-service Dockerfile.dev created
) else (
    echo ⚠️  notification-service Dockerfile.dev already exists
)

echo [9/16] Creating Dockerfile.dev for analytics-service...
if not exist "%SERVICES_DIR%\analytics-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\analytics-service\Dockerfile.dev"
    echo ✅ analytics-service Dockerfile.dev created
) else (
    echo ⚠️  analytics-service Dockerfile.dev already exists
)

echo [10/16] Creating Dockerfile.dev for admin-service...
if not exist "%SERVICES_DIR%\admin-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\admin-service\Dockerfile.dev"
    echo ✅ admin-service Dockerfile.dev created
) else (
    echo ⚠️  admin-service Dockerfile.dev already exists
)

echo [11/16] Creating Dockerfile.dev for communication-service...
if not exist "%SERVICES_DIR%\communication-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\communication-service\Dockerfile.dev"
    echo ✅ communication-service Dockerfile.dev created
) else (
    echo ⚠️  communication-service Dockerfile.dev already exists
)

echo [12/16] Creating Dockerfile.dev for integrations-service...
if not exist "%SERVICES_DIR%\integrations-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\integrations-service\Dockerfile.dev"
    echo ✅ integrations-service Dockerfile.dev created
) else (
    echo ⚠️  integrations-service Dockerfile.dev already exists
)

echo [13/16] Creating Dockerfile.dev for monitoring-service...
if not exist "%SERVICES_DIR%\monitoring-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\monitoring-service\Dockerfile.dev"
    echo ✅ monitoring-service Dockerfile.dev created
) else (
    echo ⚠️  monitoring-service Dockerfile.dev already exists
)

echo [14/16] Creating Dockerfile.dev for recommendation-service...
if not exist "%SERVICES_DIR%\recommendation-service\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\recommendation-service\Dockerfile.dev"
    echo ✅ recommendation-service Dockerfile.dev created
) else (
    echo ⚠️  recommendation-service Dockerfile.dev already exists
)

echo [15/16] Creating Dockerfile.dev for frontend...
if not exist "frontend\Dockerfile.dev" (
    echo # Frontend Development Dockerfile > frontend\Dockerfile.dev
    echo FROM node:18-alpine >> frontend\Dockerfile.dev
    echo. >> frontend\Dockerfile.dev
    echo WORKDIR /app >> frontend\Dockerfile.dev
    echo. >> frontend\Dockerfile.dev
    echo COPY package*.json ./ >> frontend\Dockerfile.dev
    echo RUN npm install >> frontend\Dockerfile.dev
    echo. >> frontend\Dockerfile.dev
    echo COPY . . >> frontend\Dockerfile.dev
    echo. >> frontend\Dockerfile.dev
    echo EXPOSE 3000 >> frontend\Dockerfile.dev
    echo. >> frontend\Dockerfile.dev
    echo CMD ["npm", "run", "dev"] >> frontend\Dockerfile.dev
    echo ✅ frontend Dockerfile.dev created
) else (
    echo ⚠️  frontend Dockerfile.dev already exists
)

echo [16/16] Creating API Gateway Dockerfile.dev...
if not exist "%SERVICES_DIR%\api-gateway\Dockerfile.dev" (
    copy "%TEMPLATE_FILE%" "%SERVICES_DIR%\api-gateway\Dockerfile.dev"
    echo ✅ api-gateway Dockerfile.dev created
) else (
    echo ⚠️  api-gateway Dockerfile.dev already exists
)

echo.
echo ===============================================
echo   Dockerfile Generation Complete! 🎉
echo ===============================================
echo.
echo All missing development Dockerfiles have been created.
echo.
echo 📝 Next Steps:
echo 1. Review and customize each Dockerfile.dev for service-specific needs
echo 2. Update port numbers in each Dockerfile.dev to match the service
echo 3. Test the Docker Compose configuration with: docker-compose -f docker-compose.dev.FIXED.yml up
echo.
echo 💡 Note: You may need to customize each Dockerfile.dev for specific:
echo    - Port numbers (8001, 8002, 8003, etc.)
echo    - Service-specific dependencies
echo    - Environment variables
echo    - Health check endpoints
echo.

:end
pause