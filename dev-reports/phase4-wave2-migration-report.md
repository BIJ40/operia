# Phase 4 — Vague 2 Migration Report

Date : 2026-03-11

## 1. Résumé

- **Fichiers analysés** : 12 (7 modifiés, 5 analysés sans modification)
- **Fichiers modifiés** : 7
- **Remplacements effectués** : 35
- **Clés migrées** : 2 sur 5 (3 bloquées par absence COMPAT_MAP)

## 2. Mappings traités

| Legacy | Nouvelle clé | Occurrences trouvées | Migrées | Statut |
|---|---|---|---|---|
| `rh` | `organisation.salaries` | 15 | 15 | ✅ Migré |
| `guides` | `support.guides` | 20 | 20 | ✅ Migré |
| `agence` | `pilotage.agence` | — | 0 | ❌ Bloqué |
| `stats` | `pilotage.dashboard` | — | 0 | ❌ Bloqué |
| `divers_documents` | `mediatheque.documents` | — | 0 | ❌ Bloqué |

## 3. Fichiers modifiés

### 3.1 `src/components/unified/tabs/OrganisationTabContent.tsx`
- **Type** : tab config
- **Changement** : L25 `requiresModule: 'rh'` → `'organisation.salaries'`
- **Remplacements** : 1

### 3.2 `src/pages/UnifiedWorkspace.tsx`
- **Type** : module principal + altModules
- **Changements** :
  - L111 : `module: 'rh'` → `'organisation.salaries'`
  - L113 : `altModules: ['guides', 'ticketing']` → `['support.guides', 'ticketing']`
- **Remplacements** : 2

### 3.3 `src/routes/rh.routes.tsx`
- **Type** : ModuleGuard (×3)
- **Changements** : L51, L70, L82 : `moduleKey="rh"` → `"organisation.salaries"`
- **Remplacements** : 3

### 3.4 `src/routes/academy.routes.tsx`
- **Type** : ModuleGuard (×5)
- **Changements** : L32, L36, L37, L41, L48 : `moduleKey="guides"` → `"support.guides"`
- **Remplacements** : 5

### 3.5 `src/components/unified/tabs/AideTabContent.tsx`
- **Type** : tab config
- **Changement** : L24 `requiresModule: 'guides'` → `'support.guides'`
- **Remplacements** : 1

### 3.6 `src/config/sitemapData.ts`
- **Type** : sitemap guards (×18)
- **Changements** :
  - `guides` → `support.guides` : L116, L126, L136, L147, L157, L168, L179, L189, L220, L230 (10)
  - `rh` → `organisation.salaries` : L456, L467, L478, L490, L502, L513, L524, L535 (8)
- **Remplacements** : 18

### 3.7 `src/config/dashboardTiles.ts`
- **Type** : dashboard tiles (×5)
- **Changements** :
  - `guides` → `support.guides` : L41, L52, L63 (3)
  - `rh` → `organisation.salaries` : L99, L123 (2)
- **Remplacements** : 5

## 4. Fichiers analysés non modifiés

| Fichier | Raison |
|---|---|
| `src/config/constants.ts` | Gère `user_modules` côté DB — hors périmètre front |
| `src/config/shared-constants.ts` | Constantes partagées backend — hors périmètre |
| `src/hooks/access-rights/rightsTaxonomy.ts` | Taxonomie admin DB — modifier casserait l'admin |
| `src/hooks/access-rights/permissionsEngine.ts` | Moteur backend/COMPAT_MAP — interdit de modification |
| `src/components/rh/tabs/DiversTabContent.tsx` | Résidu Wave 1 — correctif séparé (voir §5) |

## 5. Cas non migrés

### 5.1 Clés bloquées — absence COMPAT_MAP

Les 3 clés suivantes ne peuvent pas être migrées côté front sans risque de rupture d'accès :

| Legacy | Cible | Motif du blocage |
|---|---|---|
| `agence` | `pilotage.agence` | Pas d'entrée COMPAT_MAP `'pilotage.agence': { keys: ['agence'] }` |
| `stats` | `pilotage.dashboard` | Pas d'entrée COMPAT_MAP `'pilotage.dashboard': { keys: ['stats'] }` |
| `divers_documents` | `mediatheque.documents` | Pas d'entrée COMPAT_MAP `'mediatheque.documents': { keys: ['divers_documents'] }` |

**Prérequis** : Ajouter ces 3 entrées au COMPAT_MAP avant de migrer les guards front.

### 5.2 Résidu Wave 1 — `DiversTabContent.tsx`

**Fichier** : `src/components/unified/tabs/DiversTabContent.tsx`

4 occurrences de clés legacy Wave 1 encore actives au runtime :

| Ligne | Clé legacy | Devrait être |
|---|---|---|
| L65 | `divers_apporteurs` | `organisation.apporteurs` |
| L67 | `parc` | `organisation.parc` |
| L242 | `divers_reunions` | `organisation.reunions` |
| L243 | `divers_plannings` | `organisation.plannings` |

**Impact runtime** : Aucune rupture. Les clés legacy existent dans `user_modules` et résolvent directement. L'incohérence est cosmétique : `OrganisationTabContent` utilise les nouvelles clés, `DiversTabContent` utilise encore les anciennes.

**Recommandation** : Traiter en correctif Wave 1 séparé.

## 6. Vérification sécurité

| Élément | Statut |
|---|---|
| Backend | ✅ Inchangé |
| Supabase | ✅ Inchangé |
| `user_modules` | ✅ Inchangé |
| `plan_tier_modules` | ✅ Inchangé |
| `ticketing` | ✅ Intact — aucune occurrence touchée |
| COMPAT_MAP | ✅ Conservé tel quel |
| `rightsTaxonomy.ts` | ✅ Non touché |
| `constants.ts` / `shared-constants.ts` | ✅ Non touchés |

## 7. Risques résiduels

- **Faible** : Les 3 clés bloquées restent en legacy côté front jusqu'à l'ajout des entrées COMPAT_MAP.
- **Très faible** : Les 4 résidus Wave 1 dans `DiversTabContent.tsx` sont fonctionnels mais incohérents avec le reste du codebase.
- **Aucun** risque de rupture d'accès pour les utilisateurs existants — le COMPAT_MAP assure le fallback `organisation.salaries` → `rh` et `support.guides` → `guides`.
