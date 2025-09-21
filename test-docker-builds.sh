#!/bin/bash

# Test script to validate Docker builds after Poetry fixes
# For WSL/Ubuntu

set -e

echo "🧪 Docker Build Validation Script"
echo "=================================="

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

# Test single service build
test_service_build() {
    local service=$1
    
    echo -e "\n${BLUE}🧪 Testing $service build...${NC}"
    
    # Test the build
    if docker-compose -f docker-compose.dev.yml build "$service" 2>&1; then
        echo -e "  ${GREEN}✅ $service builds successfully${NC}"
        return 0
    else
        echo -e "  ${RED}❌ $service build failed${NC}"
        return 1
    fi
}

# Test all services or specific ones
if [ $# -eq 0 ]; then
    echo -e "\n🚀 Testing all services...\n"
    
    success_count=0
    failure_count=0
    failed_services=()
    
    for service in "${SERVICES[@]}"; do
        if test_service_build "$service"; then
            ((success_count++))
        else
            ((failure_count++))
            failed_services+=("$service")
        fi
    done
    
    echo -e "\n${BLUE}📊 Build Test Summary:${NC}"
    echo "======================"
    echo -e "✅ Successful builds: ${GREEN}$success_count${NC}"
    echo -e "❌ Failed builds: ${RED}$failure_count${NC}"
    
    if [ $failure_count -gt 0 ]; then
        echo -e "\n${RED}Failed services:${NC}"
        for failed_service in "${failed_services[@]}"; do
            echo -e "  - $failed_service"
        done
        
        echo -e "\n${YELLOW}💡 To debug a specific service:${NC}"
        echo -e "docker-compose -f docker-compose.dev.yml build ${failed_services[0]} --no-cache"
    else
        echo -e "\n${GREEN}🎉 All services build successfully!${NC}"
        echo -e "\n🚀 You can now start the full environment:"
        echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml up -d${NC}"
    fi
    
else
    # Test specific services passed as arguments
    echo -e "\n🎯 Testing specific services: $*\n"
    
    for service in "$@"; do
        test_service_build "$service"
    done
fi