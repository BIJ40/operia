

## Ajouter "Tout" au sélecteur de période

Le type `PeriodValue` supporte déjà `'all'` et le `UnifiedPeriodSelector` a déjà la config pour `'all'` (label "Toutes", dates depuis le 1er janvier 2020 jusqu'à fin d'année courante).

### Modification unique

**Fichier** : `src/apogee-connect/components/filters/PeriodSelector.tsx`

Ajouter `'all'` en début de la liste `standardPeriods` :

```typescript
const standardPeriods: PeriodValue[] = ['all', 'today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom'];
```

C'est tout. Le bouton "Toutes" apparaitra dans le sélecteur de période du Pilotage et supprimera le filtre de dates (plage très large 2020 → fin d'année).

