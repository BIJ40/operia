# Plan de Migration V1 → V2 — Permissions & Catalogue SaaS

> **Date** : 28 mars 2026  
> **Estimation** : 17-20 sessions  
> **Risque global** : Moyen (contrôlé par feature flag + rollback)

---

## Principes de migration

1. **Créer à côté, pas renommer** — Les tables V2 sont nouvelles. Les tables V1 restent intactes.
2. **Feature flag** — `USE_PERMISSIONS_V2` contrôle la bascule frontend.
3. **Comparaison V1/V2** — Matrice automatique avant bascule.
4. **Rollback instantané** — DROP V2 tables + disable flag.
5. **Rename `_legacy` en dernier** — Uniquement après validation complète.

---

## Phases d'exécution

### Phase 0 — Backup + décisions (0.5 session)

- [ ] Backup des 6 tables V1
- [ ] Verrouiller les 6 décisions métier (cf. DOC_PERMISSIONS_V2.md §2)
- [ ] Documenter le mapping legacy keys

### Phase 1 — `module_catalog` + `module_distribution_rules` (1.5 sessions)

- [ ] CREATE TABLE `module_catalog`
- [ ] CREATE TABLE `module_distribution_rules`
- [ ] Migration des 74 lignes depuis `module_registry`
- [ ] Ajout des colonnes V2 (`node_type`, `preconditions`, etc.)
- [ ] Seed des `module_distribution_rules` (via_plan, via_agency_option, etc.)
- [ ] Validation : count = 74, intégrité FK parent_key

### Phase 2 — `plan_catalog` + `plan_module_grants` (1 session)

- [ ] CREATE TABLE `plan_catalog`
- [ ] INSERT STARTER + PRO
- [ ] CREATE TABLE `plan_module_grants`
- [ ] Migration des 54 lignes depuis `plan_tier_modules`
- [ ] Validation : chaque `module_key` existe dans `module_catalog`

### Phase 3 — `agency_plan` (1 session)

- [ ] CREATE TABLE `agency_plan`
- [ ] Migration des 41 lignes depuis `agency_subscription`
- [ ] Mapping `tier_key` → `plan_key`
- [ ] Validation : chaque `agency_id` a un plan valide

### Phase 4 — `agency_module_entitlements` (1 session)

- [ ] CREATE TABLE `agency_module_entitlements`
- [ ] Migration des 6 lignes depuis `agency_features`
- [ ] Mapping `feature_key` → `module_key` :
  - `suivi_client` → `commercial.suivi_client`
  - `apporteur_portal` → `organisation.apporteurs`
  - etc.
- [ ] Validation : chaque `module_key` existe, `is_active` correct

### Phase 5 — `user_access` (0.5 session)

- [ ] CREATE TABLE `user_access`
- [ ] Migration des 17 lignes depuis `user_modules`
- [ ] Remap des 5 legacy keys :
  - `agence` → `pilotage.agence`
  - `aide` → `support.aide_en_ligne`
  - `guides` → `support.guides`
  - `parc` → `pilotage.parc`
  - `rh` → `organisation.salaries`
- [ ] Source = `platform_assignment` pour ticketing, `agency_delegation` pour les autres
- [ ] Validation : chaque `module_key` existe, chaque `user_id` existe

### Phase 6 — `job_profile_presets` (0.5 session)

- [ ] CREATE TABLE `job_profile_presets`
- [ ] Seed depuis `ROLE_AGENCE_MODULE_PRESETS` (3 postes)
- [ ] Validation : chaque module dans `default_modules` existe dans `module_catalog`

### Phase 7 — `billing_catalog` (0.5 session)

- [ ] CREATE TABLE `billing_catalog`
- [ ] Seed structure (plans + modules vendables)
- [ ] Stripe non branché — mapping prêt

### Phase 8 — RPC `get_user_permissions` V2 (1.5 sessions)

- [ ] Créer la RPC PostgreSQL
- [ ] Implémenter la logique linéaire (cf. DOC_PERMISSIONS_V2.md §4)
- [ ] Tests SQL manuels : N1, N2, N5, deny, delegation, preset
- [ ] Vérifier les edge cases : user sans agence, module non déployé, précondition

### Phase 9 — Frontend : Hook + Context + Flag (1 session)

- [ ] `src/types/permissions-v2.ts`
- [ ] `src/hooks/useUserPermissions.ts`
- [ ] `src/contexts/PermissionsContextV2.tsx`
- [ ] Feature flag `USE_PERMISSIONS_V2`
- [ ] Wrapper pour coexistence V1/V2

### Phase 10 — Frontend : ModuleGuardV2 + préconditions (1 session)

