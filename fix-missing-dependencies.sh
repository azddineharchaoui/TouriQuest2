#!/bin/bash

# Fix Missing Dependencies Script
# Diagnoses and fixes common dependency issues across all services
# For WSL/Ubuntu

set -e

echo "🔧 Missing Dependencies Fix Tool"
echo "================================="

SERVICES_DIR="touriquest-backend/services"
SERVICES=(
    "admin-service" "ai-service" "analytics-service" "api-gateway"
    "auth-service" "booking-service" "communication-service"
    "experience-service" "integrations-service" "media-service"
    "monitoring-service" "notification-service" "poi-service"
    "property-service" "recommendation-service"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Common package replacements for non-existent packages
declare -A PACKAGE_REPLACEMENTS=(
    ["magic"]="python-magic"
    ["weather-api"]="pyowm"
    ["weather-service"]="pyowm"
    ["crypto"]="cryptography"
    ["PIL"]="pillow"
    ["cv2"]="opencv-python"
    ["sklearn"]="scikit-learn"
    ["jose"]="python-jose"
    ["multipart"]="python-multipart"
    ["decouple"]="python-decouple"
    ["dateutil"]="python-dateutil"
)

check_and_fix_service() {
    local service=$1
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    
    echo -e "\n${BLUE}🔍 Checking $service...${NC}"
    
    if [ ! -f "$pyproject_file" ]; then
        echo -e "  ${RED}❌ pyproject.toml not found${NC}"
        return 1
    fi
    
    # Create backup
    cp "$pyproject_file" "$pyproject_file.dep-check.backup"
    
    local fixed=false
    
    # Check for common problematic packages
    for bad_package in "${!PACKAGE_REPLACEMENTS[@]}"; do
        if grep -q "^$bad_package = " "$pyproject_file"; then
            local replacement="${PACKAGE_REPLACEMENTS[$bad_package]}"
            echo -e "  🔧 Replacing $bad_package with $replacement"
            sed -i "s/^$bad_package = /$replacement = /" "$pyproject_file"
            fixed=true
        fi
    done
    
    # Check for packages that commonly don't exist on PyPI
    local problematic_packages=(
        "weather-api" "magic" "crypto" "PIL" "cv2" "sklearn"
        "jose" "multipart" "decouple" "dateutil"
    )
    
    for pkg in "${problematic_packages[@]}"; do
        if grep -q "^$pkg = " "$pyproject_file"; then
            echo -e "  ${YELLOW}⚠️  Found potentially problematic package: $pkg${NC}"
        fi
    done
    
    # Validate TOML syntax
    if command -v python3 &> /dev/null; then
        if ! python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
            echo -e "  ${RED}❌ TOML syntax error - restoring backup${NC}"
            cp "$pyproject_file.dep-check.backup" "$pyproject_file"
            return 1
        fi
    fi
    
    if [ "$fixed" = true ]; then
        echo -e "  ${GREEN}✅ Fixed dependencies in $service${NC}"
    else
        echo -e "  ✅ No issues found in $service"
    fi
    
    return 0
}

test_service_build() {
    local service=$1
    
    echo -e "\n${BLUE}🧪 Testing $service build...${NC}"
    
    if docker-compose -f docker-compose.dev.yml build "$service" 2>/dev/null; then
        echo -e "  ${GREEN}✅ $service builds successfully${NC}"
        return 0
    else
        echo -e "  ${RED}❌ $service build failed${NC}"
        return 1
    fi
}

# Main execution
echo -e "\n🚀 Starting dependency fix process...\n"

fixed_count=0
build_success_count=0
build_total_count=0

# Fix all services
for service in "${SERVICES[@]}"; do
    if check_and_fix_service "$service"; then
        ((fixed_count++))
    fi
done

echo -e "\n${BLUE}📊 Fix Summary:${NC}"
echo "=================="
echo -e "Services processed: ${YELLOW}${#SERVICES[@]}${NC}"
echo -e "Services fixed: ${GREEN}$fixed_count${NC}"

# Test critical services first
critical_services=("media-service" "experience-service" "api-gateway" "auth-service")

echo -e "\n${BLUE}🧪 Testing critical services...${NC}"

for service in "${critical_services[@]}"; do
    ((build_total_count++))
    if test_service_build "$service"; then
        ((build_success_count++))
    fi
done

echo -e "\n${BLUE}📊 Build Test Summary:${NC}"
echo "======================"
echo -e "Services tested: ${YELLOW}$build_total_count${NC}"
echo -e "Successful builds: ${GREEN}$build_success_count${NC}"
echo -e "Failed builds: ${RED}$((build_total_count - build_success_count))${NC}"

if [ $build_success_count -eq $build_total_count ]; then
    echo -e "\n${GREEN}🎉 All critical services build successfully!${NC}"
    echo -e "\n🚀 Ready to build all services:"
    echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
else
    echo -e "\n${YELLOW}⚠️  Some services still have issues. Check the output above.${NC}"
    echo -e "\n💾 Backups saved as .dep-check.backup files"
fi

echo -e "\n${BLUE}📚 Available tools:${NC}"
echo -e "  ./test-docker-builds.sh - Test all service builds"
echo -e "  ./diagnose-poetry-groups.sh - Diagnose Poetry group issues"