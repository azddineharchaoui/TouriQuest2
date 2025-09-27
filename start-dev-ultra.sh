#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - ULTRA OPTIMIZED START SCRIPT
# =============================================================================

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="touriquest2"
CACHE_DIR=".docker-cache"
BUILD_CACHE_FILE="$CACHE_DIR/build-cache.txt"
CONTAINER_CACHE_FILE="$CACHE_DIR/container-cache.txt"
SERVICES_STATUS_FILE="$CACHE_DIR/services-status.txt"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_skip() { echo -e "${CYAN}⏭️  $1${NC}"; }
log_optimize() { echo -e "${PURPLE}⚡ $1${NC}"; }

# Fonction pour calculer le hash d'un répertoire avec cache amélioré
calculate_dir_hash() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        echo "notfound"
        return
    fi
    
    # Utiliser un cache par répertoire pour éviter les recalculs
    local cache_file="$CACHE_DIR/hash_$(echo "$dir" | tr '/' '_').cache"
    local dir_mtime=$(stat -c %Y "$dir" 2>/dev/null || echo "0")
    
    # Vérifier si le cache est valide
    if [ -f "$cache_file" ]; then
        local cached_mtime=$(head -n1 "$cache_file" 2>/dev/null || echo "0")
        if [ "$dir_mtime" = "$cached_mtime" ]; then
            tail -n1 "$cache_file"
            return
        fi
    fi
    
    # Calculer le nouveau hash
    local hash=$(find "$dir" -type f \( \
        -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o \
        -name "*.json" -o -name "Dockerfile*" -o -name "requirements*.txt" -o \
        -name "package*.json" -o -name "poetry.lock" -o -name "pyproject.toml" -o \
        -name "*.yml" -o -name "*.yaml" -o -name "*.toml" \
        \) -newer "$cache_file" 2>/dev/null | wc -l)
    
    # Mettre à jour le cache
    mkdir -p "$CACHE_DIR"
    echo "$dir_mtime" > "$cache_file"
    echo "$hash" >> "$cache_file"
    echo "$hash"
}

# Fonction améliorée pour vérifier si une image existe et sa version
image_exists_and_fresh() {
    local service_name=$1
    local image_name="${PROJECT_NAME}-${service_name}"
    
    # Vérifier si l'image existe
    if ! docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "^${image_name}:" 2>/dev/null; then
        return 1
    fi
    
    # Vérifier l'âge de l'image (optionnel - pour éviter les images trop anciennes)
    local image_age=$(docker images --format "table {{.Repository}}:{{.Tag}} {{.CreatedSince}}" | grep "^${image_name}:" | head -1 | awk '{print $3}')
    
    return 0
}

# Fonction pour vérifier si un service est en cours d'exécution ET healthy
service_running_and_healthy() {
    local service_name=$1
    
    # Vérifier si le service est running
    local status=$(docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}} {{.State}}" | grep "^${service_name}[[:space:]]" | awk '{print $2}' 2>/dev/null)
    
    if [ "$status" != "running" ]; then
        return 1
    fi
    
    # Vérifier le health status si disponible
    local health=$(docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}} {{.Status}}" | grep "^${service_name}[[:space:]]" | awk '{print $2}' 2>/dev/null)
    
    # Si le service a un healthcheck et qu'il n'est pas healthy, retourner false
    if [[ "$health" == *"unhealthy"* ]]; then
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier si le service a changé
service_changed() {
    local service_name=$1
    local service_dir=$2
    
    mkdir -p "$CACHE_DIR"
    
    local current_hash=$(calculate_dir_hash "$service_dir")
    local cached_hash=""
    
    if [ -f "$BUILD_CACHE_FILE" ]; then
        cached_hash=$(grep "^${service_name}:" "$BUILD_CACHE_FILE" 2>/dev/null | cut -d':' -f2)
    fi
    
    if [ "$current_hash" != "$cached_hash" ] || [ -z "$cached_hash" ]; then
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
        grep -v "^${service_name}:" "$BUILD_CACHE_FILE" > "${BUILD_CACHE_FILE}.tmp" 2>/dev/null || true
        mv "${BUILD_CACHE_FILE}.tmp" "$BUILD_CACHE_FILE" 2>/dev/null || true
    fi
    
    echo "${service_name}:${current_hash}" >> "$BUILD_CACHE_FILE"
}

