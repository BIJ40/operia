# Schéma Base de Données — Permissions V2

> **Date** : 28 mars 2026  
> **9 nouvelles tables** — coexistent avec V1 jusqu'à bascule

---

## Vue d'ensemble

```
┌──────────────┐     ┌─────────────────────────┐
│module_catalog│────▶│module_distribution_rules │
└──────┬───────┘     └─────────────────────────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
┌──────▼───────┐  ┌──────────────┐  ┌─────────────▼───────────┐
│plan_module   │  │ agency_plan  │  │agency_module_entitlements│
│  _grants     │  │              │  │                         │
└──────┬───────┘  └──────┬───────┘  └─────────────────────────┘
       │                 │
       └────────┬────────┘
                │
         ┌──────▼───────┐
         │ user_access   │
         └──────┬───────┘
                │
         ┌──────▼──────────────┐
         │job_profile_presets  │
         └─────────────────────┘

         ┌─────────────────┐
         │billing_catalog  │ (mapping Stripe, pas de FK permissions)
         └─────────────────┘
```

---

## Tables détaillées

### 1. `module_catalog`

> Source de vérité unique pour la définition des modules.

| Colonne | Type | Description |
|---------|------|-------------|
| `key` | TEXT PK | Clé hiérarchique (`commercial.suivi_client`) |
| `parent_key` | TEXT FK → module_catalog | Parent (section) |
| `label` | TEXT NOT NULL | Libellé affiché |
| `description` | TEXT | Description longue |
| `icon` | TEXT | Nom d'icône Lucide |
| `node_type` | TEXT | `section` / `screen` / `feature` |
| `min_role` | INT (0) | Niveau minimum pour accès |
| `is_deployed` | BOOLEAN (true) | Module actif en production |
| `is_delegatable` | BOOLEAN (true) | Délégable par N2 à N1 |
| `sort_order` | INT (0) | Ordre d'affichage |
| `category` | TEXT | Catégorie UI (pilotage, commercial, etc.) |
| `preconditions` | JSONB ([]) | Prérequis métier |

**Contrainte** : `node_type IN ('section','screen','feature')`

### 2. `module_distribution_rules`

> Définit comment un module peut être obtenu.

| Colonne | Type | Description |
|---------|------|-------------|
| `module_key` | TEXT PK FK → module_catalog | Clé du module |
| `via_plan` | BOOLEAN (false) | Inclus dans un plan |
| `via_agency_option` | BOOLEAN (false) | Option activable par agence |
| `via_user_assignment` | BOOLEAN (false) | Assignable à un utilisateur |
| `stripe_sellable` | BOOLEAN (false) | Vendable via Stripe |
| `assignable_by_scope` | TEXT ('none') | Qui peut assigner : `none`, `platform_only`, `agency_admin`, `both` |
| `activation_mode` | TEXT ('manual_or_stripe') | Comment activer : `manual_only`, `stripe_only`, `manual_or_stripe` |

### 3. `plan_catalog`

| Colonne | Type | Description |
|---------|------|-------------|
| `key` | TEXT PK | `STARTER`, `PRO` |
| `label` | TEXT NOT NULL | `Essentiel`, `Performance` |
| `sort_order` | INT (0) | Ordre d'affichage |

### 4. `plan_module_grants`

> Quels modules sont inclus dans quel plan.

| Colonne | Type | Description |
|---------|------|-------------|
| `plan_key` | TEXT FK → plan_catalog | Plan |
| `module_key` | TEXT FK → module_catalog | Module |
| `access_level` | TEXT ('full') | `none`, `read`, `full` |

**PK** : `(plan_key, module_key)`

### 5. `agency_plan`

> Quel plan est actif pour chaque agence.

| Colonne | Type | Description |
|---------|------|-------------|
| `agency_id` | UUID PK | Agence |
| `plan_key` | TEXT FK → plan_catalog | Plan actif |
| `status` | TEXT ('active') | `active`, `suspended`, `cancelled` |
| `stripe_subscription_id` | TEXT | ID subscription Stripe |
| `metadata` | JSONB ({}) | Données complémentaires |

