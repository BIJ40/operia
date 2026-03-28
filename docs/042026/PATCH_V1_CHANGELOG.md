# PATCH V1 — Changelog RPC get_user_effective_modules

> **Date** : 28 mars 2026  
> **Statut** : EXÉCUTÉ EN PRODUCTION  
> **Migration** : `patch_v1_final_rpc_stabilization`  
> **Référence SQL** : `supabase/rollback/PATCH_V1_FINAL_reference.sql`

---

## Résumé

5 corrections appliquées à la RPC V1 `get_user_effective_modules` et aux données associées.

---

## Bugs corrigés

### Bug A — Modules `required_plan = 'NONE'` invisibles

**Cause** : Pas de path pour les modules hors plan (admin, franchiseur, ticketing).  
**Fix** : Nouveau CTE `role_based_modules` dédié aux modules NONE, résolu par `min_role` uniquement.

### Bug B — N0/N1 bloqués par filtre `role_level >= 2`

**Cause** : Le CTE `registry_modules` exigeait `role_level >= 2`, bloquant tous les N0 et N1.  
**Fix** : Filtre supprimé. Le contrôle d'accès passe par `min_role` du `module_registry`.

### Bug C — Ghost keys non validées

**Cause** : `user_modules` pouvait contenir des clés absentes de `module_registry` (ex: `unified_search`).  
**Fix** : `JOIN module_registry mr_check ON mr_check.key = um.module_key` dans `user_override_expanded`.

### Bug D — Billing bypass sur overrides individuels

**Cause** : Un override `user_modules` pouvait accorder un module PRO à un utilisateur STARTER.  
**Fix** : Nouveau CTE `user_overrides_checked` avec contrainte plan (`required_plan` vs `v_tier_key`). N5+ bypass conservé.

### Fix E — `commercial.suivi_client` manquant dans STARTER

**Cause** : Ligne absente de `plan_tier_modules`.  
**Fix** : `INSERT INTO plan_tier_modules ('STARTER', 'commercial.suivi_client', true)`.

---

## Corrections de données

| Action | Détail |
|--------|--------|
| INSERT | `commercial.suivi_client` dans plan STARTER |
| DELETE | Lignes `enabled=false` dans `plan_tier_modules` (données mortes) |
| UPDATE | `aide` → `support.aide_en_ligne` dans `user_modules` |
| UPDATE | `guides` → `support.guides` dans `user_modules` |
| UPDATE | `rh` → `organisation.salaries` dans `user_modules` |
| UPDATE | `agence` → `pilotage.statistiques` dans `user_modules` |
| DELETE | Clés restantes `parc`, `agence`, `aide`, `guides`, `rh` dans `user_modules` |

---

## Vérifications post-patch

| Test | Résultat |
|------|----------|
| Ghost keys dans `user_modules` | `unified_search` (3 users) — filtré par FIX C, ignoré par la RPC |
| `commercial.suivi_client` STARTER | ✅ Présent, `enabled = true` |

---

## Architecture RPC après patch

```text
CTEs :
1. deployed_tree          — arbre récursif module_registry (inchangé)
2. registry_modules       — PATH 1 : modules via plan (required_plan != NONE)
3. role_based_modules     — PATH 2 : modules hors plan (required_plan = NONE) [NOUVEAU]
4. user_override_expanded — overrides user_modules + expansion enfants + validation clé
5. user_overrides         — déduplication DISTINCT ON
6. user_overrides_checked — contrainte plan sur overrides [NOUVEAU]
7. ancestor_grants        — auto-grant sections parentes
8. merged                 — union des 4 sources
```

---

## Ghost key résiduelle : `unified_search`

3 utilisateurs ont `unified_search` dans `user_modules` mais cette clé n'existe pas dans `module_registry`. Le FIX C la filtre correctement — elle n'apparaîtra plus dans les résultats RPC. Ces lignes peuvent être nettoyées manuellement si souhaité.

---

## Lien avec Phase 6

Ce patch **remplace** la correction Phase 6. Les CTEs `registry_modules` et `user_overrides_checked` sont des versions améliorées de ce qui avait été corrigé en Phase 6.

Le fichier `dev-reports/phase6-rpc-stabilization-plan.md` reste comme référence historique.
