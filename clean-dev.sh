#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - CLEAN SCRIPT
# =============================================================================

set -e  # Exit on any error

echo ""
echo "==============================================="
echo "  TouriQuest Development Environment"
echo "  CLEAN RESET - This will remove ALL data!"
echo "==============================================="
echo ""

echo "⚠️  WARNING: This will permanently delete:"
echo "  • All Docker containers"
echo "  • All Docker volumes (database data)"
echo "  • All Docker images (will need to rebuild)"
echo "  • All logs and temporary files"
echo "  • Node modules and Python cache"
echo ""

read -p "Are you sure you want to continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Clean operation cancelled."
    exit 0
fi

echo ""
echo "Last chance! This action cannot be undone."
read -p "Type 'DELETE' to confirm: " final_confirm
if [[ "$final_confirm" != "DELETE" ]]; then
    echo "Clean operation cancelled."
    exit 0
fi

echo ""
echo "==============================================="
echo "  🧹 Starting clean operation..."
echo "==============================================="

# Check if Docker is running
echo "[1/8] Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker first with: sudo systemctl start docker"
    exit 1
fi
echo "✓ Docker is running"

# Stop all containers first
echo "[2/8] Stopping all TouriQuest containers..."
export COMPOSE_PROJECT_NAME=touriquest-dev
docker compose -f docker-compose.dev.yml down --timeout 30 2>/dev/null || true
echo "✓ All containers stopped"

# Remove all TouriQuest containers
echo "[3/8] Removing all TouriQuest containers..."
touriquest_containers=$(docker ps -a --filter "name=touriquest" --format "{{.Names}}" 2>/dev/null || true)
if [[ -n "$touriquest_containers" ]]; then
    while IFS= read -r container; do
        echo "Removing container: $container"
        docker rm -f "$container" > /dev/null 2>&1 || true
    done <<< "$touriquest_containers"
fi
echo "✓ Containers removed"

# Remove all TouriQuest volumes
echo "[4/8] Removing all TouriQuest volumes..."
docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
touriquest_volumes=$(docker volume ls --filter "name=touriquest" --format "{{.Name}}" 2>/dev/null || true)
if [[ -n "$touriquest_volumes" ]]; then
    while IFS= read -r volume; do
        echo "Removing volume: $volume"
        docker volume rm "$volume" > /dev/null 2>&1 || true
    done <<< "$touriquest_volumes"
fi
echo "✓ Volumes removed"

# Remove all TouriQuest images
echo "[5/8] Removing all TouriQuest images..."
touriquest_images=$(docker images --filter "reference=touriquest*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
if [[ -n "$touriquest_images" ]]; then
    while IFS= read -r image; do
        echo "Removing image: $image"
        docker rmi "$image" > /dev/null 2>&1 || true
    done <<< "$touriquest_images"
fi
echo "✓ Images removed"

# Clean up build cache
echo "[6/8] Cleaning Docker build cache..."
docker builder prune -f > /dev/null 2>&1 || true
echo "✓ Build cache cleaned"

# Clean up frontend dependencies and build artifacts
echo "[7/8] Cleaning frontend dependencies..."
if [[ -d "frontend/node_modules" ]]; then
    echo "Removing frontend/node_modules..."
    rm -rf "frontend/node_modules" 2>/dev/null || true
fi
if [[ -d "frontend/dist" ]]; then
    echo "Removing frontend/dist..."
    rm -rf "frontend/dist" 2>/dev/null || true
fi
if [[ -d "frontend/.vite" ]]; then
    echo "Removing frontend/.vite..."
    rm -rf "frontend/.vite" 2>/dev/null || true
fi
echo "✓ Frontend cleaned"

# Clean up Python cache and virtual environments
echo "[8/8] Cleaning Python cache..."
[[ -d "__pycache__" ]] && rm -rf "__pycache__" 2>/dev/null || true
[[ -d ".pytest_cache" ]] && rm -rf ".pytest_cache" 2>/dev/null || true
[[ -d "htmlcov" ]] && rm -rf "htmlcov" 2>/dev/null || true
[[ -f ".coverage" ]] && rm -f ".coverage" 2>/dev/null || true
[[ -f "coverage.xml" ]] && rm -f "coverage.xml" 2>/dev/null || true
[[ -f "junit.xml" ]] && rm -f "junit.xml" 2>/dev/null || true

# Find and remove all __pycache__ directories
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

# Clean Poetry virtual environment
if [[ -d ".venv" ]]; then
    echo "Removing Poetry virtual environment..."
    rm -rf ".venv" 2>/dev/null || true
fi

echo "✓ Python cache cleaned"

# Clean up logs and temporary files
[[ -d "logs" ]] && rm -rf "logs" 2>/dev/null || true
[[ -d "data" ]] && rm -rf "data" 2>/dev/null || true
[[ -d "uploads" ]] && rm -rf "uploads" 2>/dev/null || true
[[ -d "tmp" ]] && rm -rf "tmp" 2>/dev/null || true

echo ""
echo "==============================================="
echo "  ✅ Clean operation completed!"
echo "==============================================="
echo ""
echo "🧹 What was cleaned:"
echo "  • All Docker containers and images"
echo "  • All Docker volumes and data"
echo "  • Frontend node_modules and build files"
echo "  • Python cache and virtual environments"
echo "  • Logs and temporary files"
echo ""
echo "🔄 Next steps to rebuild:"
echo "  1. Run: ./start-dev.sh"
echo "  2. Or manually:"
echo "     • docker compose -f docker-compose.dev.yml build"
echo "     • cd frontend && npm install"
echo "     • poetry install (for Python backend)"
echo ""
echo "💡 Tip: First startup after clean will take longer"
echo "   as everything needs to be downloaded and built."
echo ""

# Show system cleanup results
echo "📊 Docker system status:"
docker system df 2>/dev/null || echo "Unable to show Docker system status"

echo ""