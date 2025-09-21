@echo off
REM =============================================================================
REM TouriQuest - Docker Configuration Test Script
REM =============================================================================

echo.
echo ===============================================
echo   TouriQuest Docker Configuration Test
echo ===============================================
echo.

set COMPOSE_FILE=docker-compose.dev.FIXED.yml
set ERROR_COUNT=0

REM Check if Docker is running
echo [1/10] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running
    echo Please start Docker Desktop and try again.
    set /a ERROR_COUNT+=1
    goto :summary
) else (
    echo ✅ Docker is running
)

REM Check if compose file exists
echo [2/10] Checking Docker Compose file...
if not exist "%COMPOSE_FILE%" (
    echo ❌ Docker Compose file %COMPOSE_FILE% not found
    echo Please ensure the fixed compose file exists.
    set /a ERROR_COUNT+=1
    goto :summary
) else (
    echo ✅ Docker Compose file found
)

REM Validate Docker Compose syntax
echo [3/10] Validating Docker Compose syntax...
docker compose -f %COMPOSE_FILE% config >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose file has syntax errors
    echo Running detailed validation...
    docker compose -f %COMPOSE_FILE% config
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Docker Compose syntax is valid
)

REM Check service directories
echo [4/10] Checking service directories...
set MISSING_DIRS=0

if not exist "touriquest-backend\services\api-gateway" (
    echo ❌ Missing: touriquest-backend\services\api-gateway
    set /a MISSING_DIRS+=1
)

if not exist "touriquest-backend\services\auth-service" (
    echo ❌ Missing: touriquest-backend\services\auth-service
    set /a MISSING_DIRS+=1
)

if not exist "touriquest-backend\services\user-service" (
    echo ❌ Missing: touriquest-backend\services\user-service
    set /a MISSING_DIRS+=1
)

if not exist "touriquest-backend\services\property-service" (
    echo ❌ Missing: touriquest-backend\services\property-service
    set /a MISSING_DIRS+=1
)

if not exist "touriquest-backend\services\poi-service" (
    echo ❌ Missing: touriquest-backend\services\poi-service
    set /a MISSING_DIRS+=1
)

if not exist "frontend" (
    echo ❌ Missing: frontend
    set /a MISSING_DIRS+=1
)

if %MISSING_DIRS% equ 0 (
    echo ✅ All required service directories exist
) else (
    echo ❌ %MISSING_DIRS% service directories are missing
    set /a ERROR_COUNT+=1
)

REM Check for Dockerfile.dev files
echo [5/10] Checking Dockerfile.dev files...
set MISSING_DOCKERFILES=0

if not exist "touriquest-backend\services\api-gateway\Dockerfile.dev" (
    echo ❌ Missing: api-gateway Dockerfile.dev
    set /a MISSING_DOCKERFILES+=1
)

if not exist "touriquest-backend\services\auth-service\Dockerfile.dev" (
    echo ❌ Missing: auth-service Dockerfile.dev
    set /a MISSING_DOCKERFILES+=1
)

if not exist "touriquest-backend\services\user-service\Dockerfile.dev" (
    echo ❌ Missing: user-service Dockerfile.dev
    set /a MISSING_DOCKERFILES+=1
)

if not exist "frontend\Dockerfile.dev" (
    echo ❌ Missing: frontend Dockerfile.dev
    set /a MISSING_DOCKERFILES+=1
)

if %MISSING_DOCKERFILES% equ 0 (
    echo ✅ All Dockerfile.dev files exist
) else (
    echo ⚠️  %MISSING_DOCKERFILES% Dockerfile.dev files are missing
    echo Run 'generate-dockerfiles.bat' to create them
)

REM Check port availability
echo [6/10] Checking port availability...
set PORTS_IN_USE=0

netstat -an | findstr ":3000" >nul && (
    echo ❌ Port 3000 is already in use (Frontend)
    set /a PORTS_IN_USE+=1
)

