# Système de Permissions V2 — Documentation Complète

> **Date** : 28 mars 2026  
> **Statut** : Plan validé — pré-implémentation  
> **Remplace** : `docs/PERMISSIONS-REFERENCE.md`, `docs/PERMISSIONS-CLOSURE-REPORT.md`

---

## Table des matières

1. [Contexte et motivation](#1-contexte-et-motivation)
2. [Décisions métier verrouillées](#2-décisions-métier-verrouillées)
3. [Schéma DB V2 (9 tables)](#3-schéma-db-v2)
4. [Logique de résolution RPC](#4-logique-de-résolution-rpc)
5. [Hiérarchie des rôles](#5-hiérarchie-des-rôles)
6. [Modes d'attribution des modules](#6-modes-dattribution)
7. [Délégation N2 → N1](#7-délégation-n2--n1)
8. [Presets par poste (N1)](#8-presets-par-poste)
9. [Préconditions métier](#9-préconditions-métier)
10. [Frontend V2](#10-frontend-v2)
11. [Migration V1 → V2](#11-migration)
12. [Sécurité et rollback](#12-sécurité-et-rollback)
13. [Interfaces admin](#13-interfaces-admin)

---

## 1. Contexte et motivation

### Problèmes V1

| Problème | Impact |
|----------|--------|
| Source de vérité éclatée (DB + TS) | Incohérences, maintenance complexe |
| `MODULE_DEFINITIONS` en dur dans le code | Redeploiement pour tout changement |
| Pas de distinction plan/option/assignation | Modèle commercial impossible |
| Délégation N2→N1 implicite | Droits incohérents |
| Ghost keys, legacy keys | Dette technique permanente |
| `agency_features` déconnecté des modules | Double système non communicant |
| Pas de facturation Stripe intégrée | Pas de catalogue SaaS |

### Objectif V2

**Source de vérité unique en DB**, avec :
- Catalogue de modules configurable sans redéploiement
- 3 modes d'attribution (plan / option agence / assignation user)
- Délégation N2→N1 explicite et bornée
- Presets par poste métier (N1)
- Préparation Stripe native
- RPC unique `get_user_permissions`

---

## 2. Décisions métier verrouillées

### Décision 1 — Délégation N2 → N1 : Modèle "Enveloppe Agence"

```
N1 ⊆ enveloppe délégable de l'agence (plan + options actives)
```

Le N2 peut déléguer à un N1 tout module :
- présent dans le plan agence OU dans les options actives de l'agence
- marqué `is_delegatable = true` dans `module_catalog`
- **même si le N2 ne l'utilise pas personnellement**

Le N2 doit simplement être N2+ de la même agence.

### Décision 2 — Modes d'octroi explicites

| Mode | Signification | Exemple |
|------|---------------|---------|
| `inherited` (via_plan) | Accordé automatiquement par le plan agence | `pilotage.agence` |
| `override_only` (via_user_assignment) | Jamais accordé par plan — uniquement via `user_access` | Ticketing |
| `pack_only` (via_agency_option) | Accordé si l'option est activée pour l'agence | Suivi client, Apporteurs |

Un module peut cumuler plusieurs modes (ex: PRO natif + vendable en option sur STARTER).

### Décision 3 — Sections = structure uniquement

| `node_type` | Permissionnable | Délégable | Stocké dans grants |
|-------------|:-:|:-:|:-:|
| `section` | Non | Non | **Jamais** |
| `screen` | Oui | Si `is_delegatable` | Oui |
| `feature` | Oui | Si `is_delegatable` | Oui |

Une section est auto-accordée dès qu'au moins un enfant est accordé.

### Décision 4 — Deny explicite

Un `user_access.granted = false` retire tout accès, même si le module vient du plan ou d'une option agence.  
**Seuls les N5+ (bypass) sont immunisés.**

### Décision 5 — Stripe facture, ne décide pas

`billing_catalog` mappe vers Stripe. La vérité des droits reste :
- `agency_plan` (plan de base)
- `agency_module_entitlements` (options activées)
- `user_access` (overrides individuels)

### Décision 6 — Gouvernance d'attribution

`assignable_by_scope` contrôle **qui** peut attribuer un module :

| Scope | Qui peut attribuer |
|-------|-------------------|
| `platform_only` | N4+ uniquement |
| `agency_admin` | N2+ de l'agence |
| `both` | N2+ ou N4+ |
| `none` | Automatique (plan), pas d'assignation manuelle |

---

## 3. Schéma DB V2

### 3.1 `module_catalog`

Remplace `module_registry` + `MODULE_DEFINITIONS` TypeScript.

```sql
CREATE TABLE module_catalog (
  key TEXT PRIMARY KEY,
  parent_key TEXT REFERENCES module_catalog(key),
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  node_type TEXT NOT NULL CHECK (node_type IN ('section','screen','feature')),
  min_role INT NOT NULL DEFAULT 0,
  is_deployed BOOLEAN DEFAULT true,
  is_delegatable BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  category TEXT,
  preconditions JSONB DEFAULT '[]'
);
```

**`preconditions`** — tableau JSON structuré :
```json
[]                                              // aucun prérequis
[{"type":"agency_required"}]                    // nécessite une agence
[{"type":"pack_enabled","key":"relations"}]     // nécessite un pack actif
[{"type":"data_source","key":"agency_suivi_settings"}]  // nécessite une config
```

### 3.2 `module_distribution_rules`

Cœur du modèle commercial. Définit **comment** chaque module peut être obtenu.

```sql
CREATE TABLE module_distribution_rules (
  module_key TEXT PRIMARY KEY REFERENCES module_catalog(key),
  via_plan BOOLEAN DEFAULT false,
  via_agency_option BOOLEAN DEFAULT false,
  via_user_assignment BOOLEAN DEFAULT false,
  stripe_sellable BOOLEAN DEFAULT false,
  assignable_by_scope TEXT NOT NULL DEFAULT 'none'
    CHECK (assignable_by_scope IN ('none','platform_only','agency_admin','both')),
  activation_mode TEXT NOT NULL DEFAULT 'manual_or_stripe'
    CHECK (activation_mode IN ('manual_only','stripe_only','manual_or_stripe'))
);
```

**Matrice de distribution prévue :**

| module_key | via_plan | via_agency_option | via_user_assignment | stripe_sellable | assignable_by_scope | activation_mode |
|---|:-:|:-:|:-:|:-:|---|---|
| `pilotage.agence` | ✅ | ❌ | ❌ | ❌ | none | manual_only |
| `commercial.suivi_client` | ❌ | ✅ | ❌ | ✅ | platform_only | manual_or_stripe |
| `organisation.apporteurs` | ❌ | ✅ | ❌ | ✅ | platform_only | manual_or_stripe |
| `ticketing` | ❌ | ❌ | ✅ | ❌ | both | manual_only |
| `commercial.signature` | ✅ (PRO) | ✅ (option STARTER) | ❌ | ✅ | platform_only | manual_or_stripe |
| `support.guides` | ✅ | ❌ | ✅ | ❌ | agency_admin | manual_only |
| `organisation.salaries` | ✅ | ❌ | ❌ | ❌ | none | manual_only |
| `organisation.plannings` | ✅ | ❌ | ❌ | ❌ | none | manual_only |

### 3.3 `plan_catalog`

```sql
CREATE TABLE plan_catalog (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
-- Seed: STARTER ('Essentiel'), PRO ('Performance')
```

### 3.4 `plan_module_grants`

Seuls les modules où `via_plan = true` apparaissent ici.

```sql
CREATE TABLE plan_module_grants (
  plan_key TEXT REFERENCES plan_catalog(key),
  module_key TEXT REFERENCES module_catalog(key),
  access_level TEXT DEFAULT 'full' CHECK (access_level IN ('none','read','full')),
  PRIMARY KEY (plan_key, module_key)
);
```

### 3.5 `agency_plan`

```sql
CREATE TABLE agency_plan (
  agency_id UUID PRIMARY KEY,
  plan_key TEXT REFERENCES plan_catalog(key),
  status TEXT DEFAULT 'active',
  stripe_subscription_id TEXT,
  metadata JSONB DEFAULT '{}'
);
```

### 3.6 `agency_module_entitlements`

Remplace `agency_features` + `option_packs TEXT[]`.

```sql
CREATE TABLE agency_module_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  module_key TEXT NOT NULL REFERENCES module_catalog(key),
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','stripe','included','trial')),
  access_level TEXT DEFAULT 'full',
  stripe_price_id TEXT,
  stripe_subscription_item_id TEXT,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  activated_by UUID,
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE (agency_id, module_key)
);
```

### 3.7 `user_access`

Remplace `user_modules`.

```sql
CREATE TABLE user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES module_catalog(key),
  granted BOOLEAN NOT NULL DEFAULT true,
  access_level TEXT DEFAULT 'full',
  options JSONB,
  source TEXT NOT NULL CHECK (source IN (
    'platform_assignment',
    'agency_delegation',
    'pack_grant',
    'job_preset',
    'manual_exception'
  )),
  delegated_by UUID REFERENCES profiles(id),
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, module_key)
);
```

**Sources sémantiques :**

| Source | Signification | Acteur |
|--------|--------------|--------|
| `platform_assignment` | La plateforme attribue un module à un user | N4+ |
| `agency_delegation` | Le N2 délègue un module à un N1 | N2 |
| `pack_grant` | Automatique lors de l'activation d'un pack agence | Système |
| `job_preset` | Appliqué depuis le preset du poste | Système (à la création) |
| `manual_exception` | Exception hors cadre standard | N4+ |

### 3.8 `job_profile_presets`

```sql
CREATE TABLE job_profile_presets (
  role_agence TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  default_modules TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT DEFAULT 0
);

-- Seed:
INSERT INTO job_profile_presets VALUES
  ('administratif', 'Administratif', ARRAY[
    'organisation.salaries','organisation.plannings','organisation.documents_legaux',
    'mediatheque.consulter','mediatheque.documents','support.guides','support.aide_en_ligne'
  ], 1),
  ('commercial', 'Commercial', ARRAY[
    'commercial.suivi_client','commercial.comparateur','commercial.prospects',
    'commercial.realisations','support.guides','support.aide_en_ligne'
  ], 2),
  ('technicien', 'Technicien', ARRAY[
    'support.guides','support.aide_en_ligne'
  ], 3);
```

### 3.9 `billing_catalog`

```sql
CREATE TABLE billing_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('plan','module')),
  item_key TEXT NOT NULL,
  label TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  billing_mode TEXT DEFAULT 'recurring'
    CHECK (billing_mode IN ('recurring','one_time','manual')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE (item_type, item_key)
);
```

---

## 4. Logique de résolution RPC

### `get_user_permissions(p_user_id)` — Pseudo-code

```text
1. Lire profil → global_role, agency_id, role_level, role_agence
2. Lire agency_plan → plan_key
3. Charger module_catalog + module_distribution_rules (deployed only)

Pour chaque module (screen/feature) :

  a) BYPASS : role_level >= 5 → granted = true (full)

  b) MIN ROLE : role_level < min_role → skip
     SAUF si user_access a un grant explicite ET is_delegatable

  c) RÉSOLUTION PAR MODE DE DISTRIBUTION :

     SI via_plan = true :
       → check plan_module_grants(plan_key, module_key)
       → access_level != 'none' ET role_level >= 2 → grant
     
     SI via_agency_option = true :
       → check agency_module_entitlements(agency_id, module_key, is_active)
       → existe et actif ET (role_level >= 2 OU délégation N1) → grant
     
     SI via_user_assignment = true :
       → check user_access(user_id, module_key, granted = true)
       → Si existe → grant

  d) N1 CAP : si role_level = 1 →
     - doit avoir un override dans user_access
     - le module doit être dans l'enveloppe délégable
       (plan grants + agency entitlements)
     - sinon → skip

  e) DENY EXPLICITE :
     user_access.granted = false → deny (sauf bypass N5+)

  f) SECTION AUTO-GRANT :
     node_type = 'section' granted si >= 1 enfant granted

4. Retourner :
   module_key, granted, access_level, options, node_type, preconditions
```

### Ordre de priorité strict

```
1. Bypass système (N5+)
2. Module déployé ?
3. Min role
4. Enveloppe éligible (distribution_rules → plan / option / assignment)
5. Contrainte N1 / délégation
6. Deny explicite (user_access.granted = false)
7. Grant explicite (user_access.granted = true)
8. Section auto-grant par enfants
```

**Règle fondamentale** : un deny explicite retire tout, sauf bypass N5+.

---

## 5. Hiérarchie des rôles

| Niveau | `global_role` | `role_level` | Capacités permissions |
|--------|--------------|:---:|---|
| N0 | `base_user` | 0 | Accès minimal, pas de modules agence |
| N1 | `franchisee_user` | 1 | Modules par délégation N2 uniquement |
| N2 | `franchisee_admin` | 2 | Hérite du plan agence, délègue aux N1 |
| N3 | `franchisor_user` | 3 | Interface Franchiseur (dashboard, agences) |
| N4 | `franchisor_admin` | 4 | Admin réseau + Redevances + gestion options agences |
| N5 | `platform_admin` | 5 | Bypass complet des modules |
| N6 | `superadmin` | 6 | Bypass complet + admin plateforme |

### Interfaces de rôle (hors système de modules)

| Interface | Rôle minimum | Géré par |
|-----------|:-:|---|
| Franchiseur (dashboard, agences) | N3 | `canAccessFranchisorInterface()` |
| Franchiseur (redevances) | N4 | `canAccessFranchisorSection('royalties')` |
| Admin plateforme | N4 | Guard dédié |

---

## 6. Modes d'attribution

### Flux complet par mode

#### Mode 1 : Inclus dans un plan (`via_plan`)

```
plan_catalog → plan_module_grants → agency_plan → user
```

L'agence a un plan (STARTER/PRO). Le plan inclut nativement certains modules.  
Les N2 les reçoivent automatiquement. Les N1 uniquement par délégation.

#### Mode 2 : Option agence (`via_agency_option`)

```
module_distribution_rules → agency_module_entitlements → user
```

Le module est activable en supplément pour une agence (manuellement ou via Stripe).  
Une fois activé, il devient partie de l'enveloppe délégable.

#### Mode 3 : Assignation utilisateur (`via_user_assignment`)

```
module_distribution_rules → user_access → user
```

Le module est attribué directement à un utilisateur, indépendamment du plan agence.  
Typiquement : ticketing.

#### Cumul de modes

Un module peut appartenir à plusieurs modes simultanément :

```
commercial.signature :
  via_plan = true (PRO natif)
  via_agency_option = true (vendable en option sur STARTER)
```

---

## 7. Délégation N2 → N1

### Règle

```
N1 peut accéder au module SI :
  1. Le module est dans l'enveloppe de l'agence (plan + options actives)
  2. Le module est marqué is_delegatable = true
  3. Un N2+ de la même agence a créé un user_access avec source = 'agency_delegation'
```

### Ce que le N2 N'a PAS besoin de faire

- Le N2 n'a pas besoin d'utiliser le module personnellement
- Le N2 n'a pas besoin d'avoir un `user_access` pour ce module
- Il suffit que le module soit dans l'enveloppe agence

### Restrictions

- Un N1 ne peut **jamais** hériter directement du plan (pas de `via_plan` direct)
- Un N1 ne peut **jamais** recevoir un module hors de l'enveloppe agence
- Un deny explicite (`granted = false`) bloque même une délégation

---

## 8. Presets par poste (N1)

### Pourquoi pas de N1a/N1b/N1c ?

Créer des sous-rôles (`franchisee_user_admin`, `franchisee_user_commercial`) multiplierait les combinaisons dans RLS, guards, et RPC pour un gain nul.

### Solution : `job_profile_presets`

Le poste (`role_agence` dans `profiles`) définit les modules par défaut d'un N1 :

| Poste | Modules par défaut |
|-------|-------------------|
| Administratif | Salariés, Plannings, Docs légaux, Médiathèque, Guides, Aide |
| Commercial | Suivi client, Comparateur, Prospects, Réalisations, Guides, Aide |
| Technicien | Guides, Aide |

### Flux de création N1

```text
1. N2 crée un N1, choisit role_agence = "commercial"
2. Hook lit job_profile_presets WHERE role_agence = 'commercial'
3. Insert dans user_access : 1 ligne par module, source = 'job_preset'
4. N2 peut ensuite ajuster via l'interface "Droits équipe"
5. Bouton "Réinitialiser" : DELETE WHERE source IN ('job_preset','agency_delegation')
   + re-insert preset
```

---

## 9. Préconditions métier

Certains modules nécessitent des prérequis au-delà des droits.

### Types de préconditions

| Type | Signification | Exemple |
|------|---------------|---------|
| `agency_required` | L'utilisateur doit être rattaché à une agence | Tous les modules agence |
| `pack_enabled` | Un pack doit être actif pour l'agence | `{"key":"relations"}` |
| `data_source` | Une table de configuration doit exister | `{"key":"agency_suivi_settings"}` |

### Gestion frontend

Si un module est accordé mais qu'une précondition n'est pas remplie :
- Le module est visible (pas grisé)
- Un **état vide contextuel** s'affiche (pas une erreur)
- Exemple : "Ce module nécessite l'activation du pack Relations. Contactez votre administrateur."

---

## 10. Frontend V2

### Nouveaux composants

| Fichier | Rôle |
|---------|------|
| `src/types/permissions-v2.ts` | Types `PermissionEntry`, `ModuleAccess` |
| `src/hooks/useUserPermissions.ts` | Appel RPC + React Query |
| `src/contexts/PermissionsContextV2.tsx` | `hasModule()`, `hasOption()`, `getAccessLevel()` |
| `src/components/guards/ModuleGuardV2.tsx` | Guard + états vides préconditions |

### Coexistence V1/V2

```
Feature flag : USE_PERMISSIONS_V2 (env var)
- false → AuthContext + permissionsEngine (V1)
- true  → PermissionsContextV2 + RPC V2
```

`PermissionsContextV2` est un contexte séparé. Il ne touche PAS à `AuthContext`.

### Code supprimé après bascule (~2500 lignes)

| Fichier | Lignes |
|---------|:---:|
| `src/types/modules.ts` | ~928 |
| `src/config/modulesByRole.ts` | ~122 |
| `src/config/moduleTree.ts` | ~200 |
| `src/config/roleAgenceModulePresets.ts` | ~88 |
| `src/permissions/constants.ts` | ~300 |
| `src/permissions/permissionsEngine.ts` | ~400 |
| `src/permissions/moduleRegistry.ts` | ~300 |
| 11 hooks `access-rights/` | ~200 |

---

## 11. Migration V1 → V2

### Tables renommées (phase finale)

| Table actuelle | → Renommée | Remplacée par |
|---|---|---|
| `module_registry` | `module_registry_legacy` | `module_catalog` + `module_distribution_rules` |
| `plan_tiers` | `plan_tiers_legacy` | `plan_catalog` |
| `plan_tier_modules` | `plan_tier_modules_legacy` | `plan_module_grants` |
| `agency_subscription` | `agency_subscription_legacy` | `agency_plan` |
| `agency_features` | `agency_features_legacy` | `agency_module_entitlements` |
| `user_modules` | `user_modules_legacy` | `user_access` |

### Migration des données

| Source | Destination | Volume |
|---|---|---|
| `module_registry` (74 lignes) | `module_catalog` + `module_distribution_rules` | 74 |
| `plan_tiers` (2) | `plan_catalog` | 2 |
| `plan_tier_modules` (54) | `plan_module_grants` | 54 |
| `agency_subscription` (41) | `agency_plan` | 41 |
| `agency_features` (6) | `agency_module_entitlements` | 6 |
| `user_modules` (17, 5 legacy keys) | `user_access` | 17 |
| `ROLE_AGENCE_MODULE_PRESETS` (TS) | `job_profile_presets` | 3 |

### Remap des legacy keys

| Ancienne clé | → Nouvelle clé canonique |
|---|---|
| `agence` | `pilotage.agence` |
| `aide` | `support.aide_en_ligne` |
| `guides` | `support.guides` |
| `parc` | `pilotage.parc` |
| `rh` | `organisation.salaries` |

---

## 12. Sécurité et rollback

### Stratégie de bascule

1. **Feature flag** `USE_PERMISSIONS_V2` (env var)
2. **Tables V1 intactes** jusqu'à phase finale
3. **Matrice de test** V1 vs V2 pour chaque user existant avant bascule
4. **Script rollback** : DROP V2 tables + restore RPC V1

### Invariants V2

1. **Module absent de module_catalog = n'existe pas** — aucun fallback
2. **Section jamais dans les grants** — purement dérivée
3. **Deny explicite = blocage total** — sauf bypass N5+
4. **N1 jamais via plan direct** — toujours par délégation
5. **Stripe facture, ne décide pas** — la DB est la vérité

---

## 13. Interfaces admin à créer

| Interface | Rôle | Accès |
|-----------|------|-------|
| Catalogue modules | Configurer `module_distribution_rules` | N4+ |
| Gestion plans | Éditer `plan_module_grants` | N4+ |
| Options agence | Activer/désactiver options par agence | N4+ |
| Droits utilisateur | Assignation individuelle + délégation | N2+ (scope agence) |
| Presets poste | Éditer `job_profile_presets` | N4+ |
| Catalogue facturation | Mapping Stripe | N4+ |
