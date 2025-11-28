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

- `src/types/globalRoles.ts` - Définition des rôles
- `src/types/modules.ts` - Définition des modules
- `src/types/accessControl.ts` - Guards et helpers

### Guards unifiés

```typescript
import { hasGlobalRole, hasModule, hasModuleOption } from '@/types/accessControl';

// Vérifier le niveau de rôle
if (hasGlobalRole(ctx, 'franchisee_admin')) { ... }

// Vérifier l'accès à un module
if (hasModule(ctx, 'pilotage_agence')) { ... }

// Vérifier une option spécifique
if (hasModuleOption(ctx, 'support', 'agent')) { ... }
```

### Raccourcis courants

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
import { createAccessContext } from '@/types/accessControl';

const ctx = createAccessContext({
  // Nouvelles données (prioritaires si présentes)
  globalRole: user.global_role,
  enabledModules: user.enabled_modules,
  
  // Données legacy (fallback)
  systemRole: profile.system_role,
  roleAgence: profile.role_agence,
  hasAdminRole: roles.includes('admin'),
  hasSupportRole: roles.includes('support'),
  hasFranchiseurRole: roles.includes('franchiseur'),
  franchiseurRole: franchiseurRole?.franchiseur_role,
  supportLevel: profile.support_level,
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

## Migration Progressive

### Phase 1 : Types & Modèle ✅
- Types TypeScript créés
- Colonnes DB ajoutées (nullables)
- Documentation

### Phase 2 : Mapping Legacy
- Fonctions de conversion
- Tests de compatibilité

### Phase 3 : Guards & AuthContext
- Nouveaux guards
- Intégration AuthContext

### Phase 4 : UI Admin
- Interface de gestion
- Éditeur de rôles/modules

### Phase 5 : Migration finale
- Calcul des valeurs pour tous les users
- Suppression code legacy (optionnel)
