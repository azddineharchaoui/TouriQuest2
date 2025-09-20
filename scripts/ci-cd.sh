#!/usr/bin/env bash

# =============================================================================
# TouriQuest CI/CD Helper Scripts
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Help function
show_help() {
    cat << EOF
TouriQuest CI/CD Helper Script

Usage: $0 [COMMAND]

Commands:
  setup-dev       Set up development environment
  run-tests       Run complete test suite
  build-images    Build all Docker images
  deploy-staging  Deploy to staging environment
  deploy-prod     Deploy to production environment
  rollback        Rollback deployment
  health-check    Check system health
  cleanup         Clean up old resources
  help            Show this help message

Examples:
  $0 setup-dev
  $0 run-tests
  $0 deploy-staging
EOF
}

# Setup development environment
setup_dev() {
    log "Setting up development environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f docker-compose.dev.yml pull
    
    # Build development images
    log "Building development images..."
    docker-compose -f docker-compose.dev.yml build
    
    # Start services
    log "Starting development services..."
    docker-compose -f docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health "localhost:5432" "PostgreSQL"
    check_service_health "localhost:6379" "Redis"
    check_service_health "localhost:9200" "Elasticsearch"
    
    success "Development environment is ready!"
    log "Services available at:"
    log "  - API Gateway: http://localhost:8000"
    log "  - PostgreSQL: localhost:5432"
    log "  - Redis: localhost:6379"
    log "  - Elasticsearch: localhost:9200"
    log "  - Grafana: http://localhost:3000 (admin/admin)"
    log "  - Prometheus: http://localhost:9090"
    log "  - Jaeger: http://localhost:16686"
    log "  - MailHog: http://localhost:8025"
}

# Run tests
run_tests() {
    log "Running complete test suite..."
    
    # Check if test environment is ready
    if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        error "Development environment is not running. Run 'setup-dev' first."
        exit 1
    fi
    
    # Run pre-commit checks
    log "Running pre-commit checks..."
    pre-commit run --all-files || warning "Pre-commit checks failed"
    
    # Run unit tests
    log "Running unit tests..."
    docker-compose -f docker-compose.dev.yml exec -T api-gateway pytest tests/unit/ -v --cov=src --cov-report=html
    
    # Run integration tests
    log "Running integration tests..."
    docker-compose -f docker-compose.dev.yml exec -T api-gateway pytest tests/integration/ -v
    
    # Run E2E tests
    log "Running E2E tests..."
    docker-compose -f docker-compose.dev.yml exec -T api-gateway pytest tests/e2e/ -v
    
    success "All tests completed!"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # List of services to build
    services=("api-gateway" "auth-service" "user-service" "property-service" 
              "booking-service" "poi-service" "experience-service" "ai-service" 
              "media-service" "notification-service" "analytics-service" "admin-service")
    
    for service in "${services[@]}"; do
        log "Building $service..."
        docker build -t "ghcr.io/azddineharchaoui/touriquest2/$service:latest" \
                     -f "docker/$service/Dockerfile" .
        
        # Tag for staging
        docker tag "ghcr.io/azddineharchaoui/touriquest2/$service:latest" \
                   "ghcr.io/azddineharchaoui/touriquest2/$service:staging"
    done
    
    success "All images built successfully!"
}

# Deploy to staging
deploy_staging() {
    log "Deploying to staging environment..."
    
    # Check kubectl access
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster. Please check your kubectl configuration."
        exit 1
    fi
    
    # Apply staging configurations
    log "Applying staging configurations..."
    kubectl apply -f k8s/staging/
    
    # Wait for deployment to complete
    log "Waiting for deployment to complete..."
    kubectl rollout status deployment/api-gateway -n touriquest-staging --timeout=600s
    kubectl rollout status deployment/auth-service -n touriquest-staging --timeout=600s
    
    # Run health checks
    log "Running health checks..."
    kubectl apply -f k8s/staging/health-check-job.yaml
    kubectl wait --for=condition=complete job/health-check -n touriquest-staging --timeout=300s
    
    success "Staging deployment completed successfully!"
}

