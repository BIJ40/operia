

## Ajout des Paniers au module Zones

### Règle métier
- **1 zone = 1 panier** par défaut (chaque jour travaillé avec une zone attribuée donne droit à un panier repas)
- **Exception** : si le technicien a travaillé **uniquement le matin** (toutes visites terminées avant 13h) **ET** moins de 5h consécutives → pas de panier ce jour-là
- Le total paniers = total zones - jours sans panier

### Modifications

**1. Edge Function `get-zones-deplacement/index.ts`**

Dans la boucle de traitement jour par jour (étape 8), en plus de tracker la distance max, on collecte aussi les horaires de chaque visite par tech par jour :
- Pour chaque visite, extraire `heureDebut` / `heureFin` ou calculer depuis `date` (ISO) + `duree` (minutes)
- Après le calcul des zones, pour chaque jour avec une zone attribuée, vérifier la règle panier :
  - Calculer la plage horaire totale du tech ce jour-là (heure début min → heure fin max)
  - Si heure fin max ≤ 13h00 ET durée totale < 300 min (5h) → `noPanier = true`
- Ajouter au résultat : `paniers: number` (= total zones - jours sans panier) et `paniersExclus: number` (jours exclus, pour transparence)

Nouveau format de réponse :
```typescript
{
  techId: number;
  techName: string;
  zones: Record<ZoneLabel, number>;
  total: number;
  paniers: number;        // nouveau
  paniersExclus: number;  // nouveau
}
```

**2. Hook `useZonesDeplacement.ts`**

Mettre à jour l'interface `TechZoneSummary` avec les champs `paniers` et `paniersExclus`.

**3. Composant `ZonesDeplacementTab.tsx`**

- Ajouter une colonne "Paniers" après "Total" dans le tableau, avec une icône distinctive
- Afficher le nombre de paniers par tech, et le total en footer
- Si `paniersExclus > 0`, afficher un petit indicateur (tooltip ou badge) montrant combien de jours ont été exclus
- Mettre à jour l'export Excel avec la colonne Paniers

### Détection des horaires dans les données Apogée

Les visites contiennent :
- `date` : ISO string incluant l'heure de début (ex: `2026-03-15T08:00:00`)
- `duree` : durée en minutes
- `heureDebut` / `heureFin` : format `HH:mm` (parfois présents)

On utilisera `date` + `duree` en priorité, avec fallback sur `heureDebut`/`heureFin`.

