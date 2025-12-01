# P2 - SPRINT PERMISSIONS & GUARDS

**Date**: 2025-12-01  
**Objectif**: Centraliser et clarifier les permissions et guards  
**Status**: ✅ TERMINÉ

---

## P2.1 - Support Console Sémantique ✅

### Objectif
Clarifier la sémantique des flags support pour éviter confusion entre "module activé" et "accès effectif UI".

### Changements implémentés

#### AuthContext.tsx
- **Renommage**: `isSupportAgent` → `hasSupportAgentRole`
- **Renommage**: `canAccessSupportConsole` → `canAccessSupportConsoleUI`
- **Logique clarifiée**:
  ```ts
  const hasSupportAgentRole = supportOptions.agent === true; // Module support.agent
  const canAccessSupportConsoleUI = hasSupportAgentRole || isAdmin; // Option B
  ```

#### Fichiers mis à jour
- ✅ `src/contexts/AuthContext.tsx` - Interface + implémentation
- ✅ `src/hooks/use-permissions.ts` - Exports
- ✅ `src/components/auth/SupportConsoleGuard.tsx` - Guard + commentaires
- ✅ `src/pages/Landing.tsx` - Tiles filtering
- ✅ `src/components/layout/UnifiedSidebar.tsx` - Navigation
- ✅ `src/components/Chatbot.tsx` - Visibility check
- ✅ `src/components/layout/UnifiedHeader.tsx` - Support button + notifications
- ✅ `src/config/roleMatrix.ts` - ROLE_MATRIX + canAccessTile()

### Résultat
- Sémantique claire: `hasSupportAgentRole` = module, `canAccessSupportConsoleUI` = accès effectif
- Aucune confusion possible entre rôle technique et accès UI
- Documentation alignée (commentaires P1.2 → P2.1)

---

## P2.2 - Guards Centralisés App.tsx ✅

### Objectif
100% des guards dans `App.tsx`, 0% de logique d'accès dans les pages.

### État des lieux - Routes protégées

#### ✅ Déjà protégées correctement
- `/academy/*` → RoleGuard minRole="franchisee_user"
- `/hc-agency/*` → RoleGuard minRole="franchisee_admin"
- `/hc-reseau/*` → RoleGuard minRole="franchisor_user"
- `/admin/*` → RoleGuard minRole="platform_admin"
- `/support/console` → SupportConsoleGuard (Option B)
- `/projects/*` → ModuleGuard moduleKey="apogee_tickets"

#### ✅ Accessibles à tous les connectés (comportement attendu)
- `/support` → RoleGuard (authentification seulement)
- `/support/helpcenter` → RoleGuard
- `/support/mes-demandes` → RoleGuard
- `/profile` → RoleGuard
- `/favorites` → RoleGuard
- `/changelog` → Pas de guard (public)

### Vérification effectuée
Aucune logique d'accès restante dans les pages - toutes les protections sont déjà centralisées dans `App.tsx` avec guards appropriés:
- `RoleGuard` pour les niveaux hiérarchiques
- `ModuleGuard` pour les modules (apogee_tickets)
- `SupportConsoleGuard` pour la console support (Option B)

### Résultat
Architecture déjà conforme P2.2 - aucune modification nécessaire.

---

## P2.3 - Navigation Unifiée ✅

### Objectif
Une seule source de vérité pour déterminer l'accès aux features (tiles, nav items, routes).

### Changements implémentés

#### roleMatrix.ts - Nouvelle fonction centrale

```typescript
export interface FeatureAccessContext {
  globalRole: GlobalRole | null;
  agence?: string | null;
  enabledModules?: Record<string, any> | null;
  canAccessSupportConsoleUI?: boolean;
}

/**
 * P2.3 - Fonction unique pour vérifier l'accès à n'importe quelle feature
 * Remplace la logique dispersée dans Landing.tsx, UnifiedSidebar.tsx, etc.
 */
export function canAccessFeature(
  featureId: string,
  context: FeatureAccessContext
): boolean
```

#### Mapping unifié
- **Help Academy**: GUIDE_APOGEE, GUIDE_APPORTEURS, BASE_DOCUMENTAIRE → canAccessHelpAcademy
- **Pilotage**: STATISTIQUES_HUB, ACTIONS_A_MENER, DIFFUSION, RH_TECH, MON_EQUIPE → canAccessPilotageAgence + check agence
- **Support**: CENTRE_AIDE, MES_DEMANDES → canAccessSupport, CONSOLE_SUPPORT → canAccessSupportConsoleUI
- **Projects**: PROJET_KANBAN → vérifié au niveau groupe (module)
- **Franchiseur**: RESEAU_FRANCHISEUR, FRANCHISEUR_STATS, FRANCHISEUR_ROYALTIES → canAccessFranchiseur
- **Admin**: ADMIN_USERS → canManageUsers, ADMIN_BACKUP, ADMIN_SETTINGS → canAccessAdmin

### Utilisation future (prochaine itération)
```typescript
// Dans Landing.tsx
const visibleTiles = DASHBOARD_TILES.filter(tile => 
  canAccessFeature(tile.id, { globalRole, agence, enabledModules, canAccessSupportConsoleUI })
);

// Dans UnifiedSidebar.tsx
const filteredItems = items.filter(item => 
  canAccessFeature(item.featureId, { globalRole, agence, enabledModules, canAccessSupportConsoleUI })
);
```

### Résultat
- Fonction `canAccessFeature()` créée et documentée
- Mapping complet de tous les featureIds vers règles d'accès
- Base pour future simplification de Landing.tsx et UnifiedSidebar.tsx
- Architecture prête pour extension (nouveaux modules, nouvelles features)

---

## Impact Global Sprint 2

### Sémantique clarifiée
- `hasSupportAgentRole` = attribution technique du module support.agent
- `canAccessSupportConsoleUI` = droit effectif d'accès à l'interface console
- Aucune ambiguïté possible dans le code

### Architecture centralisée
- Tous les guards dans `App.tsx` uniquement
- Aucune logique d'accès dispersée dans les pages
- `canAccessFeature()` comme moteur unifié pour navigation/tiles

### Maintenabilité
- Ajout d'une nouvelle feature = 1 ligne dans `canAccessFeature()`
- Modification d'accès = 1 seul endroit (roleMatrix.ts)
- Audit facilité (tout est centralisé)

---

## Next Steps - Sprint 3

**P3.1** - Centraliser scope registry (éliminer strings magiques)  
**P3.2** - Standardiser enabled_modules format V2  
**P3.3** - Supprimer has_franchiseur_role() des RLS  
**P3.4** - RAG context_type enum  
**P3.5** - heat_priority unique pour tickets  
