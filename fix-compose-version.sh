#!/bin/bash
# =============================================================================
# Fix docker-compose version warning
# =============================================================================

echo "🔧 Fixing docker-compose version warning..."

if [ -f "docker-compose.dev.yml" ]; then
    # Check if version line exists
    if grep -q "^version:" docker-compose.dev.yml; then
        echo "Found obsolete 'version' line in docker-compose.dev.yml"
        
        # Create backup
        cp docker-compose.dev.yml docker-compose.dev.yml.backup
        echo "✅ Created backup: docker-compose.dev.yml.backup"
        
        # Remove version line
        sed -i '/^version:/d' docker-compose.dev.yml
        echo "✅ Removed obsolete 'version' line"
        
        # Also remove empty lines at the top
        sed -i '/./,$!d' docker-compose.dev.yml
        
        echo ""
        echo "🎉 Fixed! The warning should no longer appear."
        echo "To restore: mv docker-compose.dev.yml.backup docker-compose.dev.yml"
    else
        echo "✅ No obsolete 'version' line found"
    fi
else
    echo "❌ docker-compose.dev.yml not found"
    exit 1
fi