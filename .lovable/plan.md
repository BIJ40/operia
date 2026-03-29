

## Problème

L'interface "Options par agence" existe mais est vide car les modules n'ont pas `via_agency_option = true` dans `module_distribution_rules`. Pour activer un module sur une agence, il faut actuellement passer par SQL — ce qui n'est pas viable.

## Solution

Une seule migration SQL pour marquer les bons modules comme activables en option agence. Apres ca, l'UI existante (`AgencyEntitlementsViewV2`) fonctionnera automatiquement : vous pourrez sélectionner St-Omer, voir les modules disponibles, et les activer/désactiver en un clic.

## Migration

Mettre `via_agency_option = true` sur tous les modules de type `screen` ou `feature` qui ne sont pas déjà inclus dans le socle (`is_core = false`). Cela rend tous les modules commerciaux disponibles comme options activables par agence dans l'interface admin.

```sql
UPDATE module_distribution_rules
SET via_agency_option = true
WHERE module_key IN (
  SELECT key FROM module_catalog
  WHERE is_deployed = true
    AND is_core = false
    AND node_type IN ('screen', 'feature')
);
```

## Résultat

- L'interface "Options par agence" dans Réseau affichera tous les modules non-socle
- Vous pourrez activer/désactiver `relations.suivi_client`, `pilotage.maps`, etc. pour n'importe quelle agence
- Plus besoin de SQL pour gérer les options agence
- Les migrations précédentes (St-Omer hardcodé) deviennent inutiles car vous aurez le controle depuis l'UI

## Verification

Aucun changement de code — uniquement des données. L'UI `AgencyEntitlementsViewV2` et le hook `useAgencyEntitlements` fonctionnent déjà correctement.

