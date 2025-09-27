#!/bin/bash
# =============================================================================
# TouriQuest Development Environment - CACHE MANAGER
# =============================================================================

set -e

CACHE_DIR=".docker-cache"
COMPOSE_FILE="docker-compose.dev.yml"

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
    echo "Cache Manager pour TouriQuest Development Environment"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status     Afficher le statut du cache"
    echo "  clean      Nettoyer tout le cache"
    echo "  rebuild    Nettoyer le cache et forcer la reconstruction"
    echo "  service    Nettoyer le cache d'un service spécifique"
    echo "  help       Afficher cette aide"
    echo ""
}

show_cache_status() {
    echo ""
    echo "==============================================="
    echo "   📊 Statut du Cache TouriQuest"
    echo "==============================================="
    echo ""
    
    if [ ! -d "$CACHE_DIR" ]; then
        log_info "Aucun cache trouvé"
        return
    fi
    
    log_info "Répertoire de cache: $CACHE_DIR"
    
    # Taille du cache
    local cache_size=$(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1)
    echo "Taille du cache: $cache_size"
    echo ""
    
    # Fichiers de cache
    if [ -f "$CACHE_DIR/build-cache.txt" ]; then
        local build_entries=$(wc -l < "$CACHE_DIR/build-cache.txt")
        log_success "Cache de build: $build_entries services"
        echo "Services en cache:"
        while IFS=':' read -r service hash; do
            echo "  • $service (hash: ${hash:0:8}...)"
        done < "$CACHE_DIR/build-cache.txt"
    else
        log_warning "Aucun cache de build trouvé"
    fi
    
    echo ""
    
    # Cache de hash
    local hash_files=$(find "$CACHE_DIR" -name "hash_*.cache" 2>/dev/null | wc -l)
    if [ $hash_files -gt 0 ]; then
        log_success "Cache de hash: $hash_files répertoires"
    else
        log_warning "Aucun cache de hash trouvé"
    fi
    
    echo ""
}

clean_cache() {
    echo ""
    echo "==============================================="
    echo "   🧹 Nettoyage du Cache"
    echo "==============================================="
    echo ""
    
    if [ ! -d "$CACHE_DIR" ]; then
        log_info "Aucun cache à nettoyer"
        return
    fi
    
    log_warning "Suppression du cache..."
    rm -rf "$CACHE_DIR"
    log_success "Cache nettoyé avec succès"
    
    echo ""
    log_info "Le prochain démarrage reconstruira tous les services nécessaires"
}

clean_and_rebuild() {
    echo ""
    echo "==============================================="
    echo "   🔄 Nettoyage et Reconstruction"
    echo "==============================================="
    echo ""
    
    # Nettoyer le cache
    clean_cache
    
    # Arrêter les services
    log_info "Arrêt des services en cours..."
    docker compose -f "$COMPOSE_FILE" down --remove-orphans &> /dev/null || true
    
    # Supprimer les images de développement
    log_info "Suppression des images de développement..."
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep "touriquest2-" | awk '{print $1":"$2}' | xargs -r docker rmi -f &> /dev/null || true
    
    log_success "Nettoyage complet terminé"
    echo ""
    log_info "Utilisez './start-dev-ultra.sh' pour redémarrer avec des images fraîches"
}

clean_service_cache() {
    local service_name="$1"
    
    if [ -z "$service_name" ]; then
        log_error "Nom du service requis"
        echo "Usage: $0 service <nom-du-service>"
        return 1
    fi
    
    echo ""
    echo "==============================================="
    echo "   🧹 Nettoyage du Cache pour $service_name"
    echo "==============================================="
    echo ""
    
    if [ ! -d "$CACHE_DIR" ]; then
        log_info "Aucun cache trouvé pour le service $service_name"
        return
    fi
    
    # Supprimer l'entrée du cache de build
    if [ -f "$CACHE_DIR/build-cache.txt" ]; then
        grep -v "^${service_name}:" "$CACHE_DIR/build-cache.txt" > "$CACHE_DIR/build-cache.txt.tmp" 2>/dev/null || true
        mv "$CACHE_DIR/build-cache.txt.tmp" "$CACHE_DIR/build-cache.txt" 2>/dev/null || true
        log_success "Cache de build supprimé pour $service_name"
    fi
    
    # Supprimer le cache de hash du service
    local hash_cache_pattern="hash_*${service_name}*.cache"
    find "$CACHE_DIR" -name "$hash_cache_pattern" -delete 2>/dev/null || true
    
    # Supprimer l'image Docker du service
    local image_name="touriquest2-${service_name}"
    if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "^${image_name}:"; then
        docker rmi -f "${image_name}:latest" &> /dev/null || true
        log_success "Image Docker supprimée pour $service_name"
    fi
    
    log_success "Cache nettoyé pour le service $service_name"
    echo ""
    log_info "Le service $service_name sera reconstruit au prochain démarrage"
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

case "${1:-help}" in
    "status")
        show_cache_status
        ;;
    "clean")
        clean_cache
        ;;
    "rebuild")
        clean_and_rebuild
        ;;
    "service")
        clean_service_cache "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac