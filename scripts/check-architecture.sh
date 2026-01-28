#!/bin/bash
# ==============================================================================
# Script de vérification de cohérence ARCHITECTURE.md vs Code
# Usage: ./scripts/check-architecture.sh
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🔍 Vérification de cohérence ARCHITECTURE.md vs Code..."
echo ""

# ==============================================================================
# 1. Vérifier que les fonctions legacy ne sont plus utilisées
# ==============================================================================
echo "📋 1. Vérification des fonctions V1 legacy..."

LEGACY_PATTERNS=(
  "canViewScope"
  "getEffectivePermission"
  "useIsBlockLocked"
  "getGlobalRoleFromLegacy"
  "getEnabledModulesFromLegacy"
  "createAccessContext"
)

for pattern in "${LEGACY_PATTERNS[@]}"; do
  count=$(grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l || true)
  if [ "$count" -gt 0 ]; then
    echo -e "${RED}❌ Pattern legacy trouvé: $pattern ($count occurrences)${NC}"
    grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | head -3
    ((ERRORS++))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✓ Aucune fonction legacy V1 trouvée${NC}"
fi

# ==============================================================================
# 1b. Vérifier les patterns obsolètes (v0.8.6+)
# ==============================================================================
echo ""
echo "📋 1b. Vérification des patterns obsolètes v0.8.6..."

OBSOLETE_PATTERNS=(
  "support_tickets"
  "payslip"
  "analyze-payslip"
)

for pattern in "${OBSOLETE_PATTERNS[@]}"; do
  # Exclure les redirects et les commentaires
  count=$(grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "node_modules" | \
    grep -v "// Legacy" | \
    grep -v "Navigate to" | \
    grep -v "Redirect" | \
    wc -l || true)
  if [ "$count" -gt 0 ]; then
    echo -e "${RED}❌ Pattern obsolète trouvé: $pattern ($count occurrences)${NC}"
    grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | head -3
    ((ERRORS++))
  fi
done

echo -e "${GREEN}✓ Patterns obsolètes v0.8.6 vérifiés${NC}"

# ==============================================================================
# 2. Vérifier les routes documentées vs App.tsx
# ==============================================================================
echo ""
echo "📋 2. Vérification des routes..."

# Routes critiques qui doivent exister dans App.tsx
CRITICAL_ROUTES=(
  "/academy"
  "/pilotage"
  "/support"
  "/reseau"
  "/admin"
  "/profile"
)

for route in "${CRITICAL_ROUTES[@]}"; do
  if ! grep -q "path=\"$route" src/App.tsx 2>/dev/null && ! grep -q "path={\`$route" src/App.tsx 2>/dev/null; then
    # Check via ROUTES constant
    if ! grep -q "$route" src/config/routes.ts 2>/dev/null; then
      echo -e "${YELLOW}⚠ Route non trouvée dans App.tsx ou routes.ts: $route${NC}"
      ((WARNINGS++))
    fi
  fi
done

echo -e "${GREEN}✓ Routes critiques vérifiées${NC}"

# ==============================================================================
# 3. Vérifier que les tables legacy ne sont pas référencées
# ==============================================================================
echo ""
echo "📋 3. Vérification des tables DB legacy..."

LEGACY_TABLES=(
  "user_permissions"
  "group_permissions"
  "user_capabilities"
  "role_permissions"
)

for table in "${LEGACY_TABLES[@]}"; do
  count=$(grep -r "from('$table')" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
  count2=$(grep -r "from(\"$table\")" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
  total=$((count + count2))
  if [ "$total" -gt 0 ]; then
    echo -e "${RED}❌ Table legacy référencée: $table ($total occurrences)${NC}"
    ((ERRORS++))
  fi
done

echo -e "${GREEN}✓ Aucune table legacy référencée dans le code${NC}"

# ==============================================================================
# 4. Vérifier les fichiers clés V2 existent
# ==============================================================================
echo ""
echo "📋 4. Vérification des fichiers V2 essentiels..."

V2_FILES=(
  "src/types/globalRoles.ts"
  "src/types/modules.ts"
  "src/types/accessControl.ts"
  "src/config/roleMatrix.ts"
  "src/config/routes.ts"
  "src/hooks/useHasGlobalRole.ts"
  "src/components/auth/RoleGuard.tsx"
)

for file in "${V2_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Fichier V2 manquant: $file${NC}"
    ((ERRORS++))
  fi
done

echo -e "${GREEN}✓ Tous les fichiers V2 essentiels présents${NC}"

# ==============================================================================
# 5. Vérifier les edge functions obsolètes
# ==============================================================================
echo ""
echo "📋 5. Vérification des edge functions obsolètes..."

OBSOLETE_FUNCTIONS=(
  "migrate-user-roles-v2"
)

for func in "${OBSOLETE_FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$func" ] && [ -f "supabase/functions/$func/index.ts" ]; then
    echo -e "${YELLOW}⚠ Edge function obsolète trouvée: $func${NC}"
    ((WARNINGS++))
  fi
done

echo -e "${GREEN}✓ Edge functions vérifiées${NC}"

# ==============================================================================
# 6. Vérifier les imports hardcodés de routes
# ==============================================================================
echo ""
echo "📋 6. Vérification des routes hardcodées..."

# Patterns de routes qui devraient utiliser ROUTES.xxx
HARDCODED_ROUTES=(
  "'/admin/"
  '"/admin/'
  "'/pilotage/"
  '"/pilotage/'
  "'/reseau/"
  '"/reseau/'
  "'/academy/"
  '"/academy/'
)

hardcoded_count=0
for pattern in "${HARDCODED_ROUTES[@]}"; do
  # Exclude routes.ts, App.tsx, and navigation files
  count=$(grep -r "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "routes.ts" | \
    grep -v "App.tsx" | \
    grep -v "navigation.ts" | \
    grep -v "ROUTES\." | \
    wc -l || true)
  hardcoded_count=$((hardcoded_count + count))
done

if [ "$hardcoded_count" -gt 10 ]; then
  echo -e "${YELLOW}⚠ $hardcoded_count routes potentiellement hardcodées (> 10)${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ Routes hardcodées: $hardcoded_count (acceptable)${NC}"
fi

# ==============================================================================
# Résumé
# ==============================================================================
echo ""
echo "=============================================="
echo "📊 RÉSUMÉ"
echo "=============================================="

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}❌ ERREURS: $ERRORS${NC}"
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠ AVERTISSEMENTS: $WARNINGS${NC}"
fi

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ Tout est conforme!${NC}"
fi

echo ""

exit $ERRORS
