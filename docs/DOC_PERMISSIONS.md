# SYSTÈME DE PERMISSIONS V2

## Architecture

Le système de permissions V2 est basé sur deux sources de données principales :

1. **`profiles.global_role`** - Rôle système de l'utilisateur (N0-N6)
2. **`profiles.enabled_modules`** - Modules et options activés (JSONB)

---

## Rôles Globaux

```typescript
const GLOBAL_ROLES = {
  base_user: 0,        // N0 - Utilisateur de base
  franchisee_user: 1,  // N1 - Collaborateur agence
  agency_admin: 2,     // N2 - Dirigeant agence
  franchisor_user: 3,  // N3 - Animateur réseau
  franchisor_admin: 4, // N4 - Directeur réseau
  platform_admin: 5,   // N5 - Admin plateforme
  superadmin: 6,       // N6 - Super administrateur
};
```

---

## Structure enabled_modules

```typescript
interface EnabledModules {
  [moduleKey: string]: {
    enabled: boolean;
    options?: {
      [optionKey: string]: boolean | number | string;
    };
  };
}

// Exemple
{
  "support": {
    "enabled": true,
    "options": {
      "agent": true  // Accès console support
    }
  },
  "apogee_tickets": {
    "enabled": true,
    "options": {
      "kanban": true,
      "manage": true,
      "import": false
    }
  },
  "rh": {
    "enabled": true,
    "options": {
      "coffre": true,
      "rh_viewer": true,
      "rh_admin": false
    }
  }
}
```

---

## Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/config/roleMatrix.ts` | Source de vérité des permissions |
| `src/types/globalRoles.ts` | Types et constantes des rôles |
| `src/contexts/AuthContext.tsx` | Calcul des permissions utilisateur |
| `src/components/guards/` | Guards de protection des routes |

---

## roleMatrix.ts

### ROLE_MATRIX

Définit les capacités par rôle :

```typescript
const ROLE_MATRIX: Record<GlobalRole, RoleCapabilities> = {
  base_user: {
    canAccessSupport: true,      // Créer tickets
    canAccessSupportConsole: false,
    canManageUsers: false,
    manageableRoles: [],
    manageScope: null,
  },
  // ... autres rôles
  platform_admin: {
    canAccessSupport: true,
    canAccessSupportConsole: true,  // N5+ uniquement
    canManageUsers: true,
    manageableRoles: ['base_user', 'franchisee_user', 'agency_admin', 'franchisor_user'],
    manageScope: 'all',
  },
};
```

### MODULE_DEFINITIONS

Définit les contraintes des modules :

```typescript
const MODULE_DEFINITIONS: Record<string, ModuleDefinition> = {
  support: {
    minRole: 'base_user',  // Tous peuvent avoir ce module
    options: {
      agent: { minRole: 'platform_admin' }  // Mais agent nécessite N5+
    }
  },
  reseau_franchiseur: {
    minRole: 'franchisor_user',  // N3+ minimum
  },
};
```

---

## AuthContext - Flags Calculés

```typescript
// Calcul à partir de global_role et enabled_modules
const authState = {
  globalRole: profile.global_role,
  enabledModules: profile.enabled_modules,
  
  // Flags calculés
  canAccessSupport: true,  // Toujours vrai pour authentifiés
  canAccessSupportConsole: hasMinimumRole(globalRole, 'platform_admin'),
  isFranchisor: hasMinimumRole(globalRole, 'franchisor_user'),
  isAdmin: hasMinimumRole(globalRole, 'platform_admin'),
  
  // Helpers
  hasModule: (key) => enabledModules?.[key]?.enabled === true,
  hasModuleOption: (key, opt) => enabledModules?.[key]?.options?.[opt] === true,
};
```

---

## Règles de Sécurité

### 1. Hiérarchie Stricte
- Un utilisateur ne peut jamais modifier un utilisateur de rôle supérieur ou égal
- Exception : N6 peut se modifier lui-même

### 2. Validation Module → Rôle
- Avant d'activer un module, vérifier que `userRole >= module.minRole`
- Avant d'activer une option, vérifier que `userRole >= option.minRole`

### 3. Console Support

L'accès à la console support (`/support/console`) est contrôlé par :

```typescript
canAccessSupportConsoleUI = hasSupportAgentRole || isAdmin
```

**Règles d'accès :**
- ✅ **N5+ (Admin/Superadmin)** : Accès automatique (même sans `agent=true`)
- ✅ **Agent support (`agent=true`)** : Accès accordé **quel que soit le rôle global** (y compris N0)
- ❌ **Autres utilisateurs** : Pas d'accès

**Cas particulier : Agent Externe**
Un utilisateur N0 (base_user) avec `support.options.agent=true` peut accéder à la console support.
Ce pattern sert aux intervenants externes (développeurs, consultants) sans rôle métier dans la franchise.
Voir [support-levels.md](./support-levels.md#cas-dusage--agent-support-externe)

### 4. Scope Agences
- N2 : Voit uniquement sa propre agence
- N3 : Voit ses agences assignées
- N4 : Voit toutes (ou assignées si scope limité)
- N5+ : Voit toutes les agences

---

## Politiques RLS

Les politiques RLS utilisent des fonctions `SECURITY DEFINER` :

```sql
-- Vérifier le rôle minimum
CREATE FUNCTION has_min_global_role(required_role text)
RETURNS boolean AS $$
  SELECT (
    SELECT global_role FROM profiles WHERE id = auth.uid()
  ) >= required_role;
$$ LANGUAGE sql SECURITY DEFINER;

-- Vérifier accès support
CREATE FUNCTION has_support_access()
RETURNS boolean AS $$
  SELECT has_min_global_role('platform_admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- Vérifier accès franchiseur
CREATE FUNCTION has_franchiseur_access()
RETURNS boolean AS $$
  SELECT has_min_global_role('franchisor_user');
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Voir Aussi

- [PERMISSIONS_TRUTH_TABLE.md](./PERMISSIONS_TRUTH_TABLE.md) - Table de vérité par rôle
- [GUARDS_DOCUMENTATION.md](./GUARDS_DOCUMENTATION.md) - Documentation des guards
- [AUDIT_PERMISSIONS_FINDINGS_SUMMARY.md](./AUDIT_PERMISSIONS_FINDINGS_SUMMARY.md) - Résumé de l'audit

---

*Dernière mise à jour : 2025-12-04*
