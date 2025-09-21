#!/bin/bash

# Fix TOML duplicate entries in all pyproject.toml files
# This script removes development dependencies from main dependencies section

echo "🔧 Fixing TOML duplicate entries in all services..."

SERVICES_DIR="touriquest-backend/services"

# List of all services
SERVICES=(
    "admin-service"
    "ai-service" 
    "analytics-service"
    "api-gateway"
    "auth-service"
    "booking-service"
    "communication-service"
    "experience-service"
    "integrations-service"
    "media-service"
    "monitoring-service"
    "notification-service"
    "poi-service"
    "property-service"
    "recommendation-service"
)

fix_service_toml() {
    local service=$1
    local toml_file="$SERVICES_DIR/$service/pyproject.toml"
    
    if [ ! -f "$toml_file" ]; then
        echo "❌ $toml_file not found"
        return 1
    fi
    
    echo "🔧 Fixing $service..."
    
    # Create a backup
    cp "$toml_file" "$toml_file.backup"
    
    # Remove dev dependencies from main dependencies section
    # These packages should only be in [tool.poetry.group.dev.dependencies]
    sed -i '/^# Development and testing$/,/^faker = /d' "$toml_file"
    
    # Remove any trailing empty lines before the next section
    sed -i '/^$/N;/^\n\[tool\.poetry\.group\.dev\.dependencies\]$/d' "$toml_file"
    
    echo "✅ Fixed $service"
}

# Fix all services
for service in "${SERVICES[@]}"; do
    fix_service_toml "$service"
done

echo ""
echo "🧪 Validating TOML files..."

# Validate each TOML file
for service in "${SERVICES[@]}"; do
    toml_file="$SERVICES_DIR/$service/pyproject.toml"
    if [ -f "$toml_file" ]; then
        if python3 -c "import toml; toml.load('$toml_file')" 2>/dev/null; then
            echo "✅ $service: Valid TOML"
        else
            echo "❌ $service: Invalid TOML"
        fi
    fi
done

echo ""
echo "✅ TOML duplicate fix completed!"
echo "📝 Backups saved as .backup files"
echo ""
echo "To test Docker builds:"
echo "docker-compose -f docker-compose.dev.yml build integrations-service"