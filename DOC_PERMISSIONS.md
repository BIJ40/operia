# Système de Permissions V2.0

> **Dernière mise à jour** : 26 Janvier 2026

## Vue d'ensemble

Le système V2.0 simplifie radicalement la gestion des accès en remplaçant l'ancien modèle complexe (groupes + scopes + capabilities + overrides) par une architecture claire et extensible.

## Architecture

### 1. Rôle Global Unique

Chaque utilisateur possède **UN SEUL** rôle global, sur une échelle hiérarchique de 7 niveaux :

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Visiteur, accès minimal |
| N1 | `franchisee_user` | Utilisateur agence (technicien, assistant) |
| N2 | `franchisee_admin` | Admin agence (dirigeant) |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur réseau / DG |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Super administrateur |

### 2. Modules Activables

5 modules principaux, activables indépendamment :

| Module | Description |
|--------|-------------|
| `help_academy` | Guides Apogée, Apporteurs, HelpConfort |
| `pilotage_agence` | Statistiques, actions à mener, diffusion |
| `reseau_franchiseur` | Vision multi-agences franchiseur |
| `support` | Tickets et assistance |
| `admin_plateforme` | Administration système |

### 3. Options par Module

Chaque module possède 3-5 sous-options pour un contrôle granulaire :

```
help_academy
├── apogee           # Guide Apogée
├── apporteurs       # Guide Apporteurs  
├── helpconfort      # Guide HelpConfort
├── base_documentaire # Documents téléchargeables
└── edition          # Mode édition

pilotage_agence
├── indicateurs      # KPIs et statistiques
├── actions_a_mener  # Actions prioritaires
├── diffusion        # Écran TV
└── exports          # Export données

reseau_franchiseur
├── dashboard        # Vue d'ensemble
├── stats            # KPIs consolidés
├── agences          # Gestion agences
├── redevances       # Calcul redevances
└── comparatifs      # Comparaison agences

support
├── user             # Créer ses tickets
├── agent            # Répondre aux tickets
└── admin            # Gérer l'équipe support

admin_plateforme
├── users            # Gestion utilisateurs
├── agencies         # Configuration agences
├── permissions      # Rôles et droits
├── backup           # Sauvegardes
└── logs             # Journaux
```

## Stockage en Base de Données

### Table `profiles`

Deux nouvelles colonnes :

```sql
global_role    global_role  -- Enum (nullable pendant migration)
enabled_modules jsonb       -- Structure des modules activés
```

### Structure JSONB `enabled_modules`

```json
{
  "help_academy": {
    "enabled": true,
    "options": {
      "apogee": true,
      "apporteurs": true,
      "helpconfort": false,
      "base_documentaire": true,
      "edition": false
    }
  },
  "pilotage_agence": {
    "enabled": true,
    "options": {
      "indicateurs": true,
      "actions_a_mener": true,
      "diffusion": true,
      "exports": false
    }
  }
}
```

## API TypeScript

### Fichiers principaux

- `src/types/globalRoles.ts` - Définition des rôles (7 niveaux)
- `src/types/modules.ts` - Définition des modules (5 modules + options)
- `src/types/accessControl.ts` - Guards et helpers + mapping legacy

### Guards unifiés (via AuthContext)

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { hasGlobalRole, hasModule, hasModuleOption } = useAuth();

// Vérifier le niveau de rôle
if (hasGlobalRole('franchisee_admin')) { ... }

// Vérifier l'accès à un module
if (hasModule('pilotage_agence')) { ... }

// Vérifier une option spécifique
if (hasModuleOption('support', 'agent')) { ... }
```

### Variables exposées par AuthContext

| Variable | Type | Description |
|----------|------|-------------|
| `globalRole` | `GlobalRole \| null` | Valeur réelle depuis DB |
| `suggestedGlobalRole` | `GlobalRole` | Valeur calculée depuis legacy |
| `enabledModules` | `EnabledModules \| null` | Valeur réelle depuis DB |
| `suggestedEnabledModules` | `EnabledModules` | Valeur calculée depuis legacy |
| `accessContext` | `AccessControlContext` | Contexte combiné |
| `hasGlobalRole(role)` | Function | Guard de niveau |
| `hasModule(module)` | Function | Guard de module |
| `hasModuleOption(module, option)` | Function | Guard d'option |

### Raccourcis courants (dans accessControl.ts)

```typescript
isPlatformAdmin(ctx)    // N5+
isSuperAdmin(ctx)       // N6
isSupportAgent(ctx)     // support.agent activé
isSupportAdmin(ctx)     // support.admin activé
hasFranchisorAccess(ctx) // Module réseau activé
canManageRoyalties(ctx)  // reseau.redevances activé
canEdit(ctx)            // help_academy.edition ou N5+
```

## Compatibilité Legacy

### Mapping automatique

Le système calcule automatiquement le rôle global et les modules depuis l'ancien système :

```typescript
// AuthContext charge les données legacy et calcule les valeurs suggérées
const suggestedGlobalRole = getGlobalRoleFromLegacy({
  systemRole: profile.system_role,
  roleAgence: profile.role_agence,
  hasAdminRole: roles.includes('admin'),
  hasSupportRole: capabilities.includes('support'),
  hasFranchiseurRole: roles.includes('franchiseur'),
  franchiseurRole: franchiseurRole?.franchiseur_role,
  supportLevel: profile.support_level,
});

