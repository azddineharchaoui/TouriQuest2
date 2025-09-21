#!/bin/bash

# Media Service Dependency Fix Script
# For WSL/Ubuntu

set -e

echo "🔧 Media Service Dependency Fix"
echo "==============================="

MEDIA_SERVICE_DIR="touriquest-backend/services/media-service"
PYPROJECT_FILE="$MEDIA_SERVICE_DIR/pyproject.toml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Analyzing dependency issues...${NC}"

# Backup current file
cp "$PYPROJECT_FILE" "$PYPROJECT_FILE.dep-fix.backup"
echo -e "💾 Created backup: $PYPROJECT_FILE.dep-fix.backup"

# Create a minimal, working version of media-service pyproject.toml
echo -e "${BLUE}🔧 Creating minimal working pyproject.toml...${NC}"

cat > "$PYPROJECT_FILE" << 'EOF'
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
EOF

echo -e "✅ Created minimal media-service configuration"

# Test the new configuration
echo -e "\n${BLUE}🧪 Testing new configuration...${NC}"

if python3 -c "
import tomllib
try:
    with open('$PYPROJECT_FILE', 'rb') as f:
        data = tomllib.load(f)
    print('✅ TOML syntax is valid')
except Exception as e:
    print(f'❌ TOML syntax error: {e}')
    exit(1)
" 2>/dev/null; then
    echo -e "${GREEN}✅ TOML validation passed${NC}"
else
    echo -e "${RED}❌ TOML validation failed${NC}"
    # Restore backup
    cp "$PYPROJECT_FILE.dep-fix.backup" "$PYPROJECT_FILE"
    exit 1
fi

# Test Docker build
echo -e "\n${BLUE}🐳 Testing Docker build with minimal dependencies...${NC}"

if docker-compose -f docker-compose.dev.yml build media-service; then
    echo -e "\n${GREEN}🎉 media-service builds successfully with minimal dependencies!${NC}"
    
    echo -e "\n${BLUE}📝 Next steps:${NC}"
    echo -e "1. ${GREEN}Success!${NC} The service now builds with essential dependencies"
    echo -e "2. You can add more dependencies gradually as needed:"
    echo -e "   - boto3 for AWS S3"
    echo -e "   - celery for background tasks"
    echo -e "   - opencv-python for image processing"
    echo -e "   - ffmpeg-python for video processing"
    echo -e "   - nltk/textblob for text processing"
    echo -e "3. Test other services: ${YELLOW}./test-docker-builds.sh${NC}"
    echo -e "4. Build all services: ${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
    
else
    echo -e "\n${RED}❌ Build still failed with minimal dependencies${NC}"
    echo -e "Restoring backup..."
    cp "$PYPROJECT_FILE.dep-fix.backup" "$PYPROJECT_FILE"
    
    echo -e "\n${YELLOW}💡 Debug steps:${NC}"
    echo -e "1. Check Poetry version: ${YELLOW}docker run --rm python:3.11-slim pip show poetry${NC}"
    echo -e "2. Try building with no dependencies: remove all from pyproject.toml"
    echo -e "3. Check Docker logs: ${YELLOW}docker-compose -f docker-compose.dev.yml logs media-service${NC}"
    
    exit 1
fi
EOF

echo -e "\n${BLUE}💾 Backup files created:${NC}"
echo -e "- $PYPROJECT_FILE.dep-fix.backup (original with all dependencies)"
echo -e "- Current file: minimal working version"