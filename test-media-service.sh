#!/bin/bash

# Quick test script for media-service fix
# For WSL/Ubuntu

set -e

echo "🧪 Testing media-service fix..."
echo "==============================="

MEDIA_SERVICE_DIR="touriquest-backend/services/media-service"
PYPROJECT_FILE="$MEDIA_SERVICE_DIR/pyproject.toml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1. Checking TOML syntax...${NC}"

# Test TOML syntax with Python
if command -v python3 &> /dev/null; then
    if python3 -c "
import tomllib
try:
    with open('$PYPROJECT_FILE', 'rb') as f:
        data = tomllib.load(f)
    print('✅ TOML syntax is valid')
    
    # Check Poetry sections
    if 'tool' in data and 'poetry' in data['tool']:
        print('✅ Poetry configuration found')
        
        if 'dependencies' in data['tool']['poetry']:
            deps_count = len(data['tool']['poetry']['dependencies'])
            print(f'✅ Main dependencies: {deps_count} packages')
        
        if 'group' in data['tool']['poetry'] and 'dev' in data['tool']['poetry']['group']:
            dev_deps_count = len(data['tool']['poetry']['group']['dev']['dependencies'])
            print(f'✅ Dev dependencies: {dev_deps_count} packages')
        else:
            print('❌ Dev group not found')
            
        if 'package-mode' in data['tool']['poetry']:
            package_mode = data['tool']['poetry']['package-mode']
            print(f'✅ Package mode: {package_mode}')
    else:
        print('❌ Poetry configuration not found')
        
except Exception as e:
    print(f'❌ TOML syntax error: {e}')
    exit(1)
"; then
        echo -e "${GREEN}✅ TOML validation passed${NC}"
    else
        echo -e "${RED}❌ TOML validation failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Python3 not available - skipping TOML validation${NC}"
fi

echo -e "\n${BLUE}2. Testing Docker build...${NC}"

# Test Docker build
if docker-compose -f docker-compose.dev.yml build media-service; then
    echo -e "\n${GREEN}🎉 media-service builds successfully!${NC}"
    
    echo -e "\n${BLUE}🚀 Next steps:${NC}"
    echo -e "1. Test other services: ${YELLOW}./test-docker-builds.sh${NC}"
    echo -e "2. Start all services: ${YELLOW}docker-compose -f docker-compose.dev.yml up -d${NC}"
    echo -e "3. Or build all: ${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
else
    echo -e "\n${RED}❌ media-service build failed${NC}"
    echo -e "${YELLOW}💡 Check the error above and run:${NC}"
    echo -e "   ./diagnose-poetry-groups.sh"
    exit 1
fi