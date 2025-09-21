#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - OPTIMIZED START SCRIPT
# =============================================================================

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="touriquest2"
CACHE_DIR=".docker-cache"
BUILD_CACHE_FILE="$CACHE_DIR/build-cache.txt"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Fonction pour calculer le hash d'un répertoire
calculate_dir_hash() {
    local dir=$1
    if [ -d "$dir" ]; then
        find "$dir" -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "Dockerfile*" -o -name "requirements.txt" -o -name "package*.json" \) -exec md5sum {} \; | sort | md5sum | cut -d' ' -f1
    else
        echo "notfound"
    fi
}

# Fonction pour vérifier si une image existe
image_exists() {
    local image_name=$1
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "^${image_name}:" 2>/dev/null
}

# Fonction pour vérifier si un service est déjà en cours d'exécution
service_running() {
    local service_name=$1
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}} {{.State}}" | grep -q "^${service_name}[[:space:]]*running" 2>/dev/null
}

# Fonction pour vérifier si le service a changé
service_changed() {
    local service_name=$1
    local service_dir=$2
    
    mkdir -p "$CACHE_DIR"
    
    local current_hash=$(calculate_dir_hash "$service_dir")
    local cached_hash=""
    
    if [ -f "$BUILD_CACHE_FILE" ]; then
        cached_hash=$(grep "^${service_name}:" "$BUILD_CACHE_FILE" | cut -d':' -f2)
    fi
    
    if [ "$current_hash" != "$cached_hash" ]; then
        return 0  # Changed
    else
        return 1  # Not changed
    fi
}

# Fonction pour mettre à jour le cache
update_service_cache() {
    local service_name=$1
    local service_dir=$2
    
    mkdir -p "$CACHE_DIR"
    
    local current_hash=$(calculate_dir_hash "$service_dir")
    
    # Supprimer l'ancienne entrée et ajouter la nouvelle
    if [ -f "$BUILD_CACHE_FILE" ]; then
        grep -v "^${service_name}:" "$BUILD_CACHE_FILE" > "${BUILD_CACHE_FILE}.tmp" || true
        mv "${BUILD_CACHE_FILE}.tmp" "$BUILD_CACHE_FILE"
    fi
    
    echo "${service_name}:${current_hash}" >> "$BUILD_CACHE_FILE"
}

# Fonction pour construire un service si nécessaire
build_service_if_needed() {
    local service_name=$1
    local service_dir=$2
    local image_name="${PROJECT_NAME}-${service_name}"
    
    log_info "Vérification du service $service_name..."
    
    # Vérifier si l'image existe déjà
    if image_exists "$image_name"; then
        # Vérifier si le code source a changé
        if service_changed "$service_name" "$service_dir"; then
            log_warning "Code source modifié pour $service_name, reconstruction nécessaire..."
            docker compose -f "$COMPOSE_FILE" build "$service_name"
            update_service_cache "$service_name" "$service_dir"
            log_success "Service $service_name reconstruit avec succès"
        else
            log_success "Service $service_name inchangé, utilisation de l'image existante"
        fi
    else
        log_info "Image $image_name non trouvée, construction en cours..."
        docker compose -f "$COMPOSE_FILE" build "$service_name"
        update_service_cache "$service_name" "$service_dir"
        log_success "Service $service_name construit avec succès"
    fi
}

echo ""
echo "==============================================="
echo "   TouriQuest Development Environment Start"
echo "          🚀 MODE OPTIMISÉ 🚀"
echo "==============================================="
echo ""

# [1] Vérifier Docker
log_info "Vérification du statut Docker..."
if ! docker info &> /dev/null; then
    log_error "Docker n'est pas en cours d'exécution"
    echo "Démarrez Docker daemon avec: sudo systemctl start docker"
    exit 1
else
    log_success "Docker est en cours d'exécution"
fi

# [2] Vérifier le fichier Docker Compose
log_info "Vérification du fichier Docker Compose..."
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "$COMPOSE_FILE non trouvé"
    echo "Assurez-vous d'être dans le bon répertoire"
    exit 1
else
    log_success "Fichier Docker Compose trouvé"
fi

# [3] Créer les répertoires de données
log_info "Création des répertoires de données..."
mkdir -p data/{postgres,redis,elasticsearch,minio} logs
log_success "Répertoires de données prêts"

# [4] Vérifier et construire uniquement les services modifiés
log_info "Analyse des services pour optimiser la construction..."

