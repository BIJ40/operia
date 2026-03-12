# Phase 6 — RPC Stabilization Plan

**Date**: 2026-03-12  
**Statut**: EXÉCUTÉ  
**Périmètre**: Correctif RPC + alignement metadata uniquement

---

## 1. Résumé exécutif

Phase 6 est une **phase de stabilisation RPC**, pas un cutover.  
Trois bloqueurs identifiés dans `get_user_effective_modules` ont été corrigés.  
Aucune suppression legacy, aucun changement COMPAT_MAP, aucun changement front.

---

## 2. Bloqueurs identifiés et corrigés

### Bug 1 — Perte des options_override

**Cause**: Le CTE `registry_modules` retournait `'{}'::jsonb` en dur pour les options.  
**Impact**: Pour les clés résolues via `module_registry`, les `options_override` de `plan_tier_modules` étaient ignorées (ex: `pilotage.agence` perdait `actions_a_mener`, `diffusion`, `indicateurs` pour les utilisateurs PRO).  
**Correction**: `LEFT JOIN plan_tier_modules` avec `COALESCE(ptm.options_override, '{}'::jsonb)`.

### Bug 2 — Over-granting via module_registry

**Cause**: Le CTE `registry_modules` retournait `true AS enabled` inconditionnellement.  
**Impact**: Une clé présente dans `module_registry` avec `required_plan = 'STARTER'` était accordée même si `plan_tier_modules.enabled = false` pour ce tier.  
**Correction**: `COALESCE(ptm.enabled, true) AS enabled` + filtre `AND COALESCE(ptm.enabled, true) = true`.

### Bug 3 — Incohérences min_role / required_plan

**Cause**: Les clés hiérarchiques ajoutées en Phase 5 avaient des valeurs `min_role` et `required_plan` plus permissives que leurs équivalents legacy.  
**Impact**: Risque d'accès élargi non intentionnel pour certains rôles.  
**Correction**: 6 UPDATEs dans `module_registry` (voir section 4).

---

## 3. Correctif RPC — Détail technique

### Seul le CTE `registry_modules` a été modifié.

**Avant** (buggé):
```sql
registry_modules AS (
    SELECT dt.key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (v_tier_key = 'PRO' OR dt.effective_plan = 'STARTER')
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
),
```

**Après** (corrigé):
```sql
registry_modules AS (
    SELECT dt.key AS module_key,
           COALESCE(ptm.enabled, true) AS enabled,
           COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM deployed_tree dt
    LEFT JOIN plan_tier_modules ptm
      ON ptm.module_key = dt.key AND ptm.tier_key = v_tier_key
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (v_tier_key = 'PRO' OR dt.effective_plan = 'STARTER')
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
      AND COALESCE(ptm.enabled, true) = true
),
```

### CTEs inchangés (confirmé)

- `deployed_tree` — inchangé
- `legacy_plan_modules` — inchangé
- `user_overrides` — inchangé
- `combined_base` — inchangé
- `merged` — inchangé

---

## 4. Corrections metadata module_registry (6 lignes)

| Clé | Champ | Avant | Après | Justification |
|-----|-------|-------|-------|---------------|
| `pilotage.dashboard` | `required_plan` | STARTER | **PRO** | Aligné sur legacy `stats` (PRO) |
| `organisation.salaries` | `min_role` | 1 | **2** | Aligné sur legacy `rh` (min_role=2) |
| `organisation.parc` | `min_role` | 1 | **2** | Aligné sur legacy `parc` (min_role=2) |
| `organisation.apporteurs` | `min_role` | 1 | **2** | Aligné sur legacy `divers_apporteurs` (min_role=2) |
| `organisation.reunions` | `min_role` | 1 | **2** | Aligné sur legacy `divers_reunions` (min_role=2) |
| `mediatheque.documents` | `min_role` | 0 | **2** | Aligné sur legacy `divers_documents` (min_role=2) |

---

## 5. Non-impact confirmé

| Composant | Impact | Raison |
|-----------|--------|--------|
| `ticketing` | ❌ Aucun | Résolu via `legacy_plan_modules` CTE (inchangé), pas dans `module_registry` hierarchy |
| `prospection` | ❌ Aucun | Résolu via `legacy_plan_modules` CTE (inchangé) |
| `reseau_franchiseur` | ❌ Aucun | Résolu via `legacy_plan_modules` CTE (inchangé) |
| `unified_search` | ❌ Aucun | Résolu via `legacy_plan_modules` CTE (inchangé) |
| `COMPAT_MAP` | ❌ Inchangé | Aucune modification du fichier `src/permissions/compatMap.ts` |
| Legacy keys | ❌ Aucune suppression | Toutes les clés legacy restent dans `plan_tier_modules` et `module_registry` |
| Front-end | ❌ Aucun changement | Aucun fichier front modifié |

---

## 6. Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/[timestamp]_phase6_rpc_stabilization.sql` | Migration : 6 UPDATEs + RPC replacement |
| `supabase/rollback/phase6_rollback_rpc.sql` | Rollback complet et exécutable |
| `dev-reports/phase6-rpc-stabilization-plan.md` | Ce rapport |

**Total: 3 fichiers. Aucun autre fichier touché.**

---

## 7. Rollback

Le fichier `supabase/rollback/phase6_rollback_rpc.sql` contient :

1. **6 UPDATEs** restaurant les valeurs `module_registry` pré-Phase-6
2. **La version verbatim complète** de la RPC `get_user_effective_modules` avant Phase 6

**Procédure**: Copier-coller le contenu dans le SQL Editor Supabase et exécuter. Idempotent.

---

## 8. Risques résiduels

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Clé registry sans ligne `plan_tier_modules` | FAIBLE | `COALESCE(ptm.enabled, true)` = comportement identique au pré-Phase-6 |
| `user_overrides` non modifié | AUCUN | CTE inchangé, comportement identique |

---

## 9. Conditions de sortie vers future phase cutover

Avant de pouvoir supprimer `COMPAT_MAP` :

1. ✅ RPC stabilisée (cette phase)
2. ⬜ Migrer constantes front (`AGENCY_REQUIRED_MODULES`, `MODULE_OPTION_MIN_ROLES`, `SHARED_MODULE_KEYS`)
3. ⬜ Migrer types Edge Function (`permissionsEngine.ts` ModuleKey)
4. ⬜ Valider les 11 clés en preview
5. ⬜ Puis seulement — supprimer `COMPAT_MAP` dans une phase dédiée

---

## 10. Recommandation

**Phase 6 RPC Stabilization est exécutée.** Le système est prêt pour des tests de validation preview. La suppression de `COMPAT_MAP` reste conditionnée aux validations listées en section 9.
