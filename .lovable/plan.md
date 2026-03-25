

# Fix : Modules "Individuel" qui fuient via legacy_plan_modules

## Cause racine

La RPC `get_user_effective_modules` a un CTE `legacy_plan_modules` qui ne filtre pas `required_plan = 'NONE'`. Les lignes fantômes dans `plan_tier_modules` accordent l'accès malgré le réglage "Individuel".

## Corrections (3 fichiers)

### 1. Migration SQL — Patch RPC + nettoyage données

- Modifier le CTE `legacy_plan_modules` dans `get_user_effective_modules` : ajouter `AND COALESCE(mr.required_plan, 'STARTER') != 'NONE'`
- `DELETE FROM plan_tier_modules` pour tous les modules où `module_registry.required_plan = 'NONE'`

### 2. `src/hooks/access-rights/useModuleRegistry.ts`

Dans `useUpdateModuleNode`, quand `required_plan` est mis à `'NONE'` :
- Supprimer automatiquement les lignes correspondantes dans `plan_tier_modules`
- Évite toute désynchronisation future

### 3. Vérification

- test-n2 perd l'accès à `commercial.realisations` (pas d'override individuel)
- Les utilisateurs avec override explicite conservent l'accès
- Aucun impact sur les modules correctement configurés en STARTER/PRO
- Tous les autres modules NONE (ticketing, etc.) corrigés par la même migration

