#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - STOP SCRIPT (WSL/Ubuntu)
# =============================================================================

echo ""
echo "==============================================="
echo "   TouriQuest Development Environment Stop"
echo "==============================================="
echo ""

echo "[1/3] Checking Docker status..."
if ! docker info &> /dev/null; then
    echo "⚠️  Docker is not running"
    echo "Services may already be stopped"
else
    echo "✅ Docker is running"
fi

echo ""
echo "[2/3] Stopping all services gracefully..."

if docker compose -f docker-compose.dev.yml down; then
    echo "✅ All services stopped successfully"
else
    echo "⚠️  Some services may have failed to stop properly"
    echo "You can check running containers with: docker ps"
fi

echo ""
echo "[3/3] Checking for remaining containers..."

REMAINING=$(docker ps -q --filter "name=touriquest-*-dev" | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ All TouriQuest containers have been stopped"
else
    echo "⚠️  $REMAINING TouriQuest containers are still running"
    echo "   You can force stop them with: docker stop \$(docker ps -q --filter \"name=touriquest-*-dev\")"
fi

echo ""
echo "==============================================="
echo "   Development Environment Stopped! 🛑"
echo "==============================================="
echo ""
echo "📝 Notes:"
echo "   - All containers have been stopped"
echo "   - Data volumes are preserved"
echo "   - To start again: ./start-dev.sh"
echo "   - To clean up everything: ./clean-dev.sh"
echo ""
echo "💡 Next steps:"
echo "   - Use './start-dev.sh' to restart the environment"
echo "   - Use './clean-dev.sh' to remove containers and volumes"
echo "   - Use './reset-dev.sh' to completely reset the environment"
echo ""