
# Plan : Règle métier "mois avec le plus d'interventions" pour le CA Planifié

## Contexte

Actuellement, un dossier est compté dans le CA planifié d'un mois dès qu'il a **au moins une intervention** dans ce mois. Un dossier à cheval sur mars et avril est donc compté **deux fois** (100% en mars ET 100% en avril).

La règle demandée : **compter 100% du CA sur le mois qui contient le plus d'interventions**.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/statia/definitions/devis.ts` (~ligne 762-774) | Logique `caPlanifie` : compter les interventions par mois, ne retenir le dossier que pour le mois dominant |
| `src/apogee-connect/components/stats-hub/CAPlanifieDetailDialog.tsx` (~ligne 108-175) | Hook `usePlanifiedProjects` : même logique côté dialog |

## Logique technique

Pour chaque dossier ayant des interventions sur plusieurs mois :

1. Compter le nombre d'interventions par mois (clé = `YYYY-MM`)
2. Identifier le mois avec le plus d'interventions
3. En cas d'égalité, prendre le **premier mois** chronologiquement
4. Ne compter le CA du dossier **que** si le mois dominant tombe dans la période demandée

```text
Exemple dossier 202507151 :
  Mars  → 20 interventions
  Avril → 2 interventions
  → Mois dominant = Mars
  → CA compté uniquement en Mars
```

## Détail des changements

### 1. `devis.ts` — metric `caPlanifie`

Remplacer la boucle simple "si intervention dans la période → ajouter le projet" par :

- Phase A : pour chaque intervention, grouper par `(projectId, mois)`
- Phase B : pour chaque projet, déterminer le mois dominant (max interventions, tie-break = premier mois)
- Phase C : ne retenir le projet que si son mois dominant est dans `[dateMin, dateMax]`

### 2. `CAPlanifieDetailDialog.tsx` — hook `usePlanifiedProjects`

Appliquer exactement la même logique :

- Grouper les interventions par projet et par mois
- Déterminer le mois dominant par projet
- Ne retenir que les projets dont le mois dominant tombe dans la période affichée
- Utiliser la première date d'intervention du mois dominant comme `bestDate`

## Résultat attendu

Un dossier planifié sur mars (20 jours) et avril (2 jours) sera compté **uniquement en mars**. Plus aucun double comptage possible.