# Fonction optimisée pour construire un service si nécessaire
build_service_if_needed() {
    local service_name=$1
    local service_dir=$2
    local force_build=${3:-false}
    
    log_info "Analyse du service $service_name..."
    
    # Vérifier si le service tourne déjà et est healthy
    if [ "$force_build" != "true" ] && service_running_and_healthy "$service_name"; then
        log_skip "Service $service_name déjà en cours et healthy, pas de reconstruction nécessaire"
        return 0
    fi
    
    # Vérifier si l'image existe
    if [ "$force_build" != "true" ] && image_exists_and_fresh "$service_name"; then
        # Vérifier si le code source a changé
        if ! service_changed "$service_name" "$service_dir"; then
            log_skip "Service $service_name inchangé, utilisation de l'image existante"
            return 0
        fi
    fi
    
    # Build nécessaire
    if service_changed "$service_name" "$service_dir" || ! image_exists_and_fresh "$service_name"; then
        log_warning "Construction nécessaire pour $service_name..."
        
        # Build avec cache Docker pour accélérer
        if docker compose -f "$COMPOSE_FILE" build --progress=auto "$service_name"; then
            update_service_cache "$service_name" "$service_dir"
            log_success "Service $service_name construit avec succès"
        else
            log_error "Échec de la construction du service $service_name"
            return 1
        fi
    else
        log_skip "Service $service_name déjà à jour"
    fi
}

