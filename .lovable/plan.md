

## Audit des permissions : Bug critique identifié

### Constat

**Sebastien Caron** (franchisee_user / N1, agence Dax) :
- **Attendu** : accès uniquement au module Commercial (outils.commercial, min_role=1 dans le registry)
- **Réel** : accès à TOUT (agence, stats, rh, parc, guides, etc.) sauf Commercial correctement

**Utilisateurs base_user (N0)** sans agence :
- Reçoivent aussi `agence`, `divers_reunions`, `divers_plannings`, `guides` → accès trop large

### Cause racine

Le bug est dans la **RPC `get_user_effective_modules`** côté Supabase. La cascade de résolution contient deux CTEs :

1. `registry_modules` — filtre correctement par `min_role` ✅
2. `legacy_plan_modules` — lit `plan_tier_modules` **SANS aucun filtre `min_role`** ❌

Le `combined_base` fait un `UNION ALL` où `legacy_plan_modules` comble les trous laissés par le filtre de `registry_modules`. Résultat : **tous les modules du plan PRO/STARTER sont réinjectés sans contrôle de rôle**.

```text
registry_modules (min_role=2 filtré pour N1) → vide pour agence, stats, rh...
       ↓
legacy_plan_modules (aucun filtre rôle) → agence ✅, stats ✅, rh ✅ → TOUT PASSE
       ↓
combined_base = registry ∪ legacy_sans_filtre → BUG
```

**Bug secondaire** : le module "Commercial" est `outils.commercial` dans le registry (min_role=1) mais `prospection` dans le frontend. La RPC retourne `outils.commercial` que le frontend ne reconnaît pas → Commercial invisible alors qu'il devrait être visible.

### Plan de correction

#### 1. Corriger la RPC `get_user_effective_modules`

Ajouter le filtre `min_role` dans le CTE `legacy_plan_modules` pour qu'il respecte aussi la hiérarchie de rôles :

```sql
legacy_plan_modules AS (
    SELECT ptm.module_key, ptm.enabled, ptm.options_override AS options
    FROM plan_tier_modules ptm
    LEFT JOIN module_registry mr ON mr.key = ptm.module_key
    WHERE ptm.tier_key = v_tier_key
      AND ptm.enabled = true
      AND (v_role_level >= 5 OR COALESCE(mr.min_role, 0) <= v_role_level)
)
```

#### 2. Aligner la clé "Commercial" dans le registry

Le registry utilise `outils.commercial` mais le frontend attend `prospection`. Deux options :
- **Option A** : Ajouter une entrée `prospection` dans le registry avec min_role=1
- **Option B** : Mapper `outils.commercial` → `prospection` dans le frontend

Option A est plus propre (source de vérité dans le registry).

#### 3. Vérifier les utilisateurs externes

Les utilisateurs `base_user` sans agence recevront correctement uniquement `aide`, `ticketing` (min_role=0) après le fix. Les modules agence/guides/etc. seront bloqués par min_role=2.

### Impact

- **Sécurité** : tous les utilisateurs N0 et N1 ont actuellement un accès trop large
- **Correction** : migration SQL pour mettre à jour la RPC + ajout entry registry pour `prospection`
- **Risque** : faible, la correction restreint les accès (pas d'ajout)

