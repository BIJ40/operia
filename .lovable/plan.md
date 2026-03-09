

# Corriger les durées estimées des "Non planifiés"

## Problème
Les durées affichées sont à 60 min partout car `nbHeures` sur le projet est souvent vide, et `dureeEstimee` sur l'intervention aussi. La vraie durée se trouve dans le **chiffrage** de l'intervention : `intervention.data.chiffrage.postes[].items[].data.nbHeures/nbTechs`.

## Solution
Réutiliser la logique d'extraction de `chargeTravauxEngine.ts` (`extractHoursFromIntervention`) dans `normalizeApogee.ts` pour les items non planifiés.

## Plan

### Fichier : `src/planning-v2/services/normalizeApogee.ts`

1. **Ajouter une fonction `extractChiffrageHours`** (copie simplifiée de `extractHoursFromIntervention` de `chargeTravauxEngine.ts`) qui parcourt `intervention.data.chiffrage.postes[].items[]` pour extraire `nbHeures` et `nbTechs`, avec fallback sur les `dFields` (`temps_total d'intervention`, `nombre_de techniciens`).

2. **Modifier le bloc de calcul `estimatedDuration`** (lignes ~319-348) :
   - Pour chaque projet non planifié, itérer ses interventions et appeler `extractChiffrageHours`
   - Si le chiffrage retourne des heures > 0, utiliser `heuresRdv * 60` (en minutes)
   - Sinon fallback sur `nbHeures` du projet (existant)
   - Sinon fallback sur `DURATION_FALLBACK[type]`

Priorité de la durée :
```
1. chiffrage.postes → nbHeures (heures → *60 = minutes)
2. project.data.nbHeures (heures → *60)
3. DURATION_FALLBACK[type]
```

Aucun changement sur les RDV planifiés — on ne touche qu'au bloc `unscheduled`.

