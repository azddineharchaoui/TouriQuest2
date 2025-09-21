#!/usr/bin/env pwsh

# Check which services are missing pyproject.toml files
$servicesPath = "./touriquest-backend/services"
$services = Get-ChildItem -Path $servicesPath -Directory

$missingServices = @()

foreach ($service in $services) {
    $pyprojectPath = Join-Path $service.FullName "pyproject.toml"
    if (-not (Test-Path $pyprojectPath)) {
        $missingServices += $service.Name
        Write-Host "Missing pyproject.toml: $($service.Name)" -ForegroundColor Red
    } else {
        Write-Host "Has pyproject.toml: $($service.Name)" -ForegroundColor Green
    }
}

Write-Host "`nServices missing pyproject.toml: $($missingServices -join ', ')" -ForegroundColor Yellow

# Template for pyproject.toml
$template = @'
[tool.poetry]
name = "{SERVICE_NAME}"
version = "1.0.0"
description = "TouriQuest {SERVICE_TITLE} - {SERVICE_DESCRIPTION}"
authors = ["TouriQuest Team <dev@touriquest.com>"]
readme = "README.md"
packages = [{{include = "app"}}]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = {{extras = ["standard"], version = "^0.24.0"}}
sqlalchemy = "^2.0.23"
asyncpg = "^0.29.0"
alembic = "^1.12.1"
redis = "^5.0.1"
pydantic = {{extras = ["email"], version = "^2.5.0"}}
pydantic-settings = "^2.1.0"
python-jose = {{extras = ["cryptography"], version = "^3.3.0"}}
passlib = {{extras = ["bcrypt"], version = "^1.7.4"}}
python-multipart = "^0.0.6"
httpx = "^0.25.2"
structlog = "^23.2.0"
prometheus-client = "^0.19.0"
aioredis = "^2.0.1"
python-dateutil = "^2.8.2"
pytz = "^2023.3"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.3"
pytest-asyncio = "^0.21.1"
pytest-cov = "^4.1.0"
black = "^23.11.0"
isort = "^5.12.0"
flake8 = "^6.1.0"
mypy = "^1.7.1"
pre-commit = "^3.6.0"
watchdog = "^3.0.0"
httpx = "^0.25.2"

[tool.poetry.group.test.dependencies]
pytest-mock = "^3.12.0"
factory-boy = "^3.3.0"
faker = "^20.1.0"
pytest-benchmark = "^4.0.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.black]
line-length = 88
target-version = ['py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
known_first_party = ["app"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true

[tool.pytest.ini_options]
minversion = "7.0"
addopts = "-ra -q --strict-markers --strict-config"
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "slow: Slow running tests",
]
'@

# Service descriptions
$serviceDescriptions = @{
    "booking-service" = @{
        title = "Booking Service"
        description = "Handle reservations, bookings, and payment processing"
    }
    "notification-service" = @{
        title = "Notification Service"
        description = "Send notifications via email, SMS, and push"
    }
    "recommendation-service" = @{
        title = "Recommendation Service"
        description = "AI-powered travel recommendations and personalization"
    }
    "user-service" = @{
        title = "User Service"
        description = "User management, profiles, and preferences"
    }
}

# Create pyproject.toml for missing services
foreach ($serviceName in $missingServices) {
    $serviceInfo = $serviceDescriptions[$serviceName]
    if (-not $serviceInfo) {
        $serviceInfo = @{
            title = ($serviceName -replace "-", " " | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) })
            description = "TouriQuest microservice"
        }
    }
    
    $content = $template -replace "{SERVICE_NAME}", $serviceName
    $content = $content -replace "{SERVICE_TITLE}", $serviceInfo.title
    $content = $content -replace "{SERVICE_DESCRIPTION}", $serviceInfo.description
    
    $outputPath = Join-Path $servicesPath $serviceName "pyproject.toml"
    Set-Content -Path $outputPath -Value $content -Encoding utf8
    Write-Host "Created: $outputPath" -ForegroundColor Green
}

Write-Host "`nAll missing pyproject.toml files have been created!" -ForegroundColor Green