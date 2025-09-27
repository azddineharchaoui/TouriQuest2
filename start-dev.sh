#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - START SCRIPT (OPTIMIZED)
# =============================================================================

set -e  # Exit on any error

# Vérifier si le script ultra-optimisé existe et l'utiliser par défaut
if [ -f "start-dev-ultra.sh" ] && [ "$1" != "--legacy" ]; then
    echo ""
    echo "🚀 Utilisation du mode ultra-optimisé pour un démarrage plus rapide..."
    echo "   (Utilisez --legacy pour forcer l'ancien comportement)"
    echo ""
    exec bash start-dev-ultra.sh "$@"
fi

# Mode legacy (comportement original)
echo ""
echo "==============================================="
echo "   TouriQuest Development Environment Start"
echo "            (Mode Legacy)"
echo "==============================================="
echo ""

echo "[1/5] Checking Docker status..."
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "Please start Docker daemon with: sudo systemctl start docker"
    exit 1
else
    echo "✅ Docker is running"
fi

echo ""
echo "[2/5] Checking Docker Compose file..."
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found"
    echo "Please ensure you're in the correct directory"
    exit 1
else
    echo "✅ Docker Compose file found"
fi

echo ""
echo "[3/5] Creating data directories if they don't exist..."
mkdir -p data/{postgres,redis,elasticsearch,minio} logs
echo "✅ Data directories ready"

echo ""
echo "[4/5] Starting all services..."
echo "This may take a few minutes on first run..."
echo "⚠️  Mode legacy: reconstruction possible de toutes les images"

if ! docker compose -f docker-compose.dev.yml up -d; then
    echo "❌ Failed to start services"
    echo "Check the logs with: docker compose -f docker-compose.dev.yml logs"
    exit 1
fi

echo "✅ All services started successfully"

echo ""
echo "[5/5] Waiting for services to be healthy..."
echo "Checking service health (this may take 30-60 seconds)..."

# Wait for services to be ready
sleep 15

# Check some key services
SERVICES_OK=true

echo "Checking PostgreSQL..."
if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is still starting up"
    SERVICES_OK=false
fi

echo "Checking Redis..."
if docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping &> /dev/null; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is still starting up"
    SERVICES_OK=false
fi

echo "Checking API Gateway..."
if curl -s http://localhost:8000/health &> /dev/null; then
    echo "✅ API Gateway is ready"
else
    echo "⚠️  API Gateway is still starting up"
    SERVICES_OK=false
fi

echo ""
echo "==============================================="
echo "   Development Environment Started! 🚀"
echo "==============================================="
echo ""

if [ "$SERVICES_OK" = true ]; then
    echo "🎉 All services are running and healthy!"
else
    echo "⚠️  Some services are still starting up. This is normal on first run."
    echo "   Run './status-dev.sh' in a few minutes to check again."
fi

echo ""
echo "🌐 Your application is now available at:"
echo ""
echo "   Frontend:          http://localhost:3000"
echo "   API Gateway:       http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "🛠️  Development Tools:"
echo "   RabbitMQ UI:       http://localhost:15672 (admin/admin)"
echo "   MailHog UI:        http://localhost:8025"
echo "   MinIO Console:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📊 Monitoring:"
echo "   Grafana:           http://localhost:3001 (admin/admin)"
echo "   Prometheus:        http://localhost:9090"
echo "   Jaeger:            http://localhost:16686"
echo ""
echo "💡 Useful Commands:"
echo "   ./status-dev.sh    - Check status of all services"
echo "   ./logs-dev.sh      - View service logs"
echo "   ./stop-dev.sh      - Stop all services"
echo ""