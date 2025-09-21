#!/bin/bash

# Fix Poetry group dependencies across all microservices
# For WSL/Ubuntu

set -e

echo "🔧 Poetry Group Dependencies Fix Tool"
echo "======================================"

SERVICES_DIR="touriquest-backend/services"
SERVICES=(
    "admin-service" "ai-service" "analytics-service" "api-gateway"
    "auth-service" "booking-service" "communication-service"
    "experience-service" "integrations-service" "media-service"
    "monitoring-service" "notification-service" "poi-service"
    "property-service" "recommendation-service"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Standard dev dependencies to add
DEV_DEPENDENCIES='
# Code quality and testing
pytest = "^7.4.3"
pytest-asyncio = "^0.21.1"
pytest-cov = "^4.1.0"
pytest-mock = "^3.12.0"
black = "^23.11.0"
isort = "^5.12.0"
flake8 = "^6.1.0"
mypy = "^1.7.1"
bandit = "^1.7.5"
pre-commit = "^3.5.0"

# Development tools
httpx = "^0.26.0"
faker = "^20.1.0"'

fix_service() {
    local service=$1
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    local dockerfile="$SERVICES_DIR/$service/Dockerfile.dev"
    
    echo -e "\n${BLUE}🔧 Fixing $service...${NC}"
    
    if [ ! -f "$pyproject_file" ]; then
        echo -e "  ${RED}❌ pyproject.toml not found - skipping${NC}"
        return 1
    fi
    
    # Create backup
    cp "$pyproject_file" "$pyproject_file.backup"
    echo -e "  💾 Created backup: $pyproject_file.backup"
    
    # Fix package-mode if not set
    if ! grep -q "package-mode = false" "$pyproject_file"; then
        echo -e "  🔧 Adding package-mode = false"
        # Add package-mode = false after readme line
        sed -i '/^readme = /a package-mode = false' "$pyproject_file"
    fi
    
    # Add dev group if missing
    if ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
        echo -e "  🔧 Adding dev group dependencies"
        
        # Add dev group at the end of the file
        cat >> "$pyproject_file" << EOF

[tool.poetry.group.dev.dependencies]$DEV_DEPENDENCIES
EOF
    fi
    
    # Fix Dockerfile to only use --with dev (not test)
    if [ -f "$dockerfile" ]; then
        if grep -q -- "--with dev,test" "$dockerfile"; then
            echo -e "  🐋 Fixing Dockerfile.dev to use --with dev only"
            sed -i 's/--with dev,test/--with dev/g' "$dockerfile"
        fi
        
        # Also handle case where only --with test is used
        if grep -q -- "--with test" "$dockerfile" && ! grep -q -- "--with dev" "$dockerfile"; then
            echo -e "  🐋 Fixing Dockerfile.dev to use --with dev instead of test"
            sed -i 's/--with test/--with dev/g' "$dockerfile"
        fi
    fi
    
    # Validate TOML syntax
    if command -v python3 &> /dev/null; then
        if python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
            echo -e "  ✅ TOML syntax validated"
        else
            echo -e "  ${RED}❌ TOML syntax error - restoring backup${NC}"
            cp "$pyproject_file.backup" "$pyproject_file"
            return 1
        fi
    fi
    
    echo -e "  ${GREEN}✅ Successfully fixed $service${NC}"
}

# Main fix loop
echo -e "\n🔧 Starting fix process for all services...\n"

fixed_count=0
error_count=0

for service in "${SERVICES[@]}"; do
    if fix_service "$service"; then
        ((fixed_count++))
    else
        ((error_count++))
    fi
done

echo -e "\n${BLUE}📊 Fix Summary:${NC}"
echo "=================="
echo -e "✅ Successfully fixed: ${GREEN}$fixed_count${NC} services"
echo -e "❌ Errors encountered: ${RED}$error_count${NC} services"

if [ $error_count -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All services fixed successfully!${NC}"
    echo -e "\n🐳 You can now try building the services:"
    echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
else
    echo -e "\n${YELLOW}⚠️  Some services had errors. Check the output above.${NC}"
    echo -e "💾 Backups are available as .backup files"
fi

echo -e "\n🔍 Run diagnose-poetry-groups.sh to verify the fixes"