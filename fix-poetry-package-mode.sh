#!/bin/bash
# =============================================================================
# Fix Poetry Package Mode Issues
# =============================================================================

echo "============================================================================="
echo "  Fixing Poetry package-mode issues in all services"
echo "============================================================================="
echo ""

SERVICES_DIR="touriquest-backend/services"

if [[ ! -d "$SERVICES_DIR" ]]; then
    echo "❌ Services directory not found: $SERVICES_DIR"
    exit 1
fi

FIXED_COUNT=0
TOTAL_COUNT=0

echo "🔍 Scanning services for pyproject.toml files..."

for service_dir in "$SERVICES_DIR"/*; do
    if [[ -d "$service_dir" ]]; then
        service_name=$(basename "$service_dir")
        pyproject_file="$service_dir/pyproject.toml"
        
        if [[ -f "$pyproject_file" ]]; then
            ((TOTAL_COUNT++))
            echo ""
            echo "🔧 Processing: $service_name"
            
            # Check if it has the old packages configuration
            if grep -q "packages = \[{include = \"app\"}\]" "$pyproject_file"; then
                echo "  ✅ Found old package configuration - fixing..."
                
                # Create backup
                cp "$pyproject_file" "$pyproject_file.backup"
                echo "  📁 Created backup: $pyproject_file.backup"
                
                # Replace the packages line with package-mode = false
                sed -i 's/packages = \[{include = "app"}\]/package-mode = false/' "$pyproject_file"
                
                echo "  ✅ Updated to package-mode = false"
                ((FIXED_COUNT++))
            elif grep -q "package-mode = false" "$pyproject_file"; then
                echo "  ✅ Already has package-mode = false"
            else
                echo "  ⚠️  No package configuration found - adding package-mode = false"
                
                # Find the line after readme and add package-mode = false
                if grep -q "readme = " "$pyproject_file"; then
                    # Create backup
                    cp "$pyproject_file" "$pyproject_file.backup"
                    
                    # Add package-mode = false after readme line
                    sed -i '/readme = /a package-mode = false' "$pyproject_file"
                    echo "  ✅ Added package-mode = false"
                    ((FIXED_COUNT++))
                else
                    echo "  ⚠️  Could not find readme line to insert after"
                fi
            fi
            
            # Verify the file is valid
            if [[ -f "$pyproject_file" ]] && head -5 "$pyproject_file" | grep -q "\[tool.poetry\]"; then
                echo "  ✅ File structure looks valid"
            else
                echo "  ❌ File may be corrupted - restoring backup"
                if [[ -f "$pyproject_file.backup" ]]; then
                    mv "$pyproject_file.backup" "$pyproject_file"
                fi
            fi
        else
            echo "⚠️  No pyproject.toml found in $service_name"
        fi
    fi
done

echo ""
echo "============================================================================="
echo "📊 Summary:"
echo "  Total services processed: $TOTAL_COUNT"
echo "  Services fixed: $FIXED_COUNT"
echo ""
echo "✅ All pyproject.toml files have been updated to use package-mode = false"
echo ""
echo "🧪 Test the fix with:"
echo "  ./test-docker-fix.sh"
echo "============================================================================="