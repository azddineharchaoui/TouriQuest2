#!/bin/bash
# =============================================================================
# TouriQuest - Nettoyage des références user-service
# =============================================================================

echo "============================================================================="
echo "  Suppression des références user-service"
echo "============================================================================="
echo ""

echo "🔍 Recherche des références à user-service..."

# Rechercher tous les fichiers contenant user-service
files_with_userservice=$(grep -r "user-service" . --include="*.sh" --include="*.yml" --include="*.yaml" --include="*.md" --exclude-dir=.git 2>/dev/null | cut -d: -f1 | sort | uniq)

if [[ -z "$files_with_userservice" ]]; then
    echo "✅ Aucune référence à user-service trouvée."
else
    echo "📁 Fichiers contenant des références à user-service :"
    for file in $files_with_userservice; do
        count=$(grep -c "user-service" "$file" 2>/dev/null)
        echo "  • $file ($count références)"
    done
    
    echo ""
    echo "📝 Détails des références :"
    grep -n "user-service" $files_with_userservice 2>/dev/null | head -20
    
    echo ""
    echo "⚠️  Note : user-service a été supprimé car la logique utilisateur"
    echo "   est maintenant intégrée dans auth-service"
fi

echo ""
echo "✅ Vérification terminée."
echo "============================================================================="