

## Probleme

`endDate` utilise `filters.dateRange.end` qui correspond a la fin de l'annee selectionnee (31 dec 2026). Les 6 mois generes sont donc Dec-Jul 2026 (futur) au lieu des 6 derniers mois ecoulés.

## Correction

Dans `src/statia/hooks/useTechniciensStatia.ts` (ligne 216), remplacer :

```ts
const endDate = new Date(filters.dateRange.end);
```

par :

```ts
const now = new Date();
const endDate = filters.dateRange.end < now ? new Date(filters.dateRange.end) : now;
```

Cela prend le **minimum entre la fin de periode et aujourd'hui**, garantissant que les 6 mois affichés sont toujours dans le passé (ex: Mars 26 → Oct 25).

### Fichier modifie
- `src/statia/hooks/useTechniciensStatia.ts` — 1 ligne changée