- [ ] `src/components/guards/ModuleGuardV2.tsx`
- [ ] Gestion des états vides (préconditions non remplies)
- [ ] Intégration presets poste dans le flux de création N1

### Phase 11 — Migrer composants consommateurs (3-5 sessions)

- [ ] Navigation (Header, onglets)
- [ ] Guards existants → ModuleGuardV2
- [ ] Pages protégées
- [ ] Composants conditionnels (`hasModule()` calls)
- [ ] Interface "Droits équipe" (N2)
- [ ] Bouton "Réinitialiser les droits" (preset)

**⚠️ Phase la plus risquée** — contient les vieux alias, clés hardcodées, guards implicites.

### Phase 12 — Interfaces admin (2-3 sessions)

- [ ] Catalogue modules (CRUD `module_distribution_rules`)
- [ ] Gestion plans (CRUD `plan_module_grants`)
- [ ] Options agence (CRUD `agency_module_entitlements`)
- [ ] Droits utilisateur (CRUD `user_access`)
- [ ] Presets poste (CRUD `job_profile_presets`)
- [ ] Catalogue facturation (CRUD `billing_catalog`)

### Phase 13 — Matrice de test V1 vs V2 (1 session)

- [ ] Script SQL/TS qui pour chaque user existant :
  - Appelle `get_user_effective_modules` (V1)
  - Appelle `get_user_permissions` (V2)
  - Compare les résultats
- [ ] Aucune divergence non justifiée
- [ ] Documentation des divergences voulues (ex: deny explicite)

### Phase 14 — Bascule + rename legacy (0.5 session)

- [ ] `USE_PERMISSIONS_V2 = true` en production
- [ ] Monitoring 24-48h
- [ ] Rename tables V1 → `_legacy`
- [ ] Supprimer l'ancienne RPC `get_user_effective_modules`

### Phase 15 — Nettoyage code mort (1 session)

- [ ] Supprimer ~2500 lignes TS
- [ ] Supprimer les fichiers listés dans DOC_PERMISSIONS_V2.md §10
- [ ] Supprimer le feature flag
- [ ] Supprimer `PermissionsContextV2` → renommer en `PermissionsContext`
- [ ] Mise à jour documentation

---

## Tableau récapitulatif

| Phase | Contenu | Sessions | Risque |
|:---:|---------|:---:|---|
| 0 | Backup + décisions | 0.5 | Nul |
| 1 | module_catalog + distribution_rules | 1.5 | Faible |
| 2 | plan_catalog + plan_module_grants | 1 | Faible |
| 3 | agency_plan | 1 | Moyen |
| 4 | agency_module_entitlements | 1 | Moyen |
| 5 | user_access | 0.5 | Faible |
| 6 | job_profile_presets | 0.5 | Nul |
| 7 | billing_catalog | 0.5 | Nul |
| 8 | RPC V2 | 1.5 | Moyen |
| 9 | Frontend hook + context + flag | 1 | Faible |
| 10 | ModuleGuardV2 + préconditions | 1 | Moyen |
| 11 | Migrer composants consommateurs | **3-5** | **Élevé** |
| 12 | Interfaces admin | 2-3 | Moyen |
| 13 | Matrice test V1 vs V2 | 1 | Nul |
| 14 | Bascule + rename legacy | 0.5 | Faible |
| 15 | Nettoyage code mort | 1 | Faible |
| **Total** | | **17-20** | |

---

## Rollback

### Rollback immédiat (< 5 min)

```sql
-- Désactiver le flag
-- USE_PERMISSIONS_V2 = false

-- Si nécessaire, supprimer les tables V2
DROP TABLE IF EXISTS user_access CASCADE;
DROP TABLE IF EXISTS agency_module_entitlements CASCADE;
DROP TABLE IF EXISTS agency_plan CASCADE;
DROP TABLE IF EXISTS plan_module_grants CASCADE;
DROP TABLE IF EXISTS plan_catalog CASCADE;
DROP TABLE IF EXISTS module_distribution_rules CASCADE;
DROP TABLE IF EXISTS module_catalog CASCADE;
DROP TABLE IF EXISTS job_profile_presets CASCADE;
DROP TABLE IF EXISTS billing_catalog CASCADE;
```

Les tables V1 restent intactes et fonctionnelles.

### Rollback après rename legacy

```sql
ALTER TABLE module_registry_legacy RENAME TO module_registry;
ALTER TABLE plan_tiers_legacy RENAME TO plan_tiers;
ALTER TABLE plan_tier_modules_legacy RENAME TO plan_tier_modules;
ALTER TABLE agency_subscription_legacy RENAME TO agency_subscription;
ALTER TABLE agency_features_legacy RENAME TO agency_features;
ALTER TABLE user_modules_legacy RENAME TO user_modules;
```
