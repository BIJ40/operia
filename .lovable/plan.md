

# Correction de la désynchronisation `module_registry` ↔ `plan_tier_modules`

## Problème confirmé

5 modules sont déployés (`is_deployed = true`) avec un `required_plan` défini, mais **aucune ligne** dans `plan_tier_modules` → la RPC `get_user_effective_modules` ne les accorde jamais → modules grisés.

| Module | required_plan | STARTER | PRO |
|--------|--------------|---------|-----|
| `organisation.plannings` | STARTER | ✗ | ✗ |
| `organisation.zones` | STARTER | ✗ | ✗ |
| `pilotage.performance` | STARTER | ✗ | ✗ |
| `pilotage.rentabilite` | PRO | ✗ | ✗ |
| `ticketing.liste` | STARTER | ✗ | ✗ |

## Plan de correction

### Etape 1 — Insertion des lignes manquantes (data fix)

Insérer dans `plan_tier_modules` via l'outil d'insertion :

- `organisation.plannings` → STARTER + PRO (enabled=true)
- `organisation.zones` → STARTER + PRO (enabled=true)
- `pilotage.performance` → STARTER + PRO (enabled=true)
- `pilotage.rentabilite` → PRO uniquement (enabled=true)
- `ticketing.liste` → STARTER + PRO (enabled=true)

Soit **9 lignes** au total.

### Etape 2 — Auto-sync dans `useUpdateModuleNode`

Modifier le hook `useUpdateModuleNode` dans `src/hooks/access-rights/useModuleRegistry.ts` pour qu'après chaque mutation de `module_registry`, il synchronise automatiquement `plan_tier_modules` :

**Logique :**
- Si `is_deployed` passe à `false` → supprimer les lignes `plan_tier_modules` pour ce module (plus besoin)
- Si `is_deployed` passe à `true` → insérer les lignes `plan_tier_modules` selon le `required_plan` actuel du nœud
- Si `required_plan` change :
  - `NONE` → supprimer toutes les lignes `plan_tier_modules` (module individuel uniquement)
  - `STARTER` → upsert STARTER + PRO (enabled=true)
  - `PRO` → supprimer STARTER, upsert PRO (enabled=true)

La même logique sera appliquée dans `usePropagateToChildren` pour la propagation aux descendants.

Cela sera implémenté comme une fonction utilitaire `syncPlanTierModules(moduleKey, isDeployed, requiredPlan)` appelée dans le `onSuccess` ou directement dans le `mutationFn`.

### Etape 3 — Indicateur visuel dans l'interface admin

Dans `ModulesMasterView.tsx`, ajouter un indicateur d'alerte à côté des modules qui sont déployés mais n'ont pas de lignes `plan_tier_modules` correspondantes :

- Charger les données `plan_tier_modules` via le hook `usePlanTiers` existant
- Pour chaque nœud déployé avec `required_plan ≠ NONE`, vérifier qu'au moins une ligne existe
- Si manquante : afficher une icône ⚠️ avec tooltip "Module déployé mais non activé dans aucun plan — aucun utilisateur n'y a accès"
- Cela rend immédiatement visible la désynchronisation pour l'admin

### Etape 4 — Vérification post-correction

Après insertion des lignes, vérifier via requête que les 5 modules remontent dans `get_user_effective_modules` pour test-n2.

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `plan_tier_modules` (table) | Insertion de 9 lignes de données |
| `src/hooks/access-rights/useModuleRegistry.ts` | Ajout de `syncPlanTierModules` + intégration dans les 2 mutations |
| `src/components/admin/views/ModulesMasterView.tsx` | Ajout indicateur ⚠️ de désynchronisation |

