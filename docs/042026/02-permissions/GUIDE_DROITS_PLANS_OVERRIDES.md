# Guide Unifié — Droits, Plans & Overrides

> **Date** : 29 mars 2026  
> **Version** : 1.0 — Post-migration V2 complète  
> **Statut** : PRODUCTION — V1 supprimée, V2 exclusive

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Hiérarchie des rôles (N0–N6)](#2-hiérarchie-des-rôles)
3. [Catalogue de modules](#3-catalogue-de-modules)
4. [Plans agence (CORE / PILOT / INTELLIGENCE)](#4-plans-agence)
5. [Options agence (add-ons)](#5-options-agence)
6. [Overrides utilisateur (user_access)](#6-overrides-utilisateur)
7. [Logique de résolution RPC](#7-logique-de-résolution-rpc)
8. [Délégation N2 → N1](#8-délégation-n2--n1)
9. [Presets par poste (N1)](#9-presets-par-poste)
10. [Deny explicite](#10-deny-explicite)
11. [Gouvernance en masse (Edge Functions)](#11-gouvernance-en-masse)
12. [Interfaces d'administration](#12-interfaces-dadministration)
13. [Schéma DB de référence](#13-schéma-db)
14. [Audit & Health Checks](#14-audit--health-checks)

---

## 1. Vue d'ensemble

Le système de permissions V2 repose sur **une source de vérité unique en base de données**. Plus aucune définition de module n'est hardcodée en TypeScript.

### Principes fondamentaux

| Principe | Détail |
|----------|--------|
| **DB = vérité** | `module_catalog` définit l'arbre, `plan_module_grants` les plans, `user_access` les overrides |
| **3 modes d'attribution** | Via plan, via option agence, via assignation utilisateur |
| **Deny explicite** | `user_access.granted = false` retire tout accès (sauf bypass N5+) |
| **Sections = structure** | Jamais stockées dans les grants, auto-accordées si ≥1 enfant accordé |
| **Stripe facture, ne décide pas** | La DB est la vérité, Stripe est un canal de paiement |

### Architecture en couches

```
┌─────────────────────────────────────────────────┐
│              module_catalog (arbre)              │  ← Définition
├─────────────────────────────────────────────────┤
│  plan_module_grants     │  agency_module_entit. │  ← Attribution agence
│  (via plan)             │  (via option)         │
├─────────────────────────────────────────────────┤
│              agency_plan (1 par agence)          │  ← Souscription
├─────────────────────────────────────────────────┤
│              user_access (overrides)             │  ← Individuel
├─────────────────────────────────────────────────┤
│         RPC get_user_permissions(user_id)        │  ← Résolution
└─────────────────────────────────────────────────┘
```

---

## 2. Hiérarchie des rôles

### Rôles globaux (`profiles.global_role`)

| Niveau | `global_role` | Label | Contexte | Permissions |
|:------:|---------------|-------|----------|-------------|
| **N0** | `base_user` | Utilisateur de base | Hors agence | Accès minimal (accueil + support) |
| **N1** | `franchisee_user` | Utilisateur agence | Agence | Modules par délégation N2 uniquement |
| **N2** | `franchisee_admin` | Dirigeant agence | Agence | Hérite du plan agence, délègue aux N1 |
| **N3** | `franchisor_user` | Animateur réseau | Franchiseur | Interface Franchiseur (lecture) |
| **N4** | `franchisor_admin` | Admin réseau | Franchiseur | Admin réseau + gestion options agences |
| **N5** | `platform_admin` | Admin plateforme | Plateforme | **Bypass complet** de tous les modules |
| **N6** | `superadmin` | Super-admin | Plateforme | **Bypass complet** + admin plateforme |

### Matrice des capacités

| Capacité | N0 | N1 | N2 | N3 | N4 | N5+ |
|----------|:--:|:--:|:--:|:--:|:--:|:---:|
| Voir modules plan agence | ❌ | Délégation | ✅ | ❌¹ | ❌¹ | ✅ (bypass) |
| Recevoir modules par délégation | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Déléguer modules à N1 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Gérer options agence | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assigner modules individuels | ❌ | ❌ | Certains² | ❌ | ✅ | ✅ |
| Interface Franchiseur | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Interface Admin | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Bypass total | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

¹ N3/N4 n'ont pas d'agence — modules agence non applicables  
² Selon `assignable_by_scope = 'agency_admin'` ou `'both'`

### Postes agence (`profiles.role_agence`)

Le poste est un **profil métier** distinct du rôle global. Un commercial et un technicien sont tous deux N1.

| Poste | `role_agence` | Modules par défaut |
|-------|--------------|-------------------|
| Administratif | `administratif` | Salariés, Plannings, Docs légaux, Médiathèque, Guides, Aide |
| Commercial | `commercial` | Suivi client, Comparateur, Prospects, Réalisations, Guides, Aide |
| Technicien | `technicien` | Guides, Aide |

---

## 3. Catalogue de modules

### Table `module_catalog`

Chaque module est un nœud dans un arbre hiérarchique :

| Champ | Description |
|-------|-------------|
| `key` | Clé hiérarchique unique (ex: `commercial.realisations`) |
| `parent_key` | Parent dans l'arbre (FK → `module_catalog`) |
| `node_type` | `section` (dossier), `screen` (page), `feature` (fonctionnalité) |
| `min_role` | Niveau minimum pour accès (0–6) |
| `is_deployed` | Module actif en production |
| `is_delegatable` | Délégable par N2 à N1 |
| `preconditions` | Prérequis métier (JSON) |

### Types de nœuds

| `node_type` | Permissionnable | Délégable | Stocké dans grants |
|:-----------:|:---------------:|:---------:|:-------------------:|
| `section` | Non | Non | **Jamais** |
| `screen` | Oui | Si `is_delegatable` | Oui |
| `feature` | Oui | Si `is_delegatable` | Oui |

> **Règle** : une section est auto-accordée dès qu'au moins un enfant est accordé.

### Catégories de modules

| Catégorie | Emoji | Exemples de modules |
|-----------|:-----:|---------------------|
| Accueil | 🏠 | `accueil` |
| Pilotage | 📊 | `pilotage.agence`, `pilotage.statistiques`, `pilotage.maps` |
| Commercial | 💼 | `commercial.veille`, `commercial.realisations`, `commercial.signature` |
| Organisation | 👥 | `organisation.salaries`, `organisation.plannings`, `organisation.zones` |
| Médiathèque | 📚 | `mediatheque.consulter`, `mediatheque.documents` |
| Support | 🆘 | `support.guides`, `support.aide_en_ligne` |
| Ticketing | 🎫 | `ticketing.kanban`, `ticketing.liste` |
| Admin | ⚙️ | `admin.utilisateurs`, `admin.offres` |

---

## 4. Plans agence

### Plans disponibles

Les plans sont stockés dans `plan_catalog` et assignés aux agences via `agency_plan`.

| Plan | Clé DB | Label | Description |
|------|--------|-------|-------------|
| **Core** | `core` | Socle | Modules de base pour toute agence |
| **Pilot** | `pilot` | Pilotage | Core + médiathèque + pilotage étendu |
| **Intelligence** | `intelligence` | Intelligence | Pilot + statistiques avancées + fonctionnalités PRO |

### Comment un plan accorde des modules

```
plan_catalog (core, pilot, intelligence)
       │
       ▼
plan_module_grants (plan_id + module_key + access_level)
       │
       ▼
agency_plan (agency_id + plan_id, status = 'active')
       │
       ▼
RPC get_user_permissions → source = 'plan'
```

### Gestion des plans (interface admin)

L'interface `PlanCatalogViewV2` permet de configurer la matrice plan×module :

- Chaque cellule = un niveau d'accès (`none`, `read`, `full`)
- Écrit dans `plan_module_grants`
- Le plan `intelligence` est le seul plan non-système dont l'activation globale peut être pilotée

### Assignation d'un plan à une agence

- Via l'interface "Agences" du Hub Admin
- Met à jour `agency_plan` avec `status = 'active'`
- Effet **immédiat** sur tous les utilisateurs N2+ de l'agence
- Les N1 ne sont pas affectés directement (ils reçoivent par délégation)

---

## 5. Options agence (add-ons)

### Principe

Les options agence sont des modules activables individuellement pour une agence, **en complément du plan**.

### Table `agency_module_entitlements`

| Champ | Description |
|-------|-------------|
| `agency_id` | Agence concernée |
| `module_key` | Module activé |
| `source` | `manual`, `stripe`, `included`, `trial` |
| `is_active` | Actif ou désactivé |
| `stripe_price_id` | Lien Stripe (si applicable) |
| `expires_at` | Date d'expiration |
| `trial_ends_at` | Fin de période d'essai |

### Sources d'activation

| Source | Signification |
|--------|---------------|
| `manual` | Activé manuellement par N4+ |
| `stripe` | Activé via paiement Stripe |
| `included` | Inclus gratuitement (promotion, partenariat) |
| `trial` | Période d'essai |

### Interface admin

- Les modules hérités du plan sont affichés **en lecture seule** avec la mention "Inclus plan"
- Seules les options additionnelles (`via_agency_option`) peuvent être activées/désactivées

---

## 6. Overrides utilisateur (`user_access`)

### Principe

La table `user_access` permet d'**ajuster individuellement** les droits d'un utilisateur, par-dessus le plan agence et les options.

### Structure

| Champ | Description |
|-------|-------------|
| `user_id` | Utilisateur |
| `module_key` | Module ciblé |
| `granted` | `true` = accorder, `false` = **refuser explicitement** |
| `access_level` | `none`, `read`, `full` |
| `source` | Type d'override (voir ci-dessous) |
| `delegated_by` | Qui a délégué (si `agency_delegation`) |
| `granted_by` | Qui a créé l'entrée |

### Sources sémantiques

| Source | Signification | Acteur | Cas d'usage |
|--------|--------------|--------|-------------|
| `platform_assignment` | Assigné par la plateforme | N4+ | Ticketing, accès spéciaux |
| `agency_delegation` | Délégué par le dirigeant | N2 | Modules plan → N1 |
| `pack_grant` | Automatique (pack activé) | Système | Options agence → utilisateurs |
| `job_preset` | Profil de poste par défaut | Système | À la création du N1 |
| `manual_exception` | Exception manuelle | N4+ | Cas particuliers |

### Comportement clé : l'override prime sur le plan

```
Plan agence = intelligence → module X = full
user_access(user, X, granted=false) → module X = REFUSÉ
```

L'override crée un **refus explicite** qui bloque l'héritage du plan.

> ⚠️ **Exception** : les N5+ (bypass) ne sont jamais bloqués par un deny.

### Où gérer les overrides ?

Les overrides se gèrent dans la **fiche utilisateur** (UserProfileSheet), section "Droits d'accès" :

- L'arbre hiérarchique affiche l'état résolu par le RPC
- Activer un module = `upsert user_access(granted=true, source='manual_exception')`
- Désactiver un module hérité du plan = `upsert user_access(granted=false, source='manual_exception')`
- Remettre au défaut du plan = **supprimer** la ligne `user_access`

---

## 7. Logique de résolution RPC

### `get_user_permissions(p_user_id)` — Algorithme

```
1. Lire profil → global_role, agency_id, role_level, role_agence
2. Lire agency_plan → plan_id
3. Charger module_catalog (deployed = true)

Pour chaque module (screen/feature) :

  a) BYPASS : role_level >= 5 → granted = true (full), source = 'bypass'

  b) IS_CORE : module est dans le socle → granted = true, source = 'is_core'

  c) USER_ACCESS : check user_access(user_id, module_key)
     → Si granted = false → DENY (source = 'manual_exception')
     → Si granted = true → GRANT (source correspondante)

  d) AGENCY_OPTION : check agency_module_entitlements(agency_id, module_key, is_active)
     → Si actif → GRANT (source = 'option_agence')

  e) PLAN : check plan_module_grants(plan_id, module_key)
     → access_level != 'none' → GRANT (source = 'plan')

  f) SECTION AUTO-GRANT :
     node_type = 'section' → granted si ≥1 enfant granted (source = 'auto_section')

4. Retourner : module_key, granted, access_level, node_type, source_summary
```

### Ordre de priorité (du plus fort au plus faible)

| Priorité | Source | Comportement |
|:--------:|--------|-------------|
| 0 | `bypass` | N5+ → tout accordé |
| 1 | `is_core` | Modules socle → toujours accordés |
| 2 | `manual_exception` / `agency_delegation` / etc. | Overrides individuels |
| 3 | `option_agence` | Options agence actives |
| 4 | `plan` | Héritage du plan |

**Règle fondamentale** : un override individuel (priorité 2) prime sur le plan (priorité 4).  
Cela permet de **rétrograder** un accès `full` en `read` via une exception manuelle.

### Fonctions SQL associées

| Fonction | Usage |
|----------|-------|
| `get_user_permissions(uuid)` | RPC principale — résolution complète |
| `has_module_v2(uuid, text)` | Vérification rapide dans les politiques RLS |
| `has_module_option_v2(uuid, text, text)` | Vérification d'une option granulaire |
| `get_user_effective_modules(uuid)` | Legacy (redirige vers V2) |

---

## 8. Délégation N2 → N1

### Règle

```
N1 peut accéder au module SI :
  1. Le module est dans l'enveloppe agence (plan + options actives)
  2. Le module est marqué is_delegatable = true
  3. Un N2+ de la même agence a créé un user_access
     avec source = 'agency_delegation'
```

### Ce que le N2 n'a PAS besoin de faire

- ❌ Utiliser le module personnellement
- ❌ Avoir un `user_access` pour ce module
- ✅ Il suffit que le module soit dans l'enveloppe agence

### Restrictions

- Un N1 ne peut **jamais** hériter directement du plan
- Un N1 ne peut **jamais** recevoir un module hors de l'enveloppe agence
- Un deny explicite bloque même une délégation

### Schéma

```
┌─────────────────────────────────────────────────┐
│              Enveloppe agence                    │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │ Plan agence  │    │ Options agence actives  │ │
│  │ (plan_module │    │ (agency_module_         │ │
│  │  _grants)    │    │  entitlements)           │ │
│  └──────┬───────┘    └──────────┬─────────────┘ │
│         │                      │                 │
│         └──────────┬───────────┘                 │
│                    │                             │
│          Modules délégables                      │
│          (is_delegatable = true)                  │
│                    │                             │
│         ┌──────────▼──────────┐                  │
│         │  N2 délègue à N1   │                  │
│         │  source =          │                  │
│         │  'agency_delegation'│                  │
│         └─────────────────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## 9. Presets par poste (N1)

### Pourquoi pas de sous-rôles N1a/N1b/N1c ?

Créer des sous-rôles multiplierait les combinaisons dans RLS, guards et RPC sans gain réel.

### Solution : `job_profile_presets`

La table `job_profile_presets` stocke les modules par défaut selon le poste métier :

| Poste | Modules par défaut |
|-------|-------------------|
| **Administratif** | Salariés, Plannings, Docs légaux, Médiathèque, Guides, Aide |
| **Commercial** | Suivi client, Comparateur, Prospects, Réalisations, Guides, Aide |
| **Technicien** | Guides, Aide |

### Flux de création N1

```
1. N2 crée un N1, choisit role_agence = "commercial"
2. Système lit job_profile_presets WHERE role_agence = 'commercial'
3. INSERT dans user_access : 1 ligne par module, source = 'job_preset'
4. N2 peut ensuite ajuster via l'interface "Droits équipe"
5. Bouton "Réinitialiser" : DELETE WHERE source IN ('job_preset','agency_delegation')
   + re-insert depuis le preset
```

---

## 10. Deny explicite

### Mécanisme

Quand un administrateur **désactive** un toggle pour un module hérité du plan :

```sql
INSERT INTO user_access (user_id, module_key, granted, access_level, source)
VALUES ($user_id, $module_key, false, 'none', 'manual_exception');
```

### Effet

| Situation | Résultat |
|-----------|---------|
| Module dans le plan + **pas** de `user_access` | ✅ Accordé (via plan) |
| Module dans le plan + `user_access.granted = true` | ✅ Accordé (override confirme) |
| Module dans le plan + `user_access.granted = false` | ❌ **Refusé** (deny explicite) |
| Module hors plan + `user_access.granted = true` | ✅ Accordé (override ajoute) |
| Module hors plan + pas de `user_access` | ❌ Non accordé |

### Remettre au défaut du plan

Pour annuler un override et rétablir le comportement hérité du plan :

```sql
DELETE FROM user_access WHERE user_id = $user_id AND module_key = $module_key;
```

La suppression de la ligne laisse le RPC résoudre naturellement via le plan.

---

## 11. Gouvernance en masse (Edge Functions)

### `bulk-apply-user-access`

- **Rôle requis** : N4+
- **Action** : Upsert de `user_access` pour plusieurs utilisateurs simultanément
- **Audit** : Chaque modification est consignée dans `permissions_audit_log` (avant/après)

### `bulk-reset-job-preset`

- **Rôle requis** : N4+
- **Action** : Supprime les exceptions manuelles d'un utilisateur et réapplique le preset de son poste
- **Audit** : Même traçabilité via `permissions_audit_log`

### Table `permissions_audit_log`

| Champ | Description |
|-------|-------------|
| `user_id` | Utilisateur ciblé |
| `module_key` | Module modifié |
| `old_state` | État avant modification (JSON) |
| `new_state` | État après modification (JSON) |
| `performed_by` | Qui a effectué la modification |
| `performed_at` | Horodatage |

---

## 12. Interfaces d'administration

### Hub Admin — Onglet "Gestion"

| Section | Description | Rôle min |
|---------|-------------|:--------:|
| **Modules** | Matrice plan×module (plan_module_grants) | N4+ |
| **Agences** | Assignation de plan + options par agence | N4+ |
| **Presets** | Configuration des profils de poste (job_profile_presets) | N4+ |
| **Utilisateurs** | Fiche utilisateur + arbre de droits | N2+ (scope agence) |

### Fiche utilisateur (UserProfileSheet)

L'arbre de droits dans la fiche utilisateur affiche :

- **Source du droit** : badge coloré indiquant l'origine (plan, bypass, delegation, etc.)
- **État du toggle** : reflète strictement le résultat du RPC
- **Accessibilité** : soumise au `min_role` du module vs rôle global de l'utilisateur
- **Actions** : activer (upsert granted=true), désactiver (upsert granted=false), supprimer (retour au défaut plan)

### Matrice de droits

L'interface `PlanCatalogViewV2` présente :

- Les modules groupés par catégories avec emojis et couleurs
- Les 3 plans en colonnes
- Chaque cellule = niveau d'accès (`none` / `read` / `full`)
- Les modules `is_core` sont marqués "socle" et non modifiables

---

## 13. Schéma DB

### Tables V2 (production)

```
module_catalog          ← Arbre des modules
plan_catalog            ← Catalogue des plans (core, pilot, intelligence)
plan_module_grants      ← Modules inclus par plan
agency_plan             ← Plan actif par agence
agency_module_entitlements ← Options activées par agence
user_access             ← Overrides individuels
job_profile_presets     ← Presets par poste N1
billing_catalog         ← Mapping Stripe
permissions_audit_log   ← Traçabilité des modifications
```

### Relations

```
module_catalog.key ←── plan_module_grants.module_key
module_catalog.key ←── agency_module_entitlements.module_key
module_catalog.key ←── user_access.module_key
module_catalog.parent_key ──→ module_catalog.key

plan_catalog.id ←── plan_module_grants.plan_id
plan_catalog.id ←── agency_plan.plan_id

profiles.id ←── user_access.user_id
profiles.id ←── user_access.delegated_by
```

### Tables V1 supprimées

| Table V1 | Remplacée par |
|----------|--------------|
| `module_registry` | `module_catalog` |
| `plan_tiers` | `plan_catalog` |
| `plan_tier_modules` | `plan_module_grants` |
| `agency_subscription` | `agency_plan` |
| `user_modules` | `user_access` |

---

## 14. Audit & Health Checks

### Anomalies fréquentes à surveiller

| Check | Requête |
|-------|---------|
| Utilisateurs sans agence (orphelins) | `profiles WHERE agency_id IS NULL AND global_role IN ('franchisee_user','franchisee_admin')` |
| user_access pour superadmin (inutile) | `user_access ua JOIN profiles p ON p.id = ua.user_id WHERE p.global_role IN ('superadmin','platform_admin')` |
| Exceptions redondantes avec le plan | Comparer `user_access.granted=true` avec `plan_module_grants` pour le plan de l'agence |
| Modules dans user_access absents du catalogue | `user_access ua LEFT JOIN module_catalog mc ON mc.key = ua.module_key WHERE mc.key IS NULL` |

### Bonnes pratiques

1. **N5+** : ne jamais créer de `user_access` — le bypass rend tout override inutile
2. **N1** : toujours vérifier que le module est dans l'enveloppe agence avant de déléguer
3. **Deny** : préférer la suppression de la ligne `user_access` plutôt qu'un `granted=false` quand on veut revenir au défaut plan
4. **Audit** : vérifier périodiquement les ghost keys et les orphelins via `supabase/health-checks.sql`

---

## Glossaire

| Terme | Définition |
|-------|-----------|
| **Bypass** | Accès automatique à tous les modules pour N5+ |
| **Deny explicite** | `user_access.granted = false` — bloque l'accès même si le plan l'inclut |
| **Enveloppe agence** | Ensemble des modules accessibles = plan + options actives |
| **Override** | Ligne dans `user_access` qui modifie le comportement par défaut du plan |
| **Preset** | Ensemble de modules par défaut associés à un poste métier (N1) |
| **Source** | Origine d'un droit (bypass, plan, option_agence, agency_delegation, etc.) |
| **Section** | Nœud structurel dans l'arbre, jamais stocké dans les grants |
