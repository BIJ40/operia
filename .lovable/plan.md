

## Probleme confirme

Sebastien Caron est N1 (franchisee_user, role_level=1) dans une agence PRO (Dax). Tous les modules `pilotage.*` ont `min_role = 2` dans le `module_registry`. La RPC `get_user_effective_modules` filtre ces modules car `1 < 2`. L'override sur `pilotage.statistiques.previsionnel` est bien dans `user_overrides`, mais ses parents (`pilotage`, `pilotage.statistiques`) ne sont ni dans `combined_base` (filtres par min_role) ni dans `user_overrides` (pas d'override direct). La navigation bloque donc l'acces.

## Solution

### 1. Migration SQL — Propagation ascendante dans la RPC

Ajouter un CTE `ancestor_grants` dans `get_user_effective_modules` qui, pour chaque override utilisateur, genere automatiquement les cles parentes manquantes.

Logique :
- Pour chaque `user_modules` entry, extraire les prefixes parents (ex: `pilotage.statistiques.previsionnel` → `pilotage.statistiques`, `pilotage`)
- Filtrer ceux deja presents dans `combined_base` ou `user_overrides`
- Les ajouter au `merged` final avec `enabled = true`

```text
ancestor_grants AS (
  SELECT DISTINCT ancestor_key AS module_key, true AS enabled, '{}'::jsonb AS options
  FROM (
    SELECT
      array_to_string((string_to_array(um.module_key, '.'))[1:n], '.') AS ancestor_key
    FROM user_modules um
    CROSS JOIN generate_series(1, array_length(string_to_array(um.module_key, '.'), 1) - 1) AS n
    WHERE um.user_id = p_user_id
      AND array_length(string_to_array(um.module_key, '.'), 1) > 1
  ) sub
  -- Only ancestors that exist in registry and are deployed
  JOIN module_registry mr ON mr.key = sub.ancestor_key AND mr.is_deployed = true
  -- Not already covered
  WHERE NOT EXISTS (SELECT 1 FROM combined_base cb WHERE cb.module_key = sub.ancestor_key)
    AND NOT EXISTS (SELECT 1 FROM user_overrides uo WHERE uo.module_key = sub.ancestor_key)
)
```

Puis dans le `merged` final, ajouter :
```sql
UNION ALL
SELECT ag.module_key, ag.enabled, ag.options FROM ancestor_grants ag
```

### 2. Hook useAddOverride — Auto-insertion des parents

Modifier `useAddOverride` dans `src/hooks/access-rights/useModuleOverrides.ts` pour inserer automatiquement les cles parentes en batch upsert quand un module hierarchique est ajoute.

```typescript
// Generer toutes les cles parentes
const parts = moduleKey.split('.');
const allKeys = parts.map((_, i) => parts.slice(0, i + 1).join('.'));
// Upsert batch sur toutes les cles (parent + enfant)
await supabase.from('user_modules').upsert(
  allKeys.map(key => ({
    user_id: userId,
    module_key: key,
    options: null,
    enabled_at: new Date().toISOString(),
    enabled_by: user?.id || null,
  })),
  { onConflict: 'user_id,module_key' }
);
```

### Fichiers modifies

1. **Nouvelle migration SQL** — Remplace `get_user_effective_modules` avec le CTE `ancestor_grants`
2. **`src/hooks/access-rights/useModuleOverrides.ts`** — `useAddOverride` insere les parents automatiquement

### Resultat attendu

- Ajouter un override `pilotage.statistiques.previsionnel` pour un N1 → les overrides `pilotage` et `pilotage.statistiques` sont auto-crees en DB
- La RPC retourne les trois cles → la navigation Pilotage est accessible
- Securite : la RPC verifie toujours `is_deployed` sur les ancetres (pas d'acces a des modules caches)

