

# Plan — Mode tournée technicien sur la carte des RDV

## Fonctionnalité

Quand un seul technicien est sélectionné dans le filtre, activer un **mode tournée** :
- Numéroter les pastilles (1, 2, 3...) dans l'ordre chronologique des RDV
- Relier les RDV par une ligne pointillée suivant le **trajet routier réel** (pas vol d'oiseau)
- Afficher un résumé : nombre de RDV, distance totale, temps de trajet estimé

## Trajet réel : faisabilité

Mapbox offre l'API **Directions** (`https://api.mapbox.com/directions/v5/mapbox/driving/...`) qui retourne la géométrie routière (polyline). On a déjà le token Mapbox. On peut appeler cette API côté client avec les coordonnées des RDV triés par heure, et tracer la route sur la carte via une **GeoJSON source + layer** Mapbox GL.

**Limites** : l'API Directions supporte max 25 waypoints par requête — largement suffisant pour une journée de technicien.

## Modifications

### 1. `src/hooks/useRouteDirections.ts` (nouveau)

Hook qui appelle l'API Mapbox Directions quand on a >= 2 points :

```ts
// Input: coords triées chronologiquement [[lng, lat], ...]
// Output: { geometry: GeoJSON LineString, distanceKm, durationMin, isLoading }
// Appel: GET /directions/v5/mapbox/driving/{coords}?geometries=geojson&overview=full
```

### 2. `src/components/map/PinMarker.tsx` — Numéro dans la pastille

Modifier `createPinMarkerElement` pour accepter un `orderNumber?: number`. Si présent, afficher le numéro (blanc, bold) au centre de la tête du pin au lieu du camembert multi-technicien (en mode tournée, on n'a qu'un seul tech).

### 3. `src/pages/agency/CartePage.tsx` + `MapPlanningView.tsx`

Quand `selectedTechIds.length === 1` :
- Trier les RDV filtrés par `startAt` chronologique
- Passer `orderNumber` à chaque marker
- Appeler `useRouteDirections` avec les coords triées
- Ajouter une **source + layer GeoJSON** sur la carte (ligne pointillée, couleur du tech, `line-dasharray`)
- Afficher un bandeau résumé en bas : "Tournée de {nom} — {n} RDV — {distance} km — ~{durée}"
- Nettoyer source/layer quand on quitte le mode mono-tech

### 4. `src/components/map/TourSummaryBar.tsx` (nouveau)

Petit bandeau en bas de la carte :
```
🔵 Tournée de Jean Dupont — 6 RDV — 47 km — ~1h12
```

## Flux

```text
Filtre 1 tech → trier RDV par heure → numéroter markers
                                     → appeler Directions API
                                     → tracer polyline routière (pointillés)
                                     → afficher résumé distance/temps
```

## Ce qui ne change pas

- Le mode multi-tech ou sans filtre reste identique (pastilles camembert, pas de ligne)
- Le hook `useRdvMap` n'est pas modifié
- Le `computeTravel` Haversine existant (planning V2) n'est pas impacté

