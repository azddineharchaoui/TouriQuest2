#!/bin/bash
# =============================================================================
# Make Development Scripts Executable
# =============================================================================

echo "🔧 Rendement des scripts de développement exécutables..."

# Scripts de développement principaux
chmod +x start-dev.sh
chmod +x start-dev-optimized.sh
chmod +x start-dev-ultra.sh
chmod +x stop-dev.sh
chmod +x status-dev.sh
chmod +x logs-dev.sh
chmod +x cache-manager.sh

# Scripts utilitaires
chmod +x clean-dev.sh 2>/dev/null || true
chmod +x reset-dev.sh 2>/dev/null || true
chmod +x setup-dev.sh 2>/dev/null || true

# Scripts de diagnostic
chmod +x test-docker-config.sh 2>/dev/null || true
chmod +x validate-docker-config.sh 2>/dev/null || true

echo "✅ Scripts de développement rendus exécutables"
echo ""
echo "Scripts disponibles :"
echo "  🚀 ./start-dev.sh           - Démarrage (auto-optimisé)"
echo "  ⚡ ./start-dev-ultra.sh     - Démarrage ultra-optimisé"
echo "  🛑 ./stop-dev.sh            - Arrêt des services"
echo "  📊 ./status-dev.sh          - Statut des services"
echo "  📋 ./logs-dev.sh            - Logs en temps réel"
echo "  🧹 ./cache-manager.sh       - Gestion du cache"
echo ""