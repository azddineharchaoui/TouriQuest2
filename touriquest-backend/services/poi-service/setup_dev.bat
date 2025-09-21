@echo off
REM POI Service Development Setup Script for Windows

echo Setting up TouriQuest POI Service development environment...

REM Check if poetry is installed
poetry --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Poetry not found. Please install poetry first:
    echo https://python-poetry.org/docs/#installation
    exit /b 1
)

REM Check Python version
python --version 2>&1 | findstr /R "3\.(1[1-9]|[2-9][0-9])" >nul
if %errorlevel% neq 0 (
    echo Python 3.11+ is required. Please install from https://python.org
    exit /b 1
)

REM Create and activate virtual environment
echo Creating virtual environment...
poetry env use python
poetry install

REM Create necessary directories
echo Creating upload directories...
if not exist "uploads" mkdir uploads
if not exist "uploads\images" mkdir uploads\images
if not exist "uploads\images\originals" mkdir uploads\images\originals
if not exist "uploads\images\thumbnails" mkdir uploads\images\thumbnails
if not exist "uploads\images\processed" mkdir uploads\images\processed
if not exist "uploads\audio" mkdir uploads\audio
if not exist "uploads\video" mkdir uploads\video
if not exist "uploads\models" mkdir uploads\models
if not exist "uploads\temp" mkdir uploads\temp

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    (
        echo # Database
        echo DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/touriquest_poi
        echo.
        echo # Redis
        echo REDIS_URL=redis://localhost:6379/2
        echo.
        echo # Elasticsearch
        echo ELASTICSEARCH_URL=http://localhost:9200
        echo.
        echo # Media Storage
        echo MEDIA_UPLOAD_PATH=./uploads
        echo MEDIA_BASE_URL=http://localhost:8000/media
        echo MAX_UPLOAD_SIZE_MB=10
        echo.
        echo # Security ^(change in production!^)
        echo SECRET_KEY=your-secret-key-change-in-production
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo.
        echo # External APIs ^(optional^)
        echo GOOGLE_MAPS_API_KEY=
        echo OPENAI_API_KEY=
        echo AWS_ACCESS_KEY_ID=
        echo AWS_SECRET_ACCESS_KEY=
        echo.
        echo # Application
        echo DEBUG=true
        echo LOG_LEVEL=INFO
        echo ENVIRONMENT=development
    ) > .env
    echo Created .env file. Please update the values as needed.
)

echo.
echo Setup complete! Next steps:
echo 1. Update the .env file with your configuration
echo 2. Start the required services:
echo    - PostgreSQL with PostGIS: docker run --name postgres-postgis -e POSTGRES_PASSWORD=password -e POSTGRES_DB=touriquest_poi -p 5432:5432 -d postgis/postgis:15-3.3
echo    - Redis: docker run --name redis -p 6379:6379 -d redis:7-alpine
echo    - Elasticsearch: docker run --name elasticsearch -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" -e "xpack.security.enabled=false" -d elasticsearch:8.11.0
echo 3. Run database migrations: poetry run alembic upgrade head
echo 4. Start the development server: poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo API will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo Redoc Documentation: http://localhost:8000/redoc

pause