#!/bin/bash
# =============================================================================
# Test Poetry Configuration Fix
# =============================================================================

echo "============================================================================="
echo "  Testing Poetry Configuration Fix"
echo "============================================================================="
echo ""

echo "🔍 Checking all pyproject.toml files for correct configuration..."
echo ""

SERVICES_DIR="touriquest-backend/services"
ERRORS=0
TOTAL=0

for service_dir in "$SERVICES_DIR"/*; do
    if [[ -d "$service_dir" ]]; then
        service_name=$(basename "$service_dir")
        pyproject_file="$service_dir/pyproject.toml"
        
        if [[ -f "$pyproject_file" ]]; then
            ((TOTAL++))
            echo "Checking $service_name..."
            
            # Check if it has package-mode = false
            if grep -q "package-mode = false" "$pyproject_file"; then
                echo "  ✅ Has package-mode = false"
            elif grep -q "packages = " "$pyproject_file"; then
                echo "  ❌ Still has old packages configuration"
                ((ERRORS++))
            else
                echo "  ⚠️  No package configuration found"
            fi
        fi
    fi
done

echo ""
echo "============================================================================="
echo "📊 Results:"
echo "  Total services: $TOTAL"
echo "  Services with errors: $ERRORS"

if [[ $ERRORS -eq 0 ]]; then
    echo ""
    echo "✅ All services are properly configured!"
    echo ""
    echo "🧪 Ready to test Docker build:"
    echo "  ./test-docker-fix.sh"
else
    echo ""
    echo "❌ Some services still need fixing. Run:"
    echo "  ./quick-fix-poetry.sh"
fi
echo "============================================================================="