

# Plan : Carte choroplèthe par communes (polygones)

## Objectif
Remplacer les cercles par de vrais polygones communaux colorés selon la métrique active — comme les images de référence montrant chaque ville surlignée.

## Architecture technique

### Phase 1 — API geo.api.gouv.fr (rapide, sans stockage)

**Edge Function `get-rdv-map`** : nouveau mode + enrichissement des modes existants

1. **Récupérer les codes INSEE via BAN** : L'API BAN retourne déjà un champ `citycode` (code INSEE) dans ses résultats de géocodage. On l'extrait et le stocke dans `geocode_cache` (nouvelle colonne `code_insee`).

2. **Récupérer les polygones communaux** : Appeler `https://geo.api.gouv.fr/communes?codeDepartement=40,64&fields=code,nom,contour&format=geojson` pour obtenir les contours des communes Landes + Pyrénées-Atlantiques. Résultat mis en cache mémoire dans l'edge function.

3. **Joindre métriques ↔ polygones** : Agréger les données métier par `code_insee` (au lieu de code postal), puis injecter les métriques dans les `properties` de chaque Feature du GeoJSON communal.

4. **Retourner un GeoJSON complet** avec `geometry: Polygon/MultiPolygon` + propriétés métier.

**Frontend `MapsTabContent.tsx`** :

5. **Remplacer les circle-layers par fill-layer + line-layer** pour les onglets concernés (Densité, Rentabilité, Zones blanches, Score global, Saisonnalité, Apporteurs).

6. **Ajouter un switch "Vue points / Vue communes"** pour garder la possibilité de voir les points individuels quand c'est pertinent (RDV, Disponibilité restent en mode points).

7. **Popups au clic sur polygone** : mêmes infos qu'aujourd'hui, mais déclenchés sur le fill-layer.

## Détails d'implémentation

### Edge Function

```text
geo.api.gouv.fr/communes?codeDepartement=40,64
  → ~700 communes avec contours simplifiés (~500 KB)
  → caché en mémoire (durée de vie du worker)

BAN geocoding enrichi :
  response.features[0].properties.citycode → code_insee
  stocké dans geocode_cache.code_insee

Agrégation par code_insee :
  nb_dossiers, ca_total, marge, taux_transfo, score, etc.

Retour : GeoJSON FeatureCollection avec Polygon geometries
```

### Frontend Mapbox

```text
fill-layer :
  fill-color → interpolation sur la métrique
  fill-opacity → 0.6-0.75
  fill-outline-color → blanc

line-layer :
  line-color → blanc
  line-width → 1px

symbol-layer (labels) :
  text-field → nom commune
  text-size → adapté au zoom
```

### Onglets concernés

| Onglet | Métrique fill-color | Garde aussi les points ? |
|--------|-------------------|------------------------|
| Densité | nb_dossiers | Non (heatmap remplacée) |
| Rentabilité | marge/CA ratio | Optionnel |
| Zones blanches | activityIndex | Non |
| Apporteurs | nb_apporteurs | Non |
| Saisonnalité | variation mensuelle | Non |
| Score global | score composite | Non |
| RDV | — | Oui (reste en pins) |
| Disponibilité | — | Oui (reste en pins) |

### Migration DB

Ajouter colonne `code_insee TEXT` à la table `geocode_cache` pour stocker le code INSEE retourné par BAN.

## Fichiers modifiés
- `supabase/functions/get-rdv-map/index.ts` — logique polygones + code INSEE
- `src/components/unified/tabs/MapsTabContent.tsx` — fill/line layers
- Migration SQL — colonne `code_insee` sur `geocode_cache`

## Ce qui ne change pas
- Onglet "RDV" reste en mode pins/markers
- Onglet "Disponibilité" reste en mode pins temps réel
- Tour Mode inchangé

