#!/bin/bash
# =============================================================================
# TouriQuest Docker Configuration Validation
# =============================================================================

set -e  # Exit on any error

echo ""
echo "============================================================================="
echo "  TouriQuest Docker Configuration Validation"
echo "============================================================================="
echo ""

ERROR_COUNT=0

echo "[1/3] Checking required files..."

# Check docker-compose.dev.yml
if [[ -f "docker-compose.dev.yml" ]]; then
    echo "✅ docker-compose.dev.yml exists"
else
    echo "❌ docker-compose.dev.yml is missing"
    ((ERROR_COUNT++))
fi

# Check if pyproject.toml exists for all services (excluding user-service)
SERVICES=(
    "api-gateway"
    "auth-service"
    "property-service"
    "poi-service"
    "booking-service"
    "experience-service"
    "ai-service"
    "media-service"
    "notification-service"
    "analytics-service"
    "admin-service"
    "communication-service"
    "integrations-service"
    "monitoring-service"
    "recommendation-service"
)

echo ""
echo "[2/3] Checking pyproject.toml files for all services..."

for service in "${SERVICES[@]}"; do
    if [[ -f "touriquest-backend/services/$service/pyproject.toml" ]]; then
        echo "✅ $service has pyproject.toml"
    else
        echo "❌ $service is missing pyproject.toml"
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "[3/3] Checking Dockerfile.dev files for all services..."

for service in "${SERVICES[@]}"; do
    if [[ -f "touriquest-backend/services/$service/Dockerfile.dev" ]]; then
        echo "✅ $service has Dockerfile.dev"
    else
        echo "❌ $service is missing Dockerfile.dev"
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "============================================================================="
if [[ $ERROR_COUNT -eq 0 ]]; then
    echo "✅ All required files are present! Docker build should work now."
    echo ""
    echo "You can now run:"
    echo "  • ./test-docker-fix.sh - to test Docker configuration"
    echo "  • ./start-dev.sh - to start all services"
else
    echo "❌ Found $ERROR_COUNT missing files. Please create them before proceeding."
fi
echo "============================================================================="
echo ""
