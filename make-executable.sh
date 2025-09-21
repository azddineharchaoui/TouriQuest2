#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - Make Scripts Executable
# =============================================================================

echo "Making all development scripts executable..."

# List of all bash scripts
scripts=(
    "setup-dev.sh"
    "start-dev.sh"
    "stop-dev.sh"
    "clean-dev.sh"
    "reset-dev.sh"
    "status-dev.sh"
    "logs-dev.sh"
    "validate-docker-config.sh"
    "test-docker-fix.sh"
    "fix-docker-wsl.sh"
    "fix-compose-version.sh"
    "demo-new-scripts.sh"
    "cleanup-user-service-refs.sh"
)

# Make scripts executable
for script in "${scripts[@]}"; do
    if [[ -f "$script" ]]; then
        chmod +x "$script"
        echo "✓ Made $script executable"
    else
        echo "❌ Script not found: $script"
    fi
done

echo ""
echo "✅ All scripts are now executable!"
echo ""
echo "You can now run:"
echo "  ./setup-dev.sh       - Set up the development environment"
echo "  ./start-dev.sh        - Start all services"
echo "  ./stop-dev.sh         - Stop all services"
echo "  ./status-dev.sh       - Check service status"
echo "  ./logs-dev.sh         - View service logs"
echo "  ./reset-dev.sh        - Reset environment (clean + rebuild)"
echo "  ./clean-dev.sh        - Clean everything (destructive)"
echo "  ./validate-docker-config.sh - Validate Docker configuration"
echo "  ./test-docker-fix.sh  - Test Docker build process"
echo "  ./fix-docker-wsl.sh   - Fix Docker WSL permissions issues"
echo "  ./fix-compose-version.sh - Fix docker-compose version warning"
echo ""