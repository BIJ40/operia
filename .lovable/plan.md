

# Plan — Module "Zones de déplacement BTP"

## Objectif

Nouveau module `organisation.zones` visible dans l'onglet **Administratif** (sous-onglet "Zones"). Affiche un tableau récapitulatif mensuel des zones BTP par technicien, calculé à partir de la distance maximale à vol d'oiseau entre le dépot (adresse agence) et le RDV le plus éloigné de chaque journée.

## Zones BTP

| Zone | Distance |
|------|----------|
| 1A | 0–5 km |
| 1B | 5–10 km |
| 2 | 10–20 km |
| 3 | 20–30 km |
| 4 | 30–40 km |
| 5 | 40–50 km |

## Données disponibles

- **Adresse agence** : table `apogee_agencies` → colonnes `adresse`, `code_postal`, `ville` → géocodage via BAN API (comme `get-rdv-map`)
- **RDV avec coordonnées** : réutiliser l'edge function `get-rdv-map` (retourne lat/lng, techniciens, date)
- **Distance** : Haversine (vol d'oiseau) via `haversineKm` déjà dans `computeTravel.ts`

## Architecture

### 1. Module key — `src/types/modules.ts`

- Ajouter `'organisation.zones': 'organisation.zones'` dans `MODULES`
- Ajouter la définition dans `MODULE_DEFINITIONS` : category `organisation`, uiSubTab `administratif`, minRole `franchisee_admin`
- Cela le rend automatiquement visible dans les pages Droits et Droits Équipe (elles itèrent `MODULE_DEFINITIONS`)

### 2. Edge function — `supabase/functions/get-zones-deplacement/index.ts` (nouveau)

Paramètres : `{ month: "2026-03", agencySlug: "dax" }`

Logique :
1. Récupérer l'adresse de l'agence depuis `apogee_agencies` → géocoder via BAN → obtenir `depotLat, depotLng`
2. Pour chaque jour du mois, appeler l'API Apogée interventions (même logique que `get-rdv-map`)
3. Pour chaque technicien × jour : trouver le RDV avec la distance Haversine maximale au dépot
4. Classifier cette distance max en zone BTP (1A/1B/2/3/4/5)
5. Agréger : retourner `{ techId, techName, zones: { "1A": 3, "1B": 5, "2": 2, ... } }[]`

### 3. Hook — `src/hooks/useZonesDeplacement.ts` (nouveau)

- Appelle l'edge function avec le mois sélectionné et l'agence du profil
- Retourne `{ data: TechZoneSummary[], isLoading, error }`

### 4. Composant UI — `src/components/organisation/ZonesDeplacementTab.tsx` (nouveau)

- Sélecteur de mois (défaut = mois en cours)
- Tableau : colonnes Technicien | 1A | 1B | 2 | 3 | 4 | 5 | Total
- Ligne de totaux en bas
- Style cohérent avec les autres tableaux du projet

### 5. Intégration UI

**`DiversTabContent.tsx`** — `AdministratifSection` :
- Ajouter `'zones'` dans `AdminSubTab`
- Ajouter l'onglet folder "Zones" avec icône `MapPin`, gated par `organisation.zones`

**`OrganisationTabContent.tsx`** :
- Ajouter un sous-onglet "Zones" gated par `organisation.zones`

## Résumé technique

```text
apogee_agencies.adresse → BAN geocode → depotLat/Lng
                                          ↓
Apogée interventions (mois) → pour chaque tech/jour → max Haversine au dépot
                                          ↓
                                   classify zone BTP
                                          ↓
                              tableau Tech × Zone counts
```

## Ce qui ne change pas

- Aucune modification de base de données (pas de nouvelle table)
- Les pages Droits/Droits Équipe s'alimentent automatiquement via `MODULE_DEFINITIONS`
- L'edge function `get-rdv-map` existante n'est pas modifiée

