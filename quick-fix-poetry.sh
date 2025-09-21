#!/bin/bash
# =============================================================================
# Quick Fix: Update all pyproject.toml to use package-mode = false
# =============================================================================

echo "🔧 Quick fix: Updating all pyproject.toml files..."

# Services that need fixing
SERVICES=(
    "analytics-service"
    "admin-service"
    "ai-service"
    "communication-service"
    "experience-service"
    "integrations-service"
    "media-service"
    "monitoring-service"
    "poi-service"
    "property-service"
)

SERVICES_DIR="touriquest-backend/services"

for service in "${SERVICES[@]}"; do
    pyproject_file="$SERVICES_DIR/$service/pyproject.toml"
    
    if [[ -f "$pyproject_file" ]]; then
        echo "Fixing $service..."
        
        # Create backup
        cp "$pyproject_file" "$pyproject_file.backup"
        
        # Replace packages line with package-mode = false
        sed -i 's/packages = \[{include = "app"}\]/package-mode = false/' "$pyproject_file"
        
        echo "✅ Fixed $service"
    else
        echo "⚠️  $pyproject_file not found"
    fi
done

echo ""
echo "✅ All services updated to use package-mode = false"
echo "This should fix the Poetry installation issues."