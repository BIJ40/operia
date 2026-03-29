# Référence Système V1 (Legacy) — À Supprimer

> **Date** : 28 mars 2026  
> **Statut** : Legacy — sera renommé `_legacy` puis supprimé après bascule V2

---

## 1. Tables V1

| Table | Rôle V1 | Remplacée par (V2) |
|-------|---------|---------------------|
| `module_registry` | Registre des modules | `module_catalog` + `module_distribution_rules` |
| `plan_tiers` | Définition des plans | `plan_catalog` |
| `plan_tier_modules` | Modules par plan | `plan_module_grants` |
| `agency_subscription` | Plan actif par agence | `agency_plan` |
| `agency_features` | Options payantes agence | `agency_module_entitlements` |
| `user_modules` | Overrides utilisateur | `user_access` |

---

## 2. Fichiers TypeScript V1 à supprimer

| Fichier | Lignes | Rôle V1 | Remplacé par |
|---------|:---:|---------|-------------|
| `src/types/modules.ts` | ~928 | MODULE_DEFINITIONS, types | `module_catalog` (DB) |
| `src/config/modulesByRole.ts` | ~122 | Modules par rôle global | RPC `get_user_permissions` |
| `src/config/moduleTree.ts` | ~200 | Arbre de navigation | `module_catalog.parent_key` |
| `src/config/roleAgenceModulePresets.ts` | ~88 | Presets par poste | `job_profile_presets` (DB) |
| `src/permissions/constants.ts` | ~300 | Constantes hardcodées | `module_catalog` (DB) |
| `src/permissions/permissionsEngine.ts` | ~400 | Moteur de résolution client | RPC `get_user_permissions` |
| `src/permissions/moduleRegistry.ts` | ~300 | Registre client | `module_catalog` (DB) |
| 11 hooks `src/hooks/access-rights/` | ~200 | Guards spécialisés | `ModuleGuardV2` |

**Total** : ~2500 lignes à supprimer

---

## 3. RPC V1

### `get_user_effective_modules`

Logique actuelle :
1. Lire `global_role` et `agency_id`
2. Si N5+ → bypass (tous les modules déployés)
3. Sinon → `plan_tier_modules` WHERE `tier_key` = plan agence AND `enabled = true`
4. Fusionner avec `user_modules` (overrides)
5. Appliquer `COALESCE(ptm.enabled, false)` (fail-closed)

**Sera remplacée par** `get_user_permissions` (V2)

---

## 4. Legacy keys (5 clés à remapper)

| Clé V1 | → Clé V2 canonique |
|--------|---------------------|
| `agence` | `pilotage.agence` |
| `aide` | `support.aide_en_ligne` |
| `guides` | `support.guides` |
| `parc` | `pilotage.parc` |
| `rh` | `organisation.salaries` |

---

## 5. Problèmes V1 documentés

### 5.1 Source de vérité éclatée

- `MODULE_DEFINITIONS` (TypeScript) ≠ `module_registry` (DB)
- Modifications nécessitent redéploiement + migration SQL
- Incohérences possibles entre les deux

### 5.2 Ghost keys

Clés présentes dans certains systèmes mais absentes d'autres :
- `commercial.suivi_client`, `commercial.comparateur`, `commercial.veille`, `commercial.prospects` — fantômes dans `plan_tier_modules`, supprimées

### 5.3 agency_features déconnecté

`agency_features` (packs Relations, etc.) ne communique pas avec le moteur de modules. Activer le pack Relations n'active pas `organisation.apporteurs` pour la navigation.

### 5.4 Délégation N2→N1 implicite

Pas de contrôle explicite de l'enveloppe délégable. Un N1 pouvait théoriquement recevoir des modules hors du plan agence.

### 5.5 Pas de modèle commercial

Impossible de distinguer "inclus dans un plan" de "option payante" de "assignation individuelle". Tout est traité comme un booléen on/off.

---

## 6. Invariants V1 à préserver en V2

1. **Fail-closed** — module absent = refusé
2. **Bypass N5+** — platform_admin et superadmin contournent tout
3. **RLS sur toutes les tables** — pas d'exception
4. **Zéro ghost key** — chaque clé doit avoir un consommateur
5. **Ticketing préservé** — les 4 utilisateurs actuels gardent leur accès
