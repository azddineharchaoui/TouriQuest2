#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - RESET SCRIPT
# =============================================================================

set -e  # Exit on any error

echo ""
echo "==============================================="
echo "  TouriQuest Development Environment Reset"
echo "==============================================="
echo ""
echo "This will:"
echo "- Stop all running services"
echo "- Remove all containers and volumes"
echo "- Clear Docker cache"
echo "- Reset databases to initial state"
echo "- Remove node_modules and reinstall"
echo ""

read -p "Are you sure you want to reset everything? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo "[1/7] Stopping all services..."
if ! docker compose -f docker-compose.dev.yml down --volumes --remove-orphans; then
    echo "Warning: Some containers may still be running"
fi

echo ""
echo "[2/7] Removing Docker images..."
touriquest_images=$(docker images "touriquest*" -q 2>/dev/null || true)
if [[ -n "$touriquest_images" ]]; then
    echo "$touriquest_images" | xargs -r docker rmi --force 2>/dev/null || true
fi

echo ""
echo "[3/7] Pruning Docker system..."
docker system prune -af --volumes 2>/dev/null || true

echo ""
echo "[4/7] Removing node_modules..."
if [[ -d "frontend/node_modules" ]]; then
    echo "Removing frontend/node_modules..."
    rm -rf "frontend/node_modules"
fi

echo ""
echo "[5/7] Removing Python cache..."
# Find and remove all __pycache__ directories
find . -type d -name "__pycache__" 2>/dev/null | while read -r dir; do
    if [[ -d "$dir" ]]; then
        echo "Removing $dir..."
        rm -rf "$dir"
    fi
done

# Find and remove all .pyc files
find . -type f -name "*.pyc" 2>/dev/null | while read -r file; do
    if [[ -f "$file" ]]; then
        echo "Removing $file..."
        rm -f "$file"
    fi
done

echo ""
echo "[6/7] Reinstalling frontend dependencies..."
if [[ -f "frontend/package.json" ]]; then
    cd frontend
    npm install
    cd ..
else
    echo "Warning: package.json not found in frontend directory"
fi

echo ""
echo "[7/7] Rebuilding and starting services..."
docker compose -f docker-compose.dev.yml up --build -d

echo ""
echo "✅ Environment reset complete!"
echo ""
echo "Run './status-dev.sh' to check the status of all services."
echo ""