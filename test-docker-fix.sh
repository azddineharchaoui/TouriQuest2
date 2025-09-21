#!/bin/bash
# =============================================================================
# TouriQuest Docker Configuration Test
# =============================================================================

echo "Testing Docker configuration..."

# Check if Docker is available
if ! docker --version > /dev/null 2>&1; then
    echo "ERROR: Docker is not available in PATH"
    echo "Please make sure Docker is installed and running"
    echo "On Ubuntu/WSL, you may need to start Docker with: sudo systemctl start docker"
    exit 1
fi

echo "Docker is available:"
docker --version

# Check Docker daemon connection and permissions
echo ""
echo "Checking Docker daemon connection..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to Docker daemon"
    echo ""
    echo "This is likely a permissions issue. Here are the solutions:"
    echo ""
    echo "🔧 Option 1: Add your user to docker group (recommended)"
    echo "   sudo groupadd docker"
    echo "   sudo usermod -aG docker \$USER"
    echo "   newgrp docker"
    echo "   # Then restart your terminal"
    echo ""
    echo "🔧 Option 2: Use Docker Desktop for Windows with WSL2 integration"
    echo "   1. Install Docker Desktop for Windows"
    echo "   2. Enable WSL2 integration in Docker Desktop settings"
    echo "   3. Restart Docker Desktop and WSL"
    echo ""
    echo "🔧 Option 3: Run with sudo (not recommended for development)"
    echo "   sudo docker info"
    echo ""
    echo "🔧 Option 4: Start Docker service if not running"
    echo "   sudo systemctl start docker"
    echo "   sudo systemctl enable docker"
    echo ""
    exit 1
else
    echo "✅ Docker daemon connection successful"
fi

echo ""
echo "Testing docker-compose configuration..."

# Remove the obsolete version warning by checking the file first
if grep -q "^version:" docker-compose.dev.yml 2>/dev/null; then
    echo "⚠️  Note: docker-compose.yml contains obsolete 'version' attribute"
    echo "   This will be ignored by Docker Compose but can be removed"
fi

if ! docker compose -f docker-compose.dev.yml config --quiet 2>/dev/null; then
    echo "ERROR: Docker Compose configuration is invalid"
    echo "Running detailed validation..."
    docker compose -f docker-compose.dev.yml config
    exit 1
else
    echo "✅ Docker Compose configuration is valid!"
fi

echo ""
echo "Testing if we can build api-gateway service..."
if ! docker compose -f docker-compose.dev.yml build api-gateway; then
    echo "❌ ERROR: Failed to build api-gateway service"
    echo ""
    echo "Possible causes:"
    echo "1. Missing pyproject.toml file"
    echo "2. Docker permissions issue"
    echo "3. Network connectivity problems"
    echo "4. Insufficient disk space"
    echo ""
    echo "Try running with more verbose output:"
    echo "docker compose -f docker-compose.dev.yml build --progress=plain api-gateway"
    exit 1
else
    echo "✅ API Gateway service built successfully!"
fi

echo ""
echo "Testing if we can build auth-service (includes user logic)..."
if ! docker compose -f docker-compose.dev.yml build auth-service; then
    echo "❌ ERROR: Failed to build auth-service"
    echo ""
    echo "Check the logs above for specific error details."
    exit 1
else
    echo "✅ Auth service (with user logic) built successfully!"
fi

echo ""
echo "✅ All tests passed! Your Docker configuration is working correctly."
echo ""
echo "Next steps:"
echo "  • Run ./start-dev.sh to start all services"
echo "  • Check service status with ./status-dev.sh"
echo "  • View logs with ./logs-dev.sh [service-name]"
echo ""
