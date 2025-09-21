#!/bin/bash

# Advanced Poetry Fix Tool for media-service and similar issues
# For WSL/Ubuntu

set -e

echo "🎯 Advanced Poetry Fix Tool"
echo "============================="

SERVICES_DIR="touriquest-backend/services"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fix media-service specifically
fix_media_service() {
    local service="media-service"
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    local dockerfile="$SERVICES_DIR/$service/Dockerfile.dev"
    
    echo -e "${BLUE}🎯 Fixing media-service specifically...${NC}"
    
    if [ ! -f "$pyproject_file" ]; then
        echo -e "  ${RED}❌ pyproject.toml not found${NC}"
        return 1
    fi
    
    # Backup
    cp "$pyproject_file" "$pyproject_file.advanced.backup"
    echo -e "  💾 Created backup"
    
    # Check if dev group exists
    if ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
        echo -e "  ${YELLOW}⚠️  No dev group found - adding minimal dev group${NC}"
        
        # Add minimal dev group
        cat >> "$pyproject_file" << 'EOF'

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.3"
black = "^23.11.0"
isort = "^5.12.0"
mypy = "^1.7.1"
EOF
        echo -e "  ✅ Added minimal dev group"
    fi
    
    # Ensure package-mode is false
    if ! grep -q "package-mode = false" "$pyproject_file"; then
        echo -e "  🔧 Adding package-mode = false"
        sed -i '/^readme = /a package-mode = false' "$pyproject_file"
    fi
    
    # Validate TOML
    if command -v python3 &> /dev/null; then
        if python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
            echo -e "  ✅ TOML syntax validated"
        else
            echo -e "  ${RED}❌ TOML syntax error - restoring backup${NC}"
            cp "$pyproject_file.advanced.backup" "$pyproject_file"
            return 1
        fi
    fi
    
    echo -e "  ${GREEN}✅ media-service fixed successfully${NC}"
}

# Fix any service with missing dev group
fix_missing_dev_groups() {
    local services=(
        "admin-service" "ai-service" "analytics-service" "api-gateway"
        "auth-service" "booking-service" "communication-service"
        "experience-service" "integrations-service"
        "monitoring-service" "notification-service" "poi-service"
        "property-service" "recommendation-service"
    )
    
    echo -e "\n${BLUE}🔄 Checking other services for missing dev groups...${NC}"
    
    for service in "${services[@]}"; do
        local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
        local dockerfile="$SERVICES_DIR/$service/Dockerfile.dev"
        
        if [ -f "$pyproject_file" ] && [ -f "$dockerfile" ]; then
            # Check if Dockerfile tries to use dev group but pyproject doesn't have it
            if grep -q -- "--with dev" "$dockerfile" && ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
                echo -e "  ${YELLOW}⚠️  $service: Missing dev group but Dockerfile expects it${NC}"
                
                # Backup
                cp "$pyproject_file" "$pyproject_file.devfix.backup"
                
                # Add minimal dev group
                cat >> "$pyproject_file" << 'EOF'

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.3"
black = "^23.11.0"
isort = "^5.12.0"
mypy = "^1.7.1"
EOF
                echo -e "    ✅ Added dev group to $service"
            fi
        fi
    done
}

# Main execution
echo -e "\n🚀 Starting advanced Poetry fix process...\n"

# Fix media-service first
fix_media_service

# Fix other services with missing dev groups
fix_missing_dev_groups

echo -e "\n${GREEN}🎉 Advanced fix completed!${NC}"
echo -e "\n🧪 Test the fixes:"
echo -e "${YELLOW}# Test media-service specifically:${NC}"
echo -e "docker-compose -f docker-compose.dev.yml build media-service"
echo -e "\n${YELLOW}# Test all services:${NC}"
echo -e "docker-compose -f docker-compose.dev.yml build"

echo -e "\n💾 Backups created with .advanced.backup and .devfix.backup extensions"