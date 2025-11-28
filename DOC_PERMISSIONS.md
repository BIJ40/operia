# Système de Permissions V2.0

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

### Phase 3 : UI Admin (à venir)
- Interface de gestion
- Éditeur de rôles/modules

### Phase 4 : Migration finale (à venir)
- Calcul des valeurs pour tous les users
- Suppression code legacy (optionnel)
