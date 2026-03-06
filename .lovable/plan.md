

# Plan — Module Planning V2 / Dispatch Board (Phases 1-3)

## Diagnostic de l'existant

Le projet dispose déjà de :
- **`apogeeProxy`** (432 lignes) : proxy avec cache mémoire, sémaphore, déduplication. Expose `getPlanningCreneaux`, `getInterventions`, `getProjects`, `getClients`, `getUsers`. **Conservé tel quel.**
- **`src/shared/planning/normalize.ts`** : `unwrapArray`, `isActiveUser`, `isTechnician`, `normalizeCreneaux`. **Réutilisé.**
- **`src/shared/planning/events.ts`** : `buildTechOptions`, `buildEvents`, `PlanningEvent`. **Réutilisé pour la logique de détection technicien.**
- **`src/shared/api/apogee/usePlanningData.ts`** : hook `usePlanningData` qui enrichit les créneaux avec client/projet/intervention. **Pattern réutilisé, pas dupliqué.**
- **`PlanningTechniciensSemaine.tsx`** (512 lignes) : vue semaine existante mono-technicien. **Non modifié.**
- **`PlanningGrid.tsx`** (317 lignes) : grille 5 jours du module Planif IA. **Non modifié.**
- **`@dnd-kit`** déjà installé, **`mapbox-gl`** déjà installé, **`react-window`** déjà installé.
- Tables existantes `technician_skills`, `technician_profile`, `univers_catalog` pour les compétences.

L'interface unifiée utilise des onglets via `?tab=xxx`. Le planning actuel est accessible via `?tab=divers` subtab `plannings` et via la route `/agency/rh-tech/planning`.

## Arborescence créée (Phases 1-3)

```text
src/planning-v2/
├── constants.ts
├── types/
│   └── index.ts
├── services/
│   ├── normalizeApogee.ts
│   ├── computeLoad.ts
│   └── computeTravel.ts
├── hooks/
│   ├── usePlanningV2Data.ts
│   └── useFilters.ts
├── components/
│   ├── PlanningV2Shell.tsx
│   └── day/
│       ├── DayDispatchView.tsx
│       ├── TechColumnHeader.tsx
│       ├── AppointmentCard.tsx
│       ├── BlockCard.tsx
│       ├── TimeAxis.tsx
│       └── CurrentTimeLine.tsx
```

Plus :
- **1 fichier route** : ajout lazy import dans `pilotage.routes.tsx`
- **1 entrée navigation** : accessible via route `/planning-v2` (guard `RoleGuard minRole="franchisee_admin"` + `ModuleGuard moduleKey="pilotage_agence"`)

## Fichiers impactés (existants)

| Fichier | Impact |
|---------|--------|
| `src/routes/pilotage.routes.tsx` | Ajout route `/planning-v2` |
| Aucun autre fichier existant modifié | — |

## Types principaux

**`PlanningTechnician`** : id, apogeeId, name, initials, color, skills[], univers[], workStart/End, lunchStart/End, active, homeSector, lat/lng, maxDailyMinutes, order.

**`PlanningAppointment`** : id, apogeeId, dossierId, clientId, client (name), address, city, lat/lng, start/end (Date), durationMinutes, universe, type, priority, technicianIds[], status, confirmed, isBinome, apporteur, requiredSkills[], notes.

**`PlanningBlock`** : id, techId, type (conge/pause/absence/tache/atelier/formation), start/end, label, color.

**`PlanningUnscheduled`** : id, dossierId, client, city, universe, priority, estimatedDuration, requiredSkills[], reason, status.

**`PlanningAlert`** : id, type (conflict/amplitude/skill_mismatch/gap/unassigned), severity, message, appointmentId?, techId?.

**`TechDayLoad`** : techId, date, rdvCount, interventionMinutes, blockedMinutes, freeMinutes, chargePercent, gapSlots[], hasConflict.