# Services à construire avec leurs répertoires
declare -A SERVICES
SERVICES["api-gateway"]="./touriquest-backend/services/api-gateway"
SERVICES["auth-service"]="./touriquest-backend/services/auth-service"
SERVICES["property-service"]="./touriquest-backend/services/property-service"
SERVICES["poi-service"]="./touriquest-backend/services/poi-service"
SERVICES["booking-service"]="./touriquest-backend/services/booking-service"
SERVICES["experience-service"]="./touriquest-backend/services/experience-service"
SERVICES["ai-service"]="./touriquest-backend/services/ai-service"
SERVICES["media-service"]="./touriquest-backend/services/media-service"
SERVICES["notification-service"]="./touriquest-backend/services/notification-service"
SERVICES["analytics-service"]="./touriquest-backend/services/analytics-service"
SERVICES["admin-service"]="./touriquest-backend/services/admin-service"
SERVICES["communication-service"]="./touriquest-backend/services/communication-service"
SERVICES["integrations-service"]="./touriquest-backend/services/integrations-service"
SERVICES["monitoring-service"]="./touriquest-backend/services/monitoring-service"
SERVICES["recommendation-service"]="./touriquest-backend/services/recommendation-service"
SERVICES["frontend"]="./frontend"

# Construire les services modifiés
for service in "${!SERVICES[@]}"; do
    build_service_if_needed "$service" "${SERVICES[$service]}"
done

# [5] Démarrer les services
log_info "Démarrage des services..."

# Vérifier quels services sont déjà en cours d'exécution
RUNNING_SERVICES=()
STOPPED_SERVICES=()

for service in "${!SERVICES[@]}"; do
    if service_running "$service"; then
        RUNNING_SERVICES+=("$service")
    else
        STOPPED_SERVICES+=("$service")
    fi
done

# Démarrer seulement les services arrêtés
if [ ${#STOPPED_SERVICES[@]} -eq 0 ]; then
    log_success "Tous les services sont déjà en cours d'exécution"
else
    log_info "Démarrage des services arrêtés: ${STOPPED_SERVICES[*]}"
    if ! docker compose -f "$COMPOSE_FILE" up -d "${STOPPED_SERVICES[@]}"; then
        log_error "Échec du démarrage des services"
        echo "Vérifiez les logs avec: docker compose -f $COMPOSE_FILE logs"
        exit 1
    fi
fi

# Démarrer tous les services (infrastructure incluse)
if ! docker compose -f "$COMPOSE_FILE" up -d; then
    log_error "Échec du démarrage des services"
    echo "Vérifiez les logs avec: docker compose -f $COMPOSE_FILE logs"
    exit 1
fi

log_success "Tous les services ont été démarrés avec succès"

# [6] Vérification de la santé des services
log_info "Vérification de la santé des services..."
log_warning "Cela peut prendre 30-60 secondes pour les nouveaux services..."

# Attendre un peu pour que les services se stabilisent
sleep 10

# Vérifier les services clés
SERVICES_OK=true

log_info "Vérification de PostgreSQL..."
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &> /dev/null; then
    log_success "PostgreSQL est prêt"
else
    log_warning "PostgreSQL démarre encore"
    SERVICES_OK=false
fi

log_info "Vérification de Redis..."
if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
    log_success "Redis est prêt"
else
    log_warning "Redis démarre encore"
    SERVICES_OK=false
fi

log_info "Vérification de l'API Gateway..."
if curl -s http://localhost:8000/health &> /dev/null; then
    log_success "API Gateway est prêt"
else
    log_warning "API Gateway démarre encore"
    SERVICES_OK=false
fi

echo ""
echo "==============================================="
echo "   Environnement de développement démarré! 🚀"
echo "==============================================="
echo ""

if [ "$SERVICES_OK" = true ]; then
    log_success "🎉 Tous les services sont opérationnels et en bonne santé!"
else
    log_warning "Certains services démarrent encore. C'est normal pour le premier lancement."
    echo "   Exécutez './status-dev.sh' dans quelques minutes pour vérifier à nouveau."
fi

echo ""
echo "🌐 Votre application est maintenant disponible à :"
echo ""
echo "   Frontend:          http://localhost:3000"
echo "   API Gateway:       http://localhost:8000"
echo "   Documentation API: http://localhost:8000/docs"
echo ""
echo "🛠️  Outils de développement:"
echo "   RabbitMQ UI:       http://localhost:15672 (admin/admin)"
echo "   MailHog UI:        http://localhost:8025"
echo "   Console MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📊 Surveillance:"
echo "   Grafana:           http://localhost:3001 (admin/admin)"
echo "   Prometheus:        http://localhost:9090"
echo "   Jaeger:            http://localhost:16686"
echo ""
echo "💡 Commandes utiles:"
echo "   ./status-dev.sh           - Vérifier le statut de tous les services"
echo "   ./logs-dev.sh             - Voir les logs des services"
echo "   ./stop-dev.sh             - Arrêter tous les services"
echo "   ./rebuild-service.sh <nom> - Forcer la reconstruction d'un service"
echo ""

# Afficher les statistiques d'optimisation
if [ ${#RUNNING_SERVICES[@]} -gt 0 ]; then
    echo "⚡ Optimisation:"
    echo "   Services déjà en cours: ${#RUNNING_SERVICES[@]}"
    echo "   Services redémarrés: ${#STOPPED_SERVICES[@]}"
    echo "   Temps gagné: ~$(( ${#RUNNING_SERVICES[@]} * 30 )) secondes"
    echo ""
fi