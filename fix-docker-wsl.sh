#!/bin/bash
# =============================================================================
# TouriQuest Docker WSL Troubleshooting Script
# =============================================================================

echo "============================================================================="
echo "  Docker WSL Troubleshooting & Fix Script"
echo "============================================================================="
echo ""

# Function to check if running in WSL
check_wsl() {
    if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "✅ Running in WSL environment"
        return 0
    else
        echo "ℹ️  Not running in WSL"
        return 1
    fi
}

# Function to check Docker installation
check_docker_installation() {
    echo "🔍 Checking Docker installation..."
    
    if command -v docker >/dev/null 2>&1; then
        echo "✅ Docker command is available"
        docker --version
    else
        echo "❌ Docker command not found"
        echo "Please install Docker first:"
        echo "  - For WSL: Install Docker Desktop for Windows with WSL2 integration"
        echo "  - For Ubuntu: curl -fsSL https://get.docker.com | sh"
        return 1
    fi
}

# Function to check Docker daemon
check_docker_daemon() {
    echo ""
    echo "🔍 Checking Docker daemon status..."
    
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon is running and accessible"
        return 0
    else
        echo "❌ Cannot connect to Docker daemon"
        return 1
    fi
}

# Function to check Docker permissions
check_docker_permissions() {
    echo ""
    echo "🔍 Checking Docker permissions..."
    
    if groups | grep -q docker; then
        echo "✅ User is in docker group"
        return 0
    else
        echo "❌ User is not in docker group"
        return 1
    fi
}

# Function to fix Docker permissions
fix_docker_permissions() {
    echo ""
    echo "🔧 Fixing Docker permissions..."
    
    echo "Adding user to docker group..."
    sudo groupadd docker 2>/dev/null || true
    sudo usermod -aG docker $USER
    
    echo "✅ User added to docker group"
    echo "⚠️  You need to log out and log back in (or restart WSL) for changes to take effect"
    echo ""
    echo "To restart WSL from Windows PowerShell:"
    echo "  wsl --shutdown"
    echo "  wsl"
    echo ""
    echo "Or run this to apply group changes immediately:"
    echo "  newgrp docker"
}

# Function to start Docker service
start_docker_service() {
    echo ""
    echo "🔧 Starting Docker service..."
    
    if sudo systemctl start docker 2>/dev/null; then
        echo "✅ Docker service started"
        sudo systemctl enable docker 2>/dev/null
        echo "✅ Docker service enabled for auto-start"
    else
        echo "⚠️  Could not start Docker service via systemctl"
        echo "This is normal if using Docker Desktop"
    fi
}

# Function to test Docker functionality
test_docker() {
    echo ""
    echo "🧪 Testing Docker functionality..."
    
    if docker run --rm hello-world >/dev/null 2>&1; then
        echo "✅ Docker is working correctly"
        return 0
    else
        echo "❌ Docker test failed"
        return 1
    fi
}

# Function to remove version warning from docker-compose
fix_compose_version_warning() {
    echo ""
    echo "🔧 Fixing docker-compose version warning..."
    
    if [ -f "docker-compose.dev.yml" ]; then
        if grep -q "^version:" docker-compose.dev.yml; then
            echo "Removing obsolete 'version' line from docker-compose.dev.yml..."
            sed -i '/^version:/d' docker-compose.dev.yml
            echo "✅ Version line removed"
        else
            echo "✅ No version line found to remove"
        fi
    else
        echo "❌ docker-compose.dev.yml not found"
    fi
}

# Main execution
main() {
    check_wsl
    IS_WSL=$?
    
    check_docker_installation
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Please install Docker first and run this script again"
        exit 1
    fi
    
    check_docker_daemon
    DAEMON_OK=$?
    
    if [ $DAEMON_OK -ne 0 ]; then
        echo ""
        echo "🔧 Docker daemon is not accessible. Trying to fix..."
        
        if [ $IS_WSL -eq 0 ]; then
            echo ""
            echo "WSL Environment - Recommended solutions:"
            echo ""
            echo "1. 🥇 Best: Use Docker Desktop for Windows"
            echo "   - Install Docker Desktop for Windows"
            echo "   - Enable WSL2 integration in settings"
            echo "   - Restart Docker Desktop"
            echo ""
            echo "2. 🥈 Alternative: Fix permissions and start service"
            
            check_docker_permissions
            if [ $? -ne 0 ]; then
                fix_docker_permissions
            fi
            
            start_docker_service
            
            echo ""
            echo "Please restart WSL or run 'newgrp docker' and try again"
        else
            echo "Native Linux - Fixing permissions and starting service..."
            
            check_docker_permissions
            if [ $? -ne 0 ]; then
                fix_docker_permissions
            fi
            
            start_docker_service
        fi
    else
        test_docker
        if [ $? -eq 0 ]; then
            fix_compose_version_warning
            echo ""
            echo "🎉 Docker is fully configured and working!"
            echo ""
            echo "You can now run:"
            echo "  ./validate-docker-config.sh"
            echo "  ./test-docker-fix.sh"
            echo "  ./start-dev.sh"
        fi
    fi
}

# Run main function
main