### 6. `agency_module_entitlements`

> Options modules activées pour une agence.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | — |
| `agency_id` | UUID NOT NULL | Agence |
| `module_key` | TEXT NOT NULL FK → module_catalog | Module |
| `source` | TEXT ('manual') | `manual`, `stripe`, `included`, `trial` |
| `access_level` | TEXT ('full') | Niveau d'accès |
| `stripe_price_id` | TEXT | Prix Stripe lié |
| `stripe_subscription_item_id` | TEXT | Item subscription Stripe |
| `is_active` | BOOLEAN (true) | Actif ou non |
| `activated_at` | TIMESTAMPTZ (now) | Date d'activation |
| `activated_by` | UUID | Qui a activé |
| `expires_at` | TIMESTAMPTZ | Expiration |
| `trial_ends_at` | TIMESTAMPTZ | Fin de période d'essai |
| `metadata` | JSONB ({}) | — |

**Unique** : `(agency_id, module_key)`

### 7. `user_access`

> Overrides et assignations individuelles.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | — |
| `user_id` | UUID NOT NULL FK → profiles | Utilisateur |
| `module_key` | TEXT NOT NULL FK → module_catalog | Module |
| `granted` | BOOLEAN (true) | Accordé ou refusé (deny) |
| `access_level` | TEXT ('full') | Niveau d'accès |
| `options` | JSONB | Options granulaires du module |
| `source` | TEXT NOT NULL | `platform_assignment`, `agency_delegation`, `pack_grant`, `job_preset`, `manual_exception` |
| `delegated_by` | UUID FK → profiles | Qui a délégué (si delegation) |
| `granted_by` | UUID | Qui a créé l'entrée |
| `granted_at` | TIMESTAMPTZ (now) | Date |

**Unique** : `(user_id, module_key)`

### 8. `job_profile_presets`

> Modules par défaut selon le poste N1.

| Colonne | Type | Description |
|---------|------|-------------|
| `role_agence` | TEXT PK | `administratif`, `commercial`, `technicien` |
| `label` | TEXT NOT NULL | Libellé affiché |
| `default_modules` | TEXT[] ([]) | Liste des module_keys par défaut |
| `sort_order` | INT (0) | Ordre d'affichage |

### 9. `billing_catalog`

> Mapping modules/plans ↔ Stripe.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | — |
| `item_type` | TEXT NOT NULL | `plan` ou `module` |
| `item_key` | TEXT NOT NULL | Clé du plan ou module |
| `label` | TEXT | Libellé commercial |
| `stripe_product_id` | TEXT | ID produit Stripe |
| `stripe_price_id` | TEXT | ID prix Stripe |
| `billing_mode` | TEXT ('recurring') | `recurring`, `one_time`, `manual` |
| `is_active` | BOOLEAN (true) | — |
| `metadata` | JSONB ({}) | — |

**Unique** : `(item_type, item_key)`

---

## Relations entre tables V2

```
module_catalog.key ←── module_distribution_rules.module_key
module_catalog.key ←── plan_module_grants.module_key
module_catalog.key ←── agency_module_entitlements.module_key
module_catalog.key ←── user_access.module_key
module_catalog.parent_key ──→ module_catalog.key

plan_catalog.key ←── plan_module_grants.plan_key
plan_catalog.key ←── agency_plan.plan_key

profiles.id ←── user_access.user_id
profiles.id ←── user_access.delegated_by
```

---

## Tables V1 (renommées `_legacy` en phase finale)

| Table V1 | → V2 |
|----------|------|
| `module_registry` | `module_catalog` + `module_distribution_rules` |
| `plan_tiers` | `plan_catalog` |
| `plan_tier_modules` | `plan_module_grants` |
| `agency_subscription` | `agency_plan` |
| `agency_features` | `agency_module_entitlements` |
| `user_modules` | `user_access` |
