#!/bin/bash

# Diagnostic script to check Poetry group dependencies across all microservices
# For WSL/Ubuntu

set -e

echo "🔍 Poetry Group Dependencies Diagnostic Tool"
echo "============================================="

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

check_service() {
    local service=$1
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    local dockerfile="$SERVICES_DIR/$service/Dockerfile.dev"
    
    echo -e "\n${BLUE}📋 Checking $service...${NC}"
    
    if [ ! -f "$pyproject_file" ]; then
        echo -e "  ${RED}❌ pyproject.toml not found${NC}"
        return 1
    fi
    
    if [ ! -f "$dockerfile" ]; then
        echo -e "  ${RED}❌ Dockerfile.dev not found${NC}"
        return 1
    fi
    
    # Check what Poetry install command is used in Dockerfile
    local poetry_install_line=$(grep "poetry install" "$dockerfile" || echo "")
    echo -e "  🐋 Dockerfile poetry install: ${YELLOW}$poetry_install_line${NC}"
    
    # Check if dev group exists in pyproject.toml
    if grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
        echo -e "  ✅ Dev group found in pyproject.toml"
    else
        echo -e "  ${RED}❌ Dev group NOT found in pyproject.toml${NC}"
    fi
    
    # Check if test group exists in pyproject.toml
    if grep -q "\[tool\.poetry\.group\.test\.dependencies\]" "$pyproject_file"; then
        echo -e "  ✅ Test group found in pyproject.toml"
    else
        echo -e "  ${YELLOW}⚠️  Test group NOT found in pyproject.toml${NC}"
    fi
    
    # Check package-mode setting
    if grep -q "package-mode = false" "$pyproject_file"; then
        echo -e "  ✅ Package mode disabled"
    else
        echo -e "  ${YELLOW}⚠️  Package mode not explicitly disabled${NC}"
    fi
    
    # Try to validate TOML syntax (if python3 is available)
    if command -v python3 &> /dev/null; then
        if python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
            echo -e "  ✅ Valid TOML syntax"
        else
            echo -e "  ${RED}❌ Invalid TOML syntax${NC}"
        fi
    fi
}

# Main diagnostic loop
echo -e "\n🔍 Starting diagnostic check for all services...\n"

for service in "${SERVICES[@]}"; do
    check_service "$service"
done

echo -e "\n${BLUE}📊 Summary of Issues Found:${NC}"
echo "==============================="

# Count services with missing dev groups
missing_dev_count=0
missing_test_count=0
invalid_toml_count=0

for service in "${SERVICES[@]}"; do
    pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    
    if [ -f "$pyproject_file" ]; then
        if ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
            ((missing_dev_count++))
        fi
        
        if ! grep -q "\[tool\.poetry\.group\.test\.dependencies\]" "$pyproject_file"; then
            ((missing_test_count++))
        fi
        
        if command -v python3 &> /dev/null; then
            if ! python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
                ((invalid_toml_count++))
            fi
        fi
    fi
done

echo -e "📈 Services missing dev group: ${RED}$missing_dev_count${NC}"
echo -e "📈 Services missing test group: ${YELLOW}$missing_test_count${NC}"
echo -e "📈 Services with invalid TOML: ${RED}$invalid_toml_count${NC}"

if [ $missing_dev_count -gt 0 ] || [ $invalid_toml_count -gt 0 ]; then
    echo -e "\n${YELLOW}💡 Run fix-poetry-groups.sh to fix these issues${NC}"
else
    echo -e "\n${GREEN}✅ All services have proper Poetry configuration!${NC}"
fi