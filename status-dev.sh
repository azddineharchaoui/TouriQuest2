#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - STATUS SCRIPT
# =============================================================================

echo ""
echo "==============================================="
echo "  TouriQuest Development Environment Status"
echo "==============================================="
echo ""

# Check Docker status
echo "[1/4] Docker System Status:"
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker and try again."
    exit 1
else
    echo "✅ Docker is running"
fi
echo ""

# Check containers status
echo "[2/4] Container Status:"
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found or docker-compose.dev.yml not found"
echo ""

# Check service health
echo "[3/4] Service Health Checks:"
echo "Checking API Gateway..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API Gateway (8000)"
else
    echo "❌ API Gateway (8000)"
fi

echo "Checking Auth Service..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Auth Service (8001)"
else
    echo "❌ Auth Service (8001)"
fi

echo "Checking User Service..."
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ User Service (8002)"
else
    echo "❌ User Service (8002)"
fi

echo "Checking Frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend (3000)"
else
    echo "❌ Frontend (3000)"
fi

echo "Checking PostgreSQL..."
if docker exec touriquest-postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL (5432)"
else
    echo "❌ PostgreSQL (5432)"
fi

echo "Checking Redis..."
if docker exec touriquest-redis-dev redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis (6379)"
else
    echo "❌ Redis (6379)"
fi

echo "Checking Elasticsearch..."
if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch (9200)"
else
    echo "❌ Elasticsearch (9200)"
fi
echo ""

# Show useful URLs
echo "[4/4] Development URLs:"
echo ""
echo "🌐 Application:"
echo "  Frontend:          http://localhost:3000"
echo "  API Gateway:       http://localhost:8000"
echo "  API Documentation: http://localhost:8000/docs"
echo ""
echo "🗄️  Databases:"
echo "  PostgreSQL:        localhost:5432 (postgres/postgres)"
echo "  Redis:             localhost:6379"
echo "  Elasticsearch:     http://localhost:9200"
echo ""
echo "🛠️  Development Tools:"
echo "  RabbitMQ UI:       http://localhost:15672 (admin/admin)"
echo "  MailHog UI:        http://localhost:8025"
echo "  MinIO Console:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📊 Monitoring:"
echo "  Grafana:           http://localhost:3001 (admin/admin)"
echo "  Prometheus:        http://localhost:9090"
echo "  Jaeger:            http://localhost:16686"
echo ""