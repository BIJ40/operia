# Phase 4 — Vague 1 Migration Report

## 1. Résumé exécutif

| Métrique | Valeur |
|---|---|
| Fichiers analysés | 12 |
| Fichiers modifiés | 6 |
| Remplacements effectués | 18 |
| Périmètre respecté | ✅ Strictement Vague 1 |

## 2. Mappings traités

| Legacy key | Nouvelle clé | Occurrences trouvées | Migrées | Non migrées | Justification si non migré |
|---|---|---|---|---|---|
| `divers_apporteurs` | `organisation.apporteurs` | 2 | 2 | 0 | — |
| `divers_plannings` | `organisation.plannings` | 2 | 2 | 0 | — |
| `divers_reunions` | `organisation.reunions` | 2 | 2 | 0 | — |
| `parc` | `organisation.parc` | 2 | 2 | 0 | — |
| `realisations` | `commercial.realisations` | 4 | 4 | 0 | — |
| `aide` | `support.aide_en_ligne` | 4 | 4 | 0 | — |
| **Total** | | **16** | **16** | **0** | |

> Note : 2 remplacements supplémentaires dans `UnifiedWorkspace.tsx` portent sur les mêmes clés dans `altModules` (total effectif : 18 remplacements).

## 3. Fichiers modifiés

### 3.1. `src/components/unified/tabs/OrganisationTabContent.tsx`
- **Type d'impact** : tab visibility (config array)
- **Changements** :
  - `requiresModule: 'divers_apporteurs'` → `'organisation.apporteurs'`
  - `requiresModule: 'divers_plannings'` → `'organisation.plannings'`
  - `requiresModule: 'divers_reunions'` → `'organisation.reunions'`
  - `requiresModule: 'parc'` → `'organisation.parc'`

### 3.2. `src/pages/UnifiedWorkspace.tsx`
- **Type d'impact** : menu visibility (tab config + altModules)
- **Changements** :
  - `altModules: ['agence', 'realisations']` → `['agence', 'commercial.realisations']`
  - `altModules: ['parc', 'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'agence']` → `['organisation.parc', 'organisation.apporteurs', 'organisation.plannings', 'organisation.reunions', 'agence']`
  - `module: 'aide'` → `'support.aide_en_ligne'`

### 3.3. `src/routes/realisations.routes.tsx`
- **Type d'impact** : route protection (ModuleGuard)
- **Changements** :
  - 3× `moduleKey="realisations"` → `moduleKey="commercial.realisations"` (routes `/realisations`, `/realisations/new`, `/realisations/:id`)

### 3.4. `src/components/unified/tabs/CommercialTabContent.tsx`
- **Type d'impact** : helper/config (TAB_MODULE_MAP)
- **Changement** : `realisations: 'realisations'` → `realisations: 'commercial.realisations'`

### 3.5. `src/components/unified/tabs/AideTabContent.tsx`
- **Type d'impact** : tab visibility (config array)
- **Changement** : `requiresModule: 'aide'` → `requiresModule: 'support.aide_en_ligne'`

### 3.6. `src/config/sitemapData.ts`
- **Type d'impact** : guard config (sitemap metadata)
- **Changements** : 3× `moduleKey: 'aide'` → `moduleKey: 'support.aide_en_ligne'` (routes `/support`, `/support/helpcenter`, `/support/mes-demandes`)

## 4. Fichiers analysés mais non modifiés

| Fichier | Raison |
|---|---|
| `src/components/rh/tabs/DiversTabContent.tsx` | Aucun `requiresModule` présent — le fichier ne contient que des cards UI statiques sans guards de permission |
| `src/hooks/use-permissions.ts` | Aucune des 6 clés ciblées n'apparaît |
| `src/contexts/PermissionsContext.tsx` | Définition du contexte — pas d'usage de clés legacy ciblées |
| `src/hooks/access-rights/useEffectiveModules.ts` | Contient le COMPAT_MAP — non touché (conformément aux règles) |
| `src/components/auth/ModuleGuard.tsx` | Composant générique — pas de clés hardcodées |
| `src/permissions/` | Logique de résolution — hors périmètre |

## 5. Cas non migrés / à arbitrer

| Cas | Fichier | Raison |
|---|---|---|
| Commentaire `// requiresModule: 'divers_apporteurs'` | `AideTabContent.tsx` L39 | Code commenté (future guide section) — pas un usage actif, laissé en l'état |

Aucun cas ambigu identifié.

## 6. Vérification de sécurité

| Vérification | Statut |
|---|---|
| Backend inchangé | ✅ |
| `user_modules` inchangé | ✅ |
| `plan_tier_modules` inchangé | ✅ |
| `ticketing` inchangé | ✅ |
| COMPAT_MAP conservé actif | ✅ |
| Aucune migration Supabase | ✅ |
| `rh`, `agence`, `stats`, `guides`, `admin_plateforme`, `reseau_franchiseur` non touchés | ✅ |

## 7. Risques résiduels

- **Aucun risque fonctionnel** : le COMPAT_MAP résout `organisation.apporteurs` → `divers_apporteurs` (et les 5 autres mappings). Les profils legacy existants en `user_modules` continuent de fonctionner sans modification backend.
- **Risque cosmétique nul** : aucun label UI modifié, aucun changement visuel.

## 8. Recommandation pour la suite

**Vague 2 suggérée** — Migrer les clés restantes à faible risque :
- `rh` → `organisation.salaries`
- `agence` → `pilotage.agence`
- `guides` → `support.guides`
- `divers_documents` → `mediatheque.documents`
- `stats` → `pilotage.dashboard`

Ne pas inclure `ticketing` (déjà validé via `support.ticketing` + COMPAT_MAP, mais nécessite audit spécifique).