**`DisplayDensity`** : `'compact' | 'standard' | 'detailed'`

## Stratégie de normalisation

`normalizeApogee.ts` prend en entrée les 5 jeux de données brutes (créneaux, interventions, projets, clients, users) et produit `{ technicians, appointments, blocks, unscheduled }`.

- **Techniciens** : réutilise `isTechnicienUser` + `isActiveUser` de `events.ts`/`normalize.ts`. Enrichit avec couleur, initiales, univers depuis `user.data`.
- **Appointments** : filtre créneaux `refType="visite-interv"`, joint via `pEventId → intervention → project → client` (même pattern que `usePlanningData.ts`).
- **Blocks** : filtre créneaux `refType="conge"|"rappel"|"absence"|"tache"`.
- **Unscheduled** : projets en état `new`/`to_planify_tvx` sans intervention planifiée.
- **Fallbacks** : lat/lng=null, skills=[], duration calculée depuis start/end ou heuristique par type (60/90/180 min), client="Inconnu" si non résolu.

## Points de vigilance

1. **Pas de duplication de fetch** : `usePlanningV2Data` utilise les mêmes queryKeys que `usePlanningData` pour bénéficier du cache React Query.
2. **Performance** : la vue jour avec 15-20 colonnes techniciens sera scrollable horizontalement avec sticky time axis + sticky headers via CSS `position: sticky`.
3. **Aucun samedi** : le module ne traite que Lun-Ven.
4. **Robustesse API** : chaque champ optionnel a un fallback explicite, jamais de crash sur données nulles.
5. **Pas de nouvelles tables DB** : tout est calculé en mémoire.

## Implémentation Phases 1-3

### Phase 1 — Types, constants, normalisation
- `types/index.ts` : tous les types listés ci-dessus
- `constants.ts` : HOUR_START=7, HOUR_END=19, HOUR_HEIGHT=60px, WEEK_DAYS=5, couleurs par défaut, durées fallback par type
- `services/normalizeApogee.ts` : fonction `normalizeApogeeData()` → `{ technicians, appointments, blocks, unscheduled }`
- `services/computeLoad.ts` : `computeTechDayLoad()`, `computeScheduleConflicts()`
- `services/computeTravel.ts` : estimation Haversine simple

### Phase 2 — Hook principal
- `hooks/usePlanningV2Data.ts` : fetch parallèle via `apogeeProxy`, normalisation, calcul charge/conflits, expose tout
- `hooks/useFilters.ts` : état filtres persisté en sessionStorage (technicien, date, densité)

### Phase 3 — Vue Jour Dispatch
- `PlanningV2Shell.tsx` : layout avec tabs (Jour/Semaine/Carte), navigation date, barre filtres
- `DayDispatchView.tsx` : grille principale — axe vertical heures, axe horizontal techniciens, scroll horizontal
- `TechColumnHeader.tsx` : sticky header par tech (nom, initiales, couleur, charge jour, nb RDV)
- `AppointmentCard.tsx` : carte RDV avec 3 densités (compact/standard/detailed), couleur tech en bordure gauche, badges type/univers
- `BlockCard.tsx` : blocs congés/pauses/tâches visuellement distincts (semi-transparent, hachuré)
- `TimeAxis.tsx` : colonne sticky horaire 07-19h
- `CurrentTimeLine.tsx` : ligne rouge animée "maintenant"
- Ajout route `/planning-v2` dans `pilotage.routes.tsx`

### Design UI
- Fond blanc propre, grilles très fines (border-gray-100)
- 1 colonne = 1 technicien, min-width 140px, bordure gauche colorée par tech
- Cartes : coins arrondis, ombre légère, hiérarchie typo forte (client gras, ville petit, badges discrets)
- Conflits : bordure rouge + icône warning inline
- Blocs non-intervention : fond hachuré ou pastel très léger
- Densité compact : juste client + heure. Standard : + ville + type. Detailed : + badges + durée + apporteur.

