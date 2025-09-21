@echo off
echo Testing Docker configuration...

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not available in PATH
    echo Please make sure Docker Desktop is installed and running
    echo You may need to restart your terminal after Docker installation
    exit /b 1
)

echo Docker is available: 
docker --version

echo.
echo Testing docker-compose configuration...
docker compose -f docker-compose.dev.yml config --quiet
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose configuration is invalid
    echo Running detailed validation...
    docker compose -f docker-compose.dev.yml config
    exit /b 1
) else (
    echo ✅ Docker Compose configuration is valid!
)

echo.
echo Testing if we can build api-gateway service...
docker compose -f docker-compose.dev.yml build api-gateway
if %errorlevel% neq 0 (
    echo ERROR: Failed to build api-gateway service
    exit /b 1
) else (
    echo ✅ API Gateway service built successfully!
)

echo.
echo ✅ All tests passed! Your Docker configuration is working correctly.
pause