# Fonction pour démarrer uniquement les services nécessaires
start_services_optimized() {
    local services_to_start=()
    local services_already_running=()
    
    # Lister tous les services du compose file
    local all_services=$(docker compose -f "$COMPOSE_FILE" config --services)
    
    for service in $all_services; do
        if service_running_and_healthy "$service"; then
            services_already_running+=("$service")
        else
            services_to_start+=("$service")
        fi
    done
    
    if [ ${#services_already_running[@]} -gt 0 ]; then
        log_optimize "Services déjà en cours (${#services_already_running[@]}): ${services_already_running[*]}"
    fi
    
    if [ ${#services_to_start[@]} -eq 0 ]; then
        log_success "Tous les services sont déjà en cours d'exécution et healthy"
        return 0
    fi
    
    log_info "Démarrage des services nécessaires (${#services_to_start[@]}): ${services_to_start[*]}"
    
    # Démarrer les services avec une stratégie optimisée
    if docker compose -f "$COMPOSE_FILE" up -d --no-recreate "${services_to_start[@]}"; then
        log_success "Services démarrés avec succès"
        
        # Calculer le temps économisé
        local time_saved=$(( ${#services_already_running[@]} * 15 ))
        if [ $time_saved -gt 0 ]; then
            log_optimize "Temps économisé: ~${time_saved} secondes grâce à l'optimisation"
        fi
    else
        log_error "Échec du démarrage des services"
        return 1
    fi
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

echo ""
echo "==============================================="
echo "   TouriQuest Development Environment Start"
echo "          🚀 MODE ULTRA OPTIMISÉ 🚀"
echo "==============================================="
echo ""

# [1] Vérifier Docker
log_info "Vérification du statut Docker..."
if ! docker info &> /dev/null; then
    log_error "Docker n'est pas en cours d'exécution"
    echo "Démarrez Docker avec: sudo systemctl start docker (Linux) ou Docker Desktop (Windows/Mac)"
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
log_info "Préparation des répertoires de données..."
mkdir -p data/{postgres,redis,elasticsearch,minio} logs "$CACHE_DIR"
log_success "Répertoires de données prêts"

# [4] Vérifier et construire uniquement les services modifiés
log_info "Analyse intelligente des services pour optimiser la construction..."

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

# Vérifier les arguments de ligne de commande
FORCE_BUILD=false
if [ "$1" = "--force-build" ] || [ "$1" = "-f" ]; then
    FORCE_BUILD=true
    log_warning "Mode force build activé - reconstruction de tous les services"
fi

# Analyser et construire les services
BUILT_SERVICES=0
SKIPPED_SERVICES=0

for service in "${!SERVICES[@]}"; do
    if build_service_if_needed "$service" "${SERVICES[$service]}" "$FORCE_BUILD"; then
        if service_changed "$service" "${SERVICES[$service]}" || [ "$FORCE_BUILD" = "true" ]; then
            BUILT_SERVICES=$((BUILT_SERVICES + 1))
        else
            SKIPPED_SERVICES=$((SKIPPED_SERVICES + 1))
        fi
    else
        log_error "Erreur lors de la construction du service $service"
        exit 1
    fi
done

# [5] Démarrer les services avec optimisation
log_info "Démarrage optimisé des services..."
if ! start_services_optimized; then
    log_error "Échec du démarrage des services"
    echo "Vérifiez les logs avec: docker compose -f $COMPOSE_FILE logs"
    exit 1
fi

# [6] Vérification rapide de la santé des services critiques
log_info "Vérification rapide de la santé des services critiques..."

# Attendre un peu pour que les services se stabilisent
sleep 5

# Vérifier seulement les services critiques pour l'expérience utilisateur
CRITICAL_SERVICES_OK=true

# PostgreSQL
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &> /dev/null; then
    log_success "PostgreSQL ✓"
else
    log_warning "PostgreSQL encore en démarrage..."
    CRITICAL_SERVICES_OK=false
fi

# Redis
if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
    log_success "Redis ✓"
else
    log_warning "Redis encore en démarrage..."
    CRITICAL_SERVICES_OK=false
fi

# API Gateway (test non bloquant)
if timeout 3 curl -s http://localhost:8000/health &> /dev/null; then
    log_success "API Gateway ✓"
else
    log_warning "API Gateway encore en démarrage..."
    CRITICAL_SERVICES_OK=false
fi

# =============================================================================
# RAPPORT FINAL
# =============================================================================

echo ""
echo "==============================================="
echo "   🎉 Environnement de développement prêt!"
echo "==============================================="
echo ""

# Statistiques d'optimisation
log_optimize "📊 Statistiques d'optimisation:"
echo "   • Services construits: $BUILT_SERVICES"
echo "   • Services ignorés (déjà à jour): $SKIPPED_SERVICES"
echo "   • Temps économisé estimé: ~$(( SKIPPED_SERVICES * 30 )) secondes"
echo ""

if [ "$CRITICAL_SERVICES_OK" = true ]; then
    log_success "🚀 Tous les services critiques sont opérationnels!"
else
    log_warning "⏳ Certains services finalisent leur démarrage (normal lors du premier lancement)"
    echo "   Utilisez './status-dev.sh' pour vérifier le statut complet"
fi

echo ""
echo "🌐 Applications disponibles:"
echo "   • Frontend:          http://localhost:3000"
echo "   • API Gateway:       http://localhost:8000"
echo "   • Documentation API: http://localhost:8000/docs"
echo ""
echo "🛠️  Outils de développement:"
echo "   • RabbitMQ UI:       http://localhost:15672 (admin/admin)"
echo "   • MailHog UI:        http://localhost:8025"
echo "   • Console MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📊 Surveillance et monitoring:"
echo "   • Grafana:           http://localhost:3001 (admin/admin)"
echo "   • Prometheus:        http://localhost:9090"
echo "   • Jaeger:            http://localhost:16686"
echo ""
echo "💡 Commandes utiles:"
echo "   • ./start-dev-ultra.sh --force-build  : Forcer la reconstruction"
echo "   • ./status-dev.sh                     : Statut détaillé des services"
echo "   • ./logs-dev.sh                       : Voir les logs en temps réel"
echo "   • ./stop-dev.sh                       : Arrêter tous les services"
echo ""