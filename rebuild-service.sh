#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - REBUILD SERVICE SCRIPT
# =============================================================================

set -e

COMPOSE_FILE="docker-compose.dev.yml"
CACHE_DIR=".docker-cache"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

show_help() {
    echo "Rebuild Service - Reconstruction ciblée d'un service"
    echo ""
    echo "Usage: $0 <service-name> [OPTIONS]"
    echo ""
    echo "Services disponibles:"
    echo "  api-gateway, auth-service, property-service, poi-service,"
    echo "  booking-service, experience-service, ai-service, media-service,"
    echo "  notification-service, analytics-service, admin-service,"
    echo "  communication-service, integrations-service, monitoring-service,"
    echo "  recommendation-service, frontend"
    echo ""
    echo "Options:"
    echo "  --no-cache    Ignorer le cache Docker lors de la construction"
    echo "  --restart     Redémarrer le service après la construction"
    echo "  --logs        Afficher les logs après la reconstruction"
    echo ""
    echo "Exemples:"
    echo "  $0 api-gateway                    # Rebuilder l'API Gateway"
    echo "  $0 ai-service --restart --logs    # Rebuilder, redémarrer et voir les logs"
    echo "  $0 frontend --no-cache            # Rebuilder sans cache"
    echo ""
}

# Fonction pour valider le nom du service
validate_service() {
    local service_name="$1"
    local valid_services=(
        "api-gateway" "auth-service" "property-service" "poi-service"
        "booking-service" "experience-service" "ai-service" "media-service"
        "notification-service" "analytics-service" "admin-service"
        "communication-service" "integrations-service" "monitoring-service"
        "recommendation-service" "frontend"
    )
    
    for valid_service in "${valid_services[@]}"; do
        if [ "$service_name" = "$valid_service" ]; then
            return 0
        fi
    done
    
    return 1
}

# Fonction pour nettoyer le cache d'un service
clean_service_cache() {
    local service_name="$1"
    
    if [ -d "$CACHE_DIR" ]; then
        # Supprimer l'entrée du cache de build
        if [ -f "$CACHE_DIR/build-cache.txt" ]; then
            grep -v "^${service_name}:" "$CACHE_DIR/build-cache.txt" > "$CACHE_DIR/build-cache.txt.tmp" 2>/dev/null || true
            mv "$CACHE_DIR/build-cache.txt.tmp" "$CACHE_DIR/build-cache.txt" 2>/dev/null || true
        fi
        
        # Supprimer les caches de hash liés
        find "$CACHE_DIR" -name "hash_*${service_name}*.cache" -delete 2>/dev/null || true
    fi
}

# Fonction pour rebuilder un service
rebuild_service() {
    local service_name="$1"
    local no_cache="$2"
    local restart_service="$3"
    local show_logs="$4"
    
    echo ""
    echo "==============================================="
    echo "   🔄 Reconstruction du service: $service_name"
    echo "==============================================="
    echo ""
    
    # Vérifier que le service existe dans le compose file
    if ! docker compose -f "$COMPOSE_FILE" config --services | grep -q "^${service_name}$"; then
        log_error "Service '$service_name' non trouvé dans le fichier docker-compose"
        return 1
    fi
    
    # Nettoyer le cache du service
    log_info "Nettoyage du cache pour $service_name..."
    clean_service_cache "$service_name"
    
    # Arrêter le service s'il tourne
    log_info "Arrêt du service $service_name..."
    docker compose -f "$COMPOSE_FILE" stop "$service_name" &> /dev/null || true
    
    # Supprimer le conteneur
    docker compose -f "$COMPOSE_FILE" rm -f "$service_name" &> /dev/null || true
    
    # Construire le service
    log_info "Construction du service $service_name..."
    
    local build_cmd="docker compose -f $COMPOSE_FILE build"
    if [ "$no_cache" = "true" ]; then
        build_cmd="$build_cmd --no-cache"
        log_warning "Construction sans cache (plus lent)"
    fi
    
    if $build_cmd "$service_name"; then
        log_success "Service $service_name construit avec succès"
    else
        log_error "Échec de la construction du service $service_name"
        return 1
    fi
    
    # Redémarrer le service si demandé
    if [ "$restart_service" = "true" ]; then
        log_info "Redémarrage du service $service_name..."
        if docker compose -f "$COMPOSE_FILE" up -d "$service_name"; then
            log_success "Service $service_name redémarré avec succès"
            
            # Attendre un peu que le service se stabilise
            sleep 3
            
            # Vérifier le statut
            local status=$(docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}} {{.State}}" | grep "^${service_name}" | awk '{print $2}')
            if [ "$status" = "running" ]; then
                log_success "Service $service_name est en cours d'exécution"
            else
                log_warning "Service $service_name: statut $status"
            fi
        else
            log_error "Échec du redémarrage du service $service_name"
        fi
    fi
    
    # Afficher les logs si demandé
    if [ "$show_logs" = "true" ]; then
        echo ""
        log_info "Logs du service $service_name (Ctrl+C pour quitter):"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=50 "$service_name"
    fi
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

# Vérifier les arguments
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

SERVICE_NAME="$1"
NO_CACHE=false
RESTART_SERVICE=false
SHOW_LOGS=false

# Parser les options
shift
while [ $# -gt 0 ]; do
    case "$1" in
        --no-cache)
            NO_CACHE=true
            ;;
        --restart)
            RESTART_SERVICE=true
            ;;
        --logs)
            SHOW_LOGS=true
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Valider le nom du service
if ! validate_service "$SERVICE_NAME"; then
    log_error "Service invalide: $SERVICE_NAME"
    echo ""
    show_help
    exit 1
fi

# Vérifier que Docker fonctionne
if ! docker info &> /dev/null; then
    log_error "Docker n'est pas en cours d'exécution"
    exit 1
fi

# Vérifier que le fichier compose existe
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Fichier $COMPOSE_FILE non trouvé"
    exit 1
fi

# Executer la reconstruction
rebuild_service "$SERVICE_NAME" "$NO_CACHE" "$RESTART_SERVICE" "$SHOW_LOGS"

echo ""
log_success "🎉 Reconstruction du service $SERVICE_NAME terminée!"
echo ""
echo "💡 Commandes utiles:"
echo "   ./status-dev.sh                     # Vérifier le statut de tous les services"
echo "   docker compose logs $SERVICE_NAME   # Voir les logs du service"
echo "   ./start-dev-ultra.sh                # Redémarrer tous les services optimisés"
echo ""