const suggestedEnabledModules = getEnabledModulesFromLegacy({
  globalRole: suggestedGlobalRole,
  hasAdminRole,
  hasSupportRole,
  hasFranchiseurRole,
  supportLevel,
});
```

### Règles de mapping

| Ancien système | Nouveau rôle |
|---------------|--------------|
| admin + system_role=admin | `superadmin` |
| admin OU support_level≥3 | `platform_admin` |
| franchiseur + directeur/dg | `franchisor_admin` |
| franchiseur + animateur | `franchisor_user` |
| role_agence=dirigeant | `franchisee_admin` |
| utilisateur standard | `franchisee_user` |
| visiteur/non défini | `base_user` |

## Logging de Debug (Mode DEV)

En mode développement, AuthContext affiche des logs détaillés :

```
[AUTH][V2] Mapping Legacy → V2.0:
  Legacy data: systemRole=utilisateur, roleAgence=Dirigeant, isAdmin=false...
  Computed globalRole: franchisee_admin
  Computed enabledModules: { help_academy: {...}, pilotage_agence: {...} }
  ⚠️ Using suggested global_role (DB is null): franchisee_admin
```

## Migration Progressive

### Phase 1 : Types & Modèle ✅
- Types TypeScript créés
- Colonnes DB ajoutées (nullables)
- Documentation

### Phase 2 : Mapping Legacy ✅
- Fonctions de conversion
- Intégration AuthContext
- Guards V2 exposés
- Logging de debug

### Phase 3 : UI Admin ✅
- `/admin/users-unified` - **Page principale unifiée** pour gestion quotidienne des utilisateurs et permissions V2
- `/admin/permissions-v2` - Page avancée/détaillée pour édition fine
- `/admin/roles-v2` - Page d'audit et migration V2

### Phase 4 : Activation des Guards V2 ✅
- Hook `useHasGlobalRole` pour vérification de niveau
- Composant `RoleGuard` pour protection des routes
- Migration batch via edge function `migrate-user-roles-v2`
- Bouton "Appliquer V2 à tous" dans `/admin/users-unified`
- Configuration des modules par défaut selon le rôle (`src/config/modulesByRole.ts`)
- Dépréciation de `isAdmin`/`isFranchiseur` (remplacé par `hasGlobalRole`)

### Phase 5 : Nettoyage final (à venir)
- Suppression code legacy (optionnel)
- Migration des routes restantes vers RoleGuard

## Protection des Routes avec RoleGuard

### Guards V2 (ACTIF)

- **Tous les accès sensibles sont protégés** par `RoleGuard` dans `App.tsx`
- L'autorisation se fait sur `GlobalRole` (N0–N6) via `useHasGlobalRole`
- Le code legacy suivant est **DÉPRÉCIÉ** :
  - `isAdmin` → utiliser `hasGlobalRole('platform_admin')`
  - `isFranchiseur` → utiliser `hasGlobalRole('franchisor_user')`
  - `system_role` côté front pour les guards
- Les utilisateurs N3+ peuvent gérer les utilisateurs, avec plafonnement au niveau de leur propre rôle

### Mapping des Routes par Niveau

| Route | minRole | Niveau | Description |
|-------|---------|--------|-------------|
| `/`, `/profile`, `/favorites` | - | N0+ | Tous utilisateurs connectés |
| `/apogee/*`, `/apporteurs/*`, `/helpconfort/*` | - | N0+ | HELP Academy |
| `/documents` | - | N0+ | Base documentaire |
| `/support`, `/mes-demandes` | - | N0+ | Support utilisateur |
| `/mes-indicateurs/*` | `franchisee_admin` | N2+ | Pilotage agence - Indicateurs |
| `/actions-a-mener/*` | `franchisee_admin` | N2+ | Actions à mener |
| `/diffusion` | `franchisee_admin` | N2+ | Écran diffusion |
| `/tete-de-reseau/*` | `franchisor_user` | N3+ | Réseau franchiseur |
| `/admin/users-unified` | `franchisor_user` | N3+ | Gestion utilisateurs |
| `/admin/users`, `/admin/users-list` | `franchisor_user` | N3+ | Création utilisateurs |
| `/admin/support`, `/admin/tickets` | `franchisor_user` | N3+ | Support admin |
| `/admin/*` (autres) | `platform_admin` | N5+ | Administration plateforme |

### Composant RoleGuard

```typescript
import { RoleGuard } from '@/components/auth/RoleGuard';

// Protection d'une route admin (N5+)
<Route path="/admin/users-unified" element={
  <RoleGuard minRole="platform_admin">
    <AdminUsersUnified />
  </RoleGuard>
} />

// Protection avec redirection personnalisée
<RoleGuard minRole="franchisor_user" redirectTo="/">
  <FranchiseurDashboard />
</RoleGuard>

// Affichage page d'erreur au lieu de redirection
<RoleGuard minRole="platform_admin" showError errorMessage="Accès réservé aux administrateurs">
  <AdminSettings />
</RoleGuard>
```

### Hook useHasGlobalRole

```typescript
import { useHasGlobalRole, useHasMinLevel, useGlobalRoleLevel } from '@/hooks/useHasGlobalRole';

// Vérifier un rôle minimum
const canAccessAdmin = useHasGlobalRole('platform_admin');
const canManageNetwork = useHasGlobalRole('franchisor_user');

// Vérifier un niveau numérique
const canManageUsers = useHasMinLevel(3); // N3+

// Obtenir le niveau actuel
const userLevel = useGlobalRoleLevel(); // 0-6
```

### Migration des anciennes vérifications

| Ancien code | Nouveau code |
|-------------|-------------|
| `if (isAdmin) { ... }` | `if (hasGlobalRole('platform_admin')) { ... }` |
| `if (isFranchiseur) { ... }` | `if (hasGlobalRole('franchisor_user')) { ... }` |
| `if (isAdmin \|\| isFranchiseur)` | `if (hasGlobalRole('franchisor_user'))` |

## Migration Batch V2

### Edge Function `migrate-user-roles-v2`

Accessible via le bouton "Appliquer V2 à tous" dans `/admin/users-unified` (N5+ requis).

**Fonctionnement :**
1. Récupère tous les profils sans `global_role` et `enabled_modules` définis
2. Calcule les valeurs V2 basées sur les données legacy
3. Met à jour les profils en batch
4. Retourne le nombre de profils migrés/ignorés

**Règles de mapping utilisées :**
- Admin legacy → `platform_admin` (N5)
- Franchiseur DG/Directeur → `franchisor_admin` (N4)
- Franchiseur Animateur → `franchisor_user` (N3)
- Dirigeant agence → `franchisee_admin` (N2)
- Assistante/Commercial → `franchisee_user` (N1)
- Externe/Autre → `base_user` (N0)

## Pages Admin V2

| Page | URL | Usage |
|------|-----|-------|
| **Utilisateurs & Permissions V2** | `/admin/users-unified` | Vue quotidienne - gestion centralisée des utilisateurs avec global_role et enabled_modules |
| Permissions V2 (avancé) | `/admin/permissions-v2` | Vue détaillée - accordéons avec tous les détails |
| Audit V2 | `/admin/roles-v2` | Comparaison DB vs suggestions legacy |
| Création utilisateurs | `/admin/users` | Création de nouveaux utilisateurs avec attribution rôle V2 |
| Liste utilisateurs (legacy) | `/admin/users-list` | Ancienne liste - conservée pour référence |

### Workflow recommandé

1. **Audit initial** via `/admin/roles-v2` - Voir le statut V2 de chaque utilisateur
2. **Préparation/peuplement** via `/admin/users-unified` - Appliquer les suggestions V2 ou éditer manuellement
3. **Validation fine** via `/admin/permissions-v2` - Vérifier les détails si nécessaire
4. **Après stabilisation** - Activer les guards V2 dans le code applicatif

## Règles de Plafonnement des Rôles

### Principe fondamental

Un utilisateur ne peut **jamais** assigner un rôle supérieur au sien. Cette règle est appliquée à la fois côté client (UI) et côté serveur (edge function).

### Conditions d'accès à la gestion des utilisateurs

| Niveau | Peut gérer des utilisateurs ? | Rôles assignables |
|--------|------------------------------|-------------------|
| N0-N2 | ❌ Non | Aucun |
| N3 | ✅ Oui | N0, N1, N2, N3 |
| N4 | ✅ Oui | N0, N1, N2, N3, N4 |
| N5 | ✅ Oui | N0, N1, N2, N3, N4, N5 |
| N6 | ✅ Oui | Tous (N0-N6) |
| Admin legacy | ✅ Oui | Tous (N0-N6) |

### Fonctions TypeScript

```typescript
import { canManageUsers, getAssignableRoles } from '@/types/globalRoles';

// Vérifier si l'utilisateur peut gérer d'autres utilisateurs
if (canManageUsers(currentUserRole)) {
  // Afficher le bouton "Créer un utilisateur"
}

// Obtenir les rôles que l'utilisateur peut assigner
const roles = getAssignableRoles(currentUserRole);
// Pour N3: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user']
// Pour N6: tous les rôles
```

### Validation serveur (edge function)

L'edge function `create-user` valide également :
1. Que l'appelant est au moins N3 (ou admin legacy)
2. Que le rôle demandé ne dépasse pas le niveau de l'appelant
3. En cas de tentative d'escalade de privilèges : erreur 400 avec message explicite

Exemple de log en cas de tentative d'escalade :
```
[create-user] ESCALADE DE PRIVILÈGES BLOQUÉE: user abc123 (N3) a tenté d'assigner superadmin (N6)
```
