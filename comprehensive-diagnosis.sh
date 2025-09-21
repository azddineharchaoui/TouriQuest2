#!/bin/bash

# Comprehensive Docker Build Diagnosis Tool
# Analyzes build failures and suggests fixes
# For WSL/Ubuntu

set -e

echo "🔍 Docker Build Diagnosis Tool"
echo "==============================="

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

# Known problematic packages and their fixes
declare -A KNOWN_FIXES=(
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
    ["yaml"]="pyyaml"
    ["requests-oauthlib"]="requests-oauthlib"
    ["psycopg2"]="psycopg2-binary"
)

diagnose_service() {
    local service=$1
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    
    echo -e "\n${BLUE}🔍 Diagnosing $service...${NC}"
    
    if [ ! -f "$pyproject_file" ]; then
        echo -e "  ${RED}❌ pyproject.toml not found${NC}"
        return 1
    fi
    
    # Check for known problematic packages
    local issues_found=()
    
    for bad_package in "${!KNOWN_FIXES[@]}"; do
        if grep -q "^$bad_package = " "$pyproject_file"; then
            issues_found+=("$bad_package -> ${KNOWN_FIXES[$bad_package]}")
        fi
    done
    
    # Check for dev group existence
    if ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
        issues_found+=("Missing dev group")
    fi
    
    # Check package-mode
    if ! grep -q "package-mode = false" "$pyproject_file"; then
        issues_found+=("Missing package-mode = false")
    fi
    
    # Report findings
    if [ ${#issues_found[@]} -eq 0 ]; then
        echo -e "  ${GREEN}✅ No obvious issues found${NC}"
        return 0
    else
        echo -e "  ${YELLOW}⚠️  Issues found:${NC}"
        for issue in "${issues_found[@]}"; do
            echo -e "    - $issue"
        done
        return 1
    fi
}

fix_service() {
    local service=$1
    local pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    
    echo -e "\n${BLUE}🔧 Fixing $service...${NC}"
    
    # Create backup
    cp "$pyproject_file" "$pyproject_file.autofix.backup"
    
    local fixed=false
    
    # Fix known problematic packages
    for bad_package in "${!KNOWN_FIXES[@]}"; do
        if grep -q "^$bad_package = " "$pyproject_file"; then
            local replacement="${KNOWN_FIXES[$bad_package]}"
            echo -e "  🔧 Replacing $bad_package with $replacement"
            sed -i "s/^$bad_package = /$replacement = /" "$pyproject_file"
            fixed=true
        fi
    done
    
    # Add dev group if missing
    if ! grep -q "\[tool\.poetry\.group\.dev\.dependencies\]" "$pyproject_file"; then
        echo -e "  🔧 Adding dev group"
        cat >> "$pyproject_file" << 'EOF'

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
pytest-cov = "^4.1.0"
black = "^23.9.0"
isort = "^5.12.0"
flake8 = "^6.1.0"
mypy = "^1.6.0"
EOF
        fixed=true
    fi
    
    # Add package-mode if missing
    if ! grep -q "package-mode = false" "$pyproject_file"; then
        echo -e "  🔧 Adding package-mode = false"
        sed -i '/^readme = /a package-mode = false' "$pyproject_file"
        fixed=true
    fi
    
    if [ "$fixed" = true ]; then
        echo -e "  ${GREEN}✅ Applied fixes to $service${NC}"
    else
        echo -e "  ℹ️  No fixes needed for $service"
    fi
    
    # Validate TOML
    if command -v python3 &> /dev/null; then
        if ! python3 -c "import tomllib; f=open('$pyproject_file','rb'); tomllib.load(f); f.close()" 2>/dev/null; then
            echo -e "  ${RED}❌ TOML syntax error - restoring backup${NC}"
            cp "$pyproject_file.autofix.backup" "$pyproject_file"
            return 1
        fi
    fi
    
    return 0
}

test_build() {
    local service=$1
    
    echo -e "\n${BLUE}🧪 Testing $service build...${NC}"
    
    # Capture build output to analyze errors
    local build_log="/tmp/${service}_build.log"
    
    if docker-compose -f docker-compose.dev.yml build "$service" > "$build_log" 2>&1; then
        echo -e "  ${GREEN}✅ $service builds successfully${NC}"
        return 0
    else
        echo -e "  ${RED}❌ $service build failed${NC}"
        
        # Analyze the error
        if grep -q "doesn't match any versions" "$build_log"; then
            local failed_package=$(grep "doesn't match any versions" "$build_log" | sed -n "s/.*depends on \([^ ]*\).*/\1/p" | head -1)
            echo -e "    💡 Problematic package: ${YELLOW}$failed_package${NC}"
            
            # Suggest fix if known
            if [[ -n "${KNOWN_FIXES[$failed_package]}" ]]; then
                echo -e "    💡 Suggested fix: Replace with ${GREEN}${KNOWN_FIXES[$failed_package]}${NC}"
            fi
        fi
        
        return 1
    fi
}

# Main execution
echo -e "\n🚀 Starting comprehensive diagnosis...\n"

# Step 1: Diagnose all services
echo -e "${BLUE}📋 Step 1: Diagnosing all services...${NC}"
services_with_issues=()

for service in "${SERVICES[@]}"; do
    if ! diagnose_service "$service"; then
        services_with_issues+=("$service")
    fi
done

# Step 2: Fix services with issues
if [ ${#services_with_issues[@]} -gt 0 ]; then
    echo -e "\n${BLUE}🔧 Step 2: Fixing services with issues...${NC}"
    
    for service in "${services_with_issues[@]}"; do
        fix_service "$service"
    done
else
    echo -e "\n${GREEN}✅ No services need fixing!${NC}"
fi

# Step 3: Test builds
echo -e "\n${BLUE}🧪 Step 3: Testing builds...${NC}"

failed_services=()
successful_services=()

for service in "${services_with_issues[@]:-${SERVICES[@]}}"; do
    if test_build "$service"; then
        successful_services+=("$service")
    else
        failed_services+=("$service")
    fi
done

# Final report
echo -e "\n${BLUE}📊 Final Report:${NC}"
echo "=================="
echo -e "Services diagnosed: ${YELLOW}${#SERVICES[@]}${NC}"
echo -e "Services with issues: ${YELLOW}${#services_with_issues[@]}${NC}"
echo -e "Successful builds: ${GREEN}${#successful_services[@]}${NC}"
echo -e "Failed builds: ${RED}${#failed_services[@]}${NC}"

if [ ${#failed_services[@]} -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All services are working!${NC}"
    echo -e "\n🚀 Ready to build all services:"
    echo -e "${YELLOW}docker-compose -f docker-compose.dev.yml build${NC}"
else
    echo -e "\n${RED}Services still failing:${NC}"
    for service in "${failed_services[@]}"; do
        echo -e "  - $service"
    done
    
    echo -e "\n${YELLOW}💡 Manual intervention may be needed for these services.${NC}"
    echo -e "Check the build logs in /tmp/ for detailed error analysis."
fi

echo -e "\n💾 Backups saved as .autofix.backup files"