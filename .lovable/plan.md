

# Correction : autoriser les surcharges de plan enfant

## Problème

La règle actuelle "parent PRO → enfants effectivement PRO minimum" empêche le cas d'usage principal : mettre Stats en PRO mais garder Général en Basique.

## Nouvelle règle

- **`is_deployed`** : cascade stricte. Parent OFF = enfants effectivement OFF. Pas de surcharge possible.
- **`required_plan`** : PAS de cascade. Chaque noeud porte sa propre valeur. Un enfant STARTER sous un parent PRO reste effectivement STARTER.

Concrètement : `Stats = PRO, Stats > Général = STARTER` → une agence Basique voit Général mais pas les autres onglets Stats.

## Fichiers impactés

### 1. `src/hooks/access-rights/useModuleRegistry.ts`
Modifier `buildNode()` : supprimer l'héritage de `required_plan` du parent. La valeur effective du plan = la valeur propre du noeud. Seul `effectiveDeployed` hérite du parent.

### 2. Migration SQL — RPC `get_user_effective_modules`
Modifier le recursive CTE : retirer la logique `WHEN dt.effective_plan = 'PRO' THEN 'PRO'`. Chaque noeud utilise son propre `required_plan` directement.

### 3. `ModulesMasterView.tsx`
Adapter l'affichage : la colonne "Effectif" ne diffère de "Plan min." que pour les noeuds dont le parent est non déployé (grisé). Plus de badge "hérité contraint" pour le plan.

## Résultat

| Noeud | Plan min. | Effectif | Déployé |
|-------|-----------|----------|---------|
| Stats | PRO | PRO | Oui |
| └ Général | Basique | **Basique** | Oui |
| └ Prévisionnel | PRO | PRO | Oui |

Une agence Basique verra Stats > Général uniquement. Les autres onglets Stats restent PRO.