# Deploy to production
deploy_prod() {
    log "Deploying to production environment..."
    
    # Confirmation prompt
    read -p "Are you sure you want to deploy to production? (yes/no): " confirm
    if [[ $confirm != "yes" ]]; then
        log "Production deployment cancelled."
        exit 0
    fi
    
    # Deploy green environment
    log "Deploying green environment..."
    kubectl apply -f k8s/production/green/
    
    # Wait for green deployment
    log "Waiting for green deployment to be ready..."
    kubectl rollout status deployment/api-gateway-green -n touriquest-production --timeout=600s
    
    # Run health checks on green
    log "Running health checks on green environment..."
    kubectl apply -f k8s/production/health-check-green.yaml
    kubectl wait --for=condition=complete job/health-check-green -n touriquest-production --timeout=300s
    
    # Switch traffic to green
    log "Switching traffic to green environment..."
    kubectl patch service touriquest-service -n touriquest-production -p '{"spec":{"selector":{"version":"green"}}}'
    
    # Monitor for issues
    log "Monitoring deployment for 60 seconds..."
    sleep 60
    
    # Scale down blue environment
    log "Scaling down blue environment..."
    kubectl scale deployment api-gateway-blue -n touriquest-production --replicas=0
    
    success "Production deployment completed successfully!"
}

# Rollback deployment
rollback() {
    log "Rolling back deployment..."
    
    # Check which environment
    read -p "Rollback staging or production? (staging/production): " env
    
    if [[ $env == "production" ]]; then
        # Switch back to blue
        log "Switching traffic back to blue environment..."
        kubectl patch service touriquest-service -n touriquest-production -p '{"spec":{"selector":{"version":"blue"}}}'
        kubectl scale deployment api-gateway-blue -n touriquest-production --replicas=3
        
        # Clean up failed green deployment
        log "Cleaning up failed green deployment..."
        kubectl delete deployment api-gateway-green -n touriquest-production
        
        success "Production rollback completed!"
        
    elif [[ $env == "staging" ]]; then
        log "Rolling back staging deployment..."
        kubectl rollout undo deployment/api-gateway -n touriquest-staging
        kubectl rollout undo deployment/auth-service -n touriquest-staging
        
        success "Staging rollback completed!"
    else
        error "Invalid environment. Please specify 'staging' or 'production'."
        exit 1
    fi
}

# Health check
health_check() {
    log "Checking system health..."
    
    # Check development services
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        log "Development environment status:"
        check_service_health "localhost:8000" "API Gateway"
        check_service_health "localhost:5432" "PostgreSQL"
        check_service_health "localhost:6379" "Redis"
        check_service_health "localhost:9200" "Elasticsearch"
    fi
    
    # Check staging environment
    if kubectl get namespace touriquest-staging &> /dev/null; then
        log "Staging environment status:"
        kubectl get pods -n touriquest-staging
    fi
    
    # Check production environment
    if kubectl get namespace touriquest-production &> /dev/null; then
        log "Production environment status:"
        kubectl get pods -n touriquest-production
    fi
}

# Helper function to check service health
check_service_health() {
    local host=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z ${host%:*} ${host#*:} 2>/dev/null; then
            success "$service_name is healthy"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "$service_name is not responding after $max_attempts attempts"
            return 1
        fi
        
        log "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Clean up Docker
    log "Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    
    # Clean up old Kubernetes resources
    if kubectl cluster-info &> /dev/null; then
        log "Cleaning up old Kubernetes resources..."
        kubectl delete pods --field-selector=status.phase=Succeeded -A
        kubectl delete pods --field-selector=status.phase=Failed -A
    fi
    
    success "Cleanup completed!"
}

# Main script logic
case "${1:-help}" in
    setup-dev)
        setup_dev
        ;;
    run-tests)
        run_tests
        ;;
    build-images)
        build_images
        ;;
    deploy-staging)
        deploy_staging
        ;;
    deploy-prod)
        deploy_prod
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    help|*)
        show_help
        ;;
esac