netstat -an | findstr ":8000" >nul && (
    echo ❌ Port 8000 is already in use (API Gateway)
    set /a PORTS_IN_USE+=1
)

netstat -an | findstr ":5432" >nul && (
    echo ❌ Port 5432 is already in use (PostgreSQL)
    set /a PORTS_IN_USE+=1
)

netstat -an | findstr ":6379" >nul && (
    echo ❌ Port 6379 is already in use (Redis)
    set /a PORTS_IN_USE+=1
)

if %PORTS_IN_USE% equ 0 (
    echo ✅ All required ports are available
) else (
    echo ⚠️  %PORTS_IN_USE% ports are already in use
    echo This may cause conflicts when starting services
)

REM Check environment file
echo [7/10] Checking environment configuration...
if not exist ".env.dev" (
    echo ⚠️  .env.dev file not found
    echo Creating default .env.dev file...
    echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/touriquest_dev > .env.dev
    echo REDIS_URL=redis://localhost:6379/0 >> .env.dev
    echo JWT_SECRET_KEY=dev-secret-key-change-in-production >> .env.dev
    echo ENVIRONMENT=development >> .env.dev
    echo DEBUG=true >> .env.dev
    echo LOG_LEVEL=DEBUG >> .env.dev
    echo ✅ Default .env.dev file created
) else (
    echo ✅ .env.dev file exists
)

REM Check shared directory
echo [8/10] Checking shared modules...
if not exist "shared" (
    echo ⚠️  Shared directory not found
    echo Creating shared directory structure...
    mkdir shared
    mkdir shared\database
    mkdir shared\messaging
    mkdir shared\security
    mkdir shared\monitoring
    echo # Shared modules for TouriQuest microservices > shared\__init__.py
    echo ✅ Shared directory structure created
) else (
    echo ✅ Shared directory exists
)

REM Test Docker Compose dry run
echo [9/10] Testing Docker Compose dry run...
docker compose -f %COMPOSE_FILE% config --quiet
if %errorlevel% neq 0 (
    echo ❌ Docker Compose configuration has issues
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Docker Compose configuration looks good
)

REM Check available disk space
echo [10/10] Checking disk space...
for /f "tokens=3" %%a in ('dir /-c "%CD%" 2^>nul ^| findstr "bytes free"') do set FREE_SPACE=%%a
if defined FREE_SPACE (
    echo ✅ Disk space check complete
) else (
    echo ⚠️  Unable to check disk space
)

:summary
echo.
echo ===============================================
echo   Test Summary
echo ===============================================

if %ERROR_COUNT% equ 0 (
    echo.
    echo 🎉 SUCCESS: Docker configuration is ready!
    echo.
    echo ✅ All critical checks passed
    echo ✅ Ready to start development environment
    echo.
    echo 🚀 Next steps:
    echo 1. Run: docker compose -f %COMPOSE_FILE% up -d
    echo 2. Wait for all services to be healthy
    echo 3. Visit http://localhost:3000 for frontend
    echo 4. Visit http://localhost:8000/docs for API docs
    echo.
) else (
    echo.
    echo ❌ FAILED: %ERROR_COUNT% critical issues found
    echo.
    echo 🔧 Issues that need to be fixed:
    echo - Check Docker installation and status
    echo - Verify all service directories exist
    echo - Ensure Docker Compose file syntax is correct
    echo - Resolve any port conflicts
    echo.
    echo 📝 Recommendations:
    echo 1. Fix the issues listed above
    echo 2. Run this test script again
    echo 3. Only proceed when all checks pass
    echo.
)

echo 📊 Detailed Results:
echo - Docker Status: %DOCKER_STATUS%
echo - Missing Directories: %MISSING_DIRS%
echo - Missing Dockerfiles: %MISSING_DOCKERFILES%
echo - Ports in Use: %PORTS_IN_USE%
echo - Critical Errors: %ERROR_COUNT%
echo.

:end
pause