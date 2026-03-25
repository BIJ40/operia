# Refonte module Performance Terrain — Plan d'implementation

## Autopsie confirmee

Le hook monolithique `usePerformanceTerrain.ts` (579 lignes) concentre fetch + calcul + agregation. Problemes critiques : capacite sur jours calendaires (inclut week-ends), pas de division multi-tech, CA a 0, absences par keyword sans confiance, aucun score de qualite donnees.

RLS du projet utilise `get_user_agency_id(auth.uid())` et `has_min_global_role(auth.uid(), N)` comme patterns standards.

---

## Phase 1 — Engine core (11 fichiers purs, zero dependance reseau)

### `src/modules/performance/engine/types.ts`

Tous les types canoniques : `WorkItem`, `DurationSource`, `AbsenceSource` (`leave_table | planning_unavailability | none`), `CalculationWarningCode` (9 codes), `CalculationTrace` (avec `itemCountBySource`, `minutesBySource`), `DataQualityFlags` (7 booleans), `ConfidenceBreakdown` (4 sous-scores + global), `CapacityResult`, `TechnicianSnapshot`, `UnknownTechnicianPolicy`, `PerformanceConfig`.

### `src/modules/performance/engine/rules.ts`

Fichier unique centralisant : `DURATION_HIERARCHY`, `CONFIDENCE_WEIGHTS` ({duration: 0.35, capacity: 0.25, matching: 0.2, classification: 0.2}), `DEFAULT_THRESHOLDS`, `PRODUCTIVE_TYPES`/`NON_PRODUCTIVE_TYPES` (depuis STATIA_RULES), `MATCHING_THRESHOLDS` (merge: 0.7, overlap: 0.5), `MAX_DURATION_MINUTES` (720), `DEFAULT_WEEKLY_HOURS` (35), `DEFAULT_TASK_DURATION` (60), `UNKNOWN_TECHNICIAN_POLICY: 'team_only'`.

### `src/modules/performance/engine/capacity.ts`

`computeCapacity(weeklyHours, period, options?)` — itere jour par jour, exclut samedi/dimanche, param optionnel `holidays: Date[]`. Absences : si `source === 'planning_unavailability'` et `deductPlanningUnavailability === false` → pas de deduction, flag `missingAbsenceData`. Si `source === 'none'` → capacite brute. Retourne `CapacityResult` complet avec `absenceConfidence`.

### `src/modules/performance/engine/duration.ts`

`resolveDuration(workItem)` — hierarchie stricte : explicite > computed (start/end) > planning > business_default > unknown. Duree aberrante (>720min ou negative) → warning + fallback. Retourne `{minutes, source}`.

### `src/modules/performance/engine/allocation.ts`

`allocateDuration(minutes, technicianIds)` — division equitable stricte `minutes / N`. Retourne Map + method `'equal_split'`.

### `src/modules/performance/engine/classification.ts`

`classifyWorkItem(type, type2)` et `isSavIntervention(intervention, project)` — logique existante extraite, utilise listes de `rules.ts`.

### `src/modules/performance/engine/matching.ts`

`scoreWorkItemSimilarity(a, b)` — criteres : meme interventionId (0.4), chevauchement horaire (0.3), techniciens communs (0.2), meme projectId (0.1). Normalisation UTC avant scoring. Items sans `end` → `end = start + duration`. `shouldMergeWorkItems(a, b)` (score > seuil). `mergeWorkItems(a, b)` (priorite visite > creneau). Chaque decision tracee comme `MatchOutcome`.

### `src/modules/performance/engine/consolidation.ts`

`buildUnifiedWorkItems(interventions, creneaux, projects)` → `{items: WorkItem[], matchLog: MatchOutcome[]}`. Pipeline : extraire visites → extraire creneaux → matcher par score → fusionner ou garder separe → tracer.

### `src/modules/performance/engine/confidence.ts`

`computeConfidenceBreakdown(snapshot)` → `ConfidenceBreakdown`. 4 sous-scores independants, global = somme ponderee depuis `rules.ts`.

### `src/modules/performance/engine/zones.ts`

`getProductivityZone`, `getSavZone`, `getLoadZone`, `getCompositeScore` — parametrables via config.

### `src/modules/performance/engine/performanceEngine.ts`

