#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - LOGS VIEWER
# =============================================================================

if [[ $# -eq 0 ]]; then
    echo ""
    echo "Usage: ./logs-dev.sh [service_name]"
    echo ""
    echo "Available services:"
    echo "  all            - All services"
    echo "  api-gateway    - API Gateway"
    echo "  auth-service   - Authentication Service (includes user logic)"
    echo "  property-service - Property Service"
    echo "  poi-service    - Points of Interest Service"
    echo "  postgres       - PostgreSQL Database"
    echo "  redis          - Redis Cache"
    echo "  elasticsearch  - Elasticsearch"
    echo "  rabbitmq       - RabbitMQ Message Broker"
    echo "  minio          - MinIO Object Storage"
    echo "  mailhog        - MailHog Email Testing"
    echo "  prometheus     - Prometheus Monitoring"
    echo "  grafana        - Grafana Dashboard"
    echo "  jaeger         - Jaeger Tracing"
    echo ""
    echo "Examples:"
    echo "  ./logs-dev.sh all"
    echo "  ./logs-dev.sh api-gateway"
    echo "  ./logs-dev.sh postgres"
    echo ""
    exit 1
fi

SERVICE_NAME="$1"

if [[ "$SERVICE_NAME" == "all" ]]; then
    echo "Showing logs for all services..."
    docker compose -f docker-compose.dev.yml logs -f --tail=100
else
    echo "Showing logs for $SERVICE_NAME..."
    docker compose -f docker-compose.dev.yml logs -f --tail=100 "$SERVICE_NAME"
fi