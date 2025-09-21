Write-Host "🔧 Media Service Dependency Fix" -ForegroundColor Cyan
Write-Host "==============================="

$MediaServiceDir = "touriquest-backend\services\media-service"
$PyprojectFile = "$MediaServiceDir\pyproject.toml"

Write-Host "🔍 Analyzing dependency issues..." -ForegroundColor Blue

# Backup current file
Copy-Item $PyprojectFile "$PyprojectFile.dep-fix.backup"
Write-Host "💾 Created backup: $PyprojectFile.dep-fix.backup" -ForegroundColor Green

Write-Host "🔧 Creating minimal working pyproject.toml..." -ForegroundColor Blue

# Create minimal configuration
$minimalConfig = @'
[tool.poetry]
name = "touriquest-media-service"
version = "1.0.0"
description = "TouriQuest Media Management and Content Processing Service"
authors = ["TouriQuest Team <dev@touriquest.com>"]
readme = "README.md"
package-mode = false

[tool.poetry.dependencies]
python = "^3.11"

# Core FastAPI stack
fastapi = "^0.104.0"
uvicorn = {extras = ["standard"], version = "^0.24.0"}
python-multipart = "^0.0.6"

# Database
sqlalchemy = "^2.0.0"
alembic = "^1.12.0"
asyncpg = "^0.29.0"

# Security and auth
python-jose = {extras = ["cryptography"], version = "^3.3.0"}
passlib = {extras = ["bcrypt"], version = "^1.7.4"}

# Configuration
pydantic = "^2.4.0"
pydantic-settings = "^2.0.0"
python-decouple = "^3.8"

# Basic media processing (minimal set)
pillow = "^10.0.0"
numpy = "^1.24.0"

# HTTP and utilities
httpx = "^0.25.0"
requests = "^2.31.0"
python-dateutil = "^2.8.2"

# Redis for caching
redis = "^5.0.0"

# Monitoring
prometheus-client = "^0.17.0"
structlog = "^23.1.0"

[tool.poetry.group.dev.dependencies]
# Testing
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
pytest-cov = "^4.1.0"
pytest-mock = "^3.11.0"

# Code quality
black = "^23.9.0"
isort = "^5.12.0"
flake8 = "^6.1.0"
mypy = "^1.6.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.isort]
profile = "black"
line_length = 100

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]
pythonpath = ["app"]
asyncio_mode = "auto"
'@

Set-Content -Path $PyprojectFile -Value $minimalConfig
Write-Host "✅ Created minimal media-service configuration" -ForegroundColor Green

Write-Host "`n🐳 Testing Docker build with minimal dependencies..." -ForegroundColor Blue

$buildResult = docker-compose -f docker-compose.dev.yml build media-service

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 media-service builds successfully with minimal dependencies!" -ForegroundColor Green
    
    Write-Host "`n📝 Next steps:" -ForegroundColor Blue
    Write-Host "1. Success! The service now builds with essential dependencies" -ForegroundColor Green
    Write-Host "2. You can add more dependencies gradually as needed:" -ForegroundColor Yellow
    Write-Host "   - boto3 for AWS S3"
    Write-Host "   - celery for background tasks"
    Write-Host "   - opencv-python for image processing"
    Write-Host "   - ffmpeg-python for video processing"
    Write-Host "   - nltk/textblob for text processing"
    Write-Host "3. Test other services or build all services" -ForegroundColor Yellow
    
} else {
    Write-Host "`n❌ Build still failed with minimal dependencies" -ForegroundColor Red
    Write-Host "Restoring backup..." -ForegroundColor Yellow
    Copy-Item "$PyprojectFile.dep-fix.backup" $PyprojectFile
    
    Write-Host "`n💡 Debug steps:" -ForegroundColor Yellow
    Write-Host "1. Check the error message above"
    Write-Host "2. Try with even fewer dependencies"
    Write-Host "3. Check Docker logs"
    
    exit 1
}

Write-Host "`n💾 Backup files:" -ForegroundColor Blue
Write-Host "- $PyprojectFile.dep-fix.backup (original with all dependencies)"
Write-Host "- Current file: minimal working version"