#!/bin/bash

# Master script to diagnose and fix all Poetry/Docker issues
# For WSL/Ubuntu

set -e

echo "🎯 TouriQuest Poetry & Docker Master Fix Script"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Make all scripts executable
echo -e "${BLUE}🔧 Making scripts executable...${NC}"
chmod +x diagnose-poetry-groups.sh
chmod +x fix-poetry-groups.sh
chmod +x advanced-poetry-fix.sh
chmod +x test-docker-builds.sh

# Step 1: Diagnose current issues
echo -e "\n${BLUE}📋 Step 1: Diagnosing current Poetry configuration...${NC}"
./diagnose-poetry-groups.sh

# Step 2: Apply advanced fix for immediate issues
echo -e "\n${BLUE}🎯 Step 2: Applying advanced fixes for immediate issues...${NC}"
./advanced-poetry-fix.sh

# Step 3: Test the most problematic service first
echo -e "\n${BLUE}🧪 Step 3: Testing media-service build (the failing one)...${NC}"
if docker-compose -f docker-compose.dev.yml build media-service; then
    echo -e "${GREEN}✅ media-service builds successfully!${NC}"
else
    echo -e "${RED}❌ media-service still failing - need manual intervention${NC}"
    exit 1
fi

# Step 4: Test a few more critical services
echo -e "\n${BLUE}🧪 Step 4: Testing other critical services...${NC}"
critical_services=("api-gateway" "auth-service" "booking-service")

for service in "${critical_services[@]}"; do
    echo -e "\n  Testing $service..."
    if docker-compose -f docker-compose.dev.yml build "$service"; then
        echo -e "  ${GREEN}✅ $service builds successfully${NC}"
    else
        echo -e "  ${RED}❌ $service failed${NC}"
        echo -e "  ${YELLOW}💡 Run: ./fix-poetry-groups.sh for comprehensive fix${NC}"
    fi
done

# Step 5: Final validation
echo -e "\n${BLUE}🎉 Step 5: Final validation complete!${NC}"
echo -e "\n${GREEN}🚀 Ready to proceed with full build:${NC}"
echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
echo -e "\n${GREEN}🌟 Or start the development environment:${NC}"
echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml up -d${NC}"

echo -e "\n${BLUE}📚 Available scripts for troubleshooting:${NC}"
echo -e "  ./diagnose-poetry-groups.sh    - Diagnose Poetry issues"
echo -e "  ./fix-poetry-groups.sh         - Comprehensive fix"
echo -e "  ./advanced-poetry-fix.sh       - Advanced targeted fix"
echo -e "  ./test-docker-builds.sh        - Test all service builds"