`computeTechnicianSnapshots(workItems, technicianMap, capacities, config)` — orchestrateur. Politique `team_only` pour techniciens inconnus : comptabilises dans agregate equipe, pas dans lignes individuelles, warning emis. `caGenerated: null` toujours. Retourne `TechnicianSnapshot[]`.

---

## Phase 2 — Hooks refondus

### `src/modules/performance/hooks/usePerformanceTerrain.ts`

Thin wrapper : fetch DataService + Supabase (collaborators, contracts) → passe au engine → retourne snapshots. Memes query keys (`performance-terrain`). Type `TechnicianPerformance` etendu (anciens champs conserves + nouveaux).

### `src/modules/performance/hooks/usePerformanceConfig.ts`

Charge `agency_performance_config` avec fallback sur `DEFAULT_THRESHOLDS`.

### `src/hooks/usePerformanceTerrain.ts` (modifie)

Re-export vers le nouveau module pour compatibilite.

---

## Phase 3 — Migration SQL

Table `agency_performance_config` avec `deduct_planning_unavailability BOOLEAN DEFAULT false`, RLS alignee sur patterns existants :

- Lecture : `get_user_agency_id(auth.uid()) = agency_id OR has_min_global_role(auth.uid(), 5)`
- Ecriture : meme agence + N3+ OU N5+ global

---

## Phase 4 — Composants UX (6 nouveaux)

- `ConfidenceBadge.tsx` — badge 0-100% avec sous-scores au hover
- `DataQualityBadge.tsx` — icone + tooltip montrant les flags actifs
- `WorkloadBreakdown.tsx` — decomposition productif/non-productif/SAV avec sources
- `CapacityBreakdown.tsx` — jours ouvres - absences = capacite effective
- `ExplainCalculation.tsx` — panneau drill-down avec `calculationTrace`
- `DegradedStateAlert.tsx` — alerte explicite (contrat absent, absences inconnues, trop de fallback, couverture partielle)

Dashboard enrichi : ajout KPIs confiance + tension dans header, tooltip heatmap enrichi.

---

## Phase 5 — Tests (7 fichiers)

Tests standards + vicieux : chevauchements partiels, visite sans fin, intervention sans tech, contrat absent, periode 100% week-end, doublon imparfait ±15min, technicien inactif, duree aberrante, aucune donnee.

---

## Fichiers (30+)


| Action   | Fichier                                               |
| -------- | ----------------------------------------------------- |
| Creer    | 11 fichiers `src/modules/performance/engine/`         |
| Creer    | 7 fichiers `__tests__/`                               |
| Creer    | 2 hooks `src/modules/performance/hooks/`              |
| Creer    | 6 composants `src/modules/performance/components/`    |
| Creer    | Migration SQL                                         |
| Modifier | `src/hooks/usePerformanceTerrain.ts` → re-export      |
| Modifier | `src/components/performance/PerformanceDashboard.tsx` |
| Modifier | `src/components/performance/TeamHeatmap.tsx`          |


## Technical details

- RLS pattern: `get_user_agency_id(auth.uid())` + `has_min_global_role` (confirmed from 50+ existing migrations)
- STATIA_RULES already exports `productiveTypes` and `nonProductiveTypes` at `src/statia/domain/rules.ts`
- DataService.loadAllData returns `{users, clients, projects, interventions, factures, devis, creneaux}`
- Employment contracts loaded via Supabase `collaborators` + `employment_contracts` tables (existing pattern)
- Existing components (SavDetailsDrawer, QuickEditDialog, Legend, RadarChart) conserved — import path updated via re-export

&nbsp;

&nbsp;

### Contraintes finales d’implémentation

1. `agency_performance_config` doit rester en **mode simple V1** : une seule config active par agence (`UNIQUE (agency_id)`), sans historique fonctionnel.
2. Si `adjustedCapacityMinutes = 0`, alors `loadRatio = null`, warning `ZERO_WORKING_DAYS`, et UI explicite “capacité non calculable”.
3. Une durée `unknown` ne doit jamais être injectée silencieusement comme temps réel. Elle doit soit rester exclue, soit être convertie via `business_default` avec traçabilité explicite et baisse de confiance.
4. Le moteur analytique doit être livré avant l’adaptation UI.
5. Aucun composant UI ne doit recalculer de logique métier déjà produite par l’engine.