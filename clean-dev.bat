@echo off
REM =============================================================================
REM TouriQuest Development Environment - CLEAN SCRIPT
REM =============================================================================

echo.
echo ===============================================
echo   TouriQuest Development Environment
echo   CLEAN RESET - This will remove ALL data!
echo ===============================================
echo.

echo ⚠️  WARNING: This will permanently delete:
echo   • All Docker containers
echo   • All Docker volumes (database data)
echo   • All Docker images (will need to rebuild)
echo   • All logs and temporary files
echo   • Node modules and Python cache
echo.

set /p confirm="Are you sure you want to continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Clean operation cancelled.
    pause
    exit /b 0
)

echo.
echo Last chance! This action cannot be undone.
set /p final_confirm="Type 'DELETE' to confirm: "
if not "%final_confirm%"=="DELETE" (
    echo Clean operation cancelled.
    pause
    exit /b 0
)

echo.
echo ===============================================
echo   🧹 Starting clean operation...
echo ===============================================

REM Check if Docker is running
echo [1/8] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop first.
    pause
    exit /b 1
)
echo ✓ Docker is running

REM Stop all containers first
echo [2/8] Stopping all TouriQuest containers...
set COMPOSE_PROJECT_NAME=touriquest-dev
docker compose -f docker-compose.dev.yml down --timeout 30
echo ✓ All containers stopped

REM Remove all TouriQuest containers
echo [3/8] Removing all TouriQuest containers...
for /f "tokens=1" %%i in ('docker ps -a --filter "name=touriquest" --format "{{.Names}}"') do (
    echo Removing container: %%i
    docker rm -f %%i >nul 2>&1
)
echo ✓ Containers removed

REM Remove all TouriQuest volumes
echo [4/8] Removing all TouriQuest volumes...
docker compose -f docker-compose.dev.yml down -v
for /f "tokens=1" %%i in ('docker volume ls --filter "name=touriquest" --format "{{.Name}}"') do (
    echo Removing volume: %%i
    docker volume rm %%i >nul 2>&1
)
echo ✓ Volumes removed

REM Remove all TouriQuest images
echo [5/8] Removing all TouriQuest images...
for /f "tokens=1" %%i in ('docker images --filter "reference=touriquest*" --format "{{.Repository}}:{{.Tag}}"') do (
    echo Removing image: %%i
    docker rmi %%i >nul 2>&1
)
echo ✓ Images removed

REM Clean up build cache
echo [6/8] Cleaning Docker build cache...
docker builder prune -f >nul 2>&1
echo ✓ Build cache cleaned

REM Clean up frontend dependencies and build artifacts
echo [7/8] Cleaning frontend dependencies...
if exist "frontend\node_modules" (
    echo Removing frontend/node_modules...
    rmdir /s /q "frontend\node_modules" >nul 2>&1
)
if exist "frontend\dist" (
    echo Removing frontend/dist...
    rmdir /s /q "frontend\dist" >nul 2>&1
)
if exist "frontend\.vite" (
    echo Removing frontend/.vite...
    rmdir /s /q "frontend\.vite" >nul 2>&1
)
echo ✓ Frontend cleaned

REM Clean up Python cache and virtual environments
echo [8/8] Cleaning Python cache...
if exist "__pycache__" rmdir /s /q "__pycache__" >nul 2>&1
if exist ".pytest_cache" rmdir /s /q ".pytest_cache" >nul 2>&1
if exist "htmlcov" rmdir /s /q "htmlcov" >nul 2>&1
if exist ".coverage" del ".coverage" >nul 2>&1
if exist "coverage.xml" del "coverage.xml" >nul 2>&1
if exist "junit.xml" del "junit.xml" >nul 2>&1

REM Find and remove all __pycache__ directories
for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" >nul 2>&1
for /d /r . %%d in (.pytest_cache) do @if exist "%%d" rmdir /s /q "%%d" >nul 2>&1

REM Clean Poetry virtual environment
if exist ".venv" (
    echo Removing Poetry virtual environment...
    rmdir /s /q ".venv" >nul 2>&1
)

echo ✓ Python cache cleaned

REM Clean up logs and temporary files
if exist "logs" rmdir /s /q "logs" >nul 2>&1
if exist "data" rmdir /s /q "data" >nul 2>&1
if exist "uploads" rmdir /s /q "uploads" >nul 2>&1
if exist "tmp" rmdir /s /q "tmp" >nul 2>&1

echo.
echo ===============================================
echo   ✅ Clean operation completed!
echo ===============================================
echo.
echo 🧹 What was cleaned:
echo   • All Docker containers and images
echo   • All Docker volumes and data
echo   • Frontend node_modules and build files
echo   • Python cache and virtual environments
echo   • Logs and temporary files
echo.
echo 🔄 Next steps to rebuild:
echo   1. Run: start-dev.bat
echo   2. Or manually:
echo      • docker compose -f docker-compose.dev.yml build
echo      • cd frontend && npm install
echo      • poetry install (for Python backend)
echo.
echo 💡 Tip: First startup after clean will take longer
echo    as everything needs to be downloaded and built.
echo.

REM Show system cleanup results
echo 📊 Docker system status:
docker system df

echo.
pause