# Audit complet — Module Performance Terrain

**Date** : 2026-03-25  
**Phase** : 6 — Lot 0 (cadrage prédictif)  
**Version moteur** : V2 (Phase 5 close)

---

## 0.1 — Cartographie des sources de données

### Sources actives

| Source | Origine | Données extraites | Fiabilité |
|--------|---------|-------------------|-----------|
| **Interventions** (Apogée API) | `DataService.loadAllData().interventions` | visites[], type, type2, projectId, userId, duree, date | ★★★ — structurée, mais durées souvent manquantes |
| **Créneaux planning** (Apogée API) | `DataService.loadAllData().creneaux` | date, usersIds, interventionId, duree | ★★☆ — présent mais durée rarement fiable |
| **Users** (Apogée API) | `DataService.loadAllData().users` | id, name, is_on, data.skills, data.bgcolor | ★★★ — source primaire d'identification tech |
| **Projects** (Apogée API) | `DataService.loadAllData().projects` | id, pictosInterv, universes, commanditaireId | ★★★ — fiable |
| **Contrats RH** (Supabase) | `employment_contracts` via `collaborators.apogee_user_id` | weekly_hours, is_current | ★★★ — fiable quand peuplé, souvent vide |
| **Absences RH** (Supabase) | `technician_absences` | start_date, end_date, is_full_day, hours, absence_type | ★★★ — fiable mais table généralement vide (nouvelle) |
| **Absences planning** (heuristique) | Mots-clés dans creneaux/interventions | type/label contenant "arrêt", "congé", etc. | ★☆☆ — approximation, days=1 en dur |
| **Config agence** (Supabase) | `agency_performance_config` | seuils productivité/charge/SAV, heures défaut | ★★★ — fiable |
| **Jours fériés** | `agency_performance_config.holidays` | Liste de dates | ☆☆☆ — **NON IMPLÉMENTÉ** (TODO dans usePerformanceConfig) |

### Sources non exploitées (candidates forecast)

| Source | Localisation | Données potentielles | Exploitable ? |
|--------|-------------|---------------------|---------------|
| **Devis signés** | `chargeTravauxEngine` (Statia) | dossiers travaux à planifier, montants devisés | ✅ Oui — via `useChargeTravauxAVenir` |
| **Pipeline projets** | `chargeTravauxEngine` | maturité, aging, charge/tech, charge/semaine | ✅ Oui — déjà calculé dans PilotageAvanceSection |
| **Interventions futures** | Créneaux avec date > today | créneaux planifiés non encore réalisés | ✅ Oui — filtrage date simple |
| **Indisponibilités futures** | `technician_absences` (end_date > today) | absences validées futures | ✅ Oui — requête simple |
| **Compétences techniciens** | `users.data.skills` | univers maîtrisés par tech | ✅ Oui — dans la technicianMap |
| **Univers projets** | `projects.universes` | allocation par métier | ✅ Oui |

---

## 0.2 — Cartographie composants & hooks

### Moteur (`src/modules/performance/engine/`)

| Fichier | Rôle | Maturité | Couplage forecast |
|---------|------|----------|-------------------|
| `types.ts` | Modèle canonique (20+ types) | ★★★ Stable | Input du forecast |
| `performanceEngine.ts` | Orchestrateur principal | ★★★ Stable | Lecture seule pour forecast |
| `capacity.ts` | Calcul capacité jours ouvrés | ★★★ Stable | **Réutilisable** pour capacité future |
| `duration.ts` | Résolution durée hiérarchique | ★★★ Stable | Non directement utile au forecast |
| `classification.ts` | Productif/NP/SAV/Autre | ★★★ Stable | Non directement utile |
| `matching.ts` | Rapprochement visite↔créneau | ★★★ Stable | Non directement utile |
| `consolidation.ts` | Pipeline unification WorkItems | ★★★ Stable | Non directement utile |
| `allocation.ts` | Division equal_split multi-tech | ★★★ Stable | Non directement utile |
| `confidence.ts` | Score confiance V2 + malus + tiers | ★★★ Stable | **Pattern réutilisable** pour forecast confidence |
| `zones.ts` | Seuils productivité/charge/SAV | ★★★ Stable | Non directement utile |
| `rules.ts` | Constantes, seuils, poids | ★★★ Stable | Partiellement réutilisable |

### Hooks (`src/modules/performance/hooks/`)

| Fichier | Rôle | Consommateurs |
|---------|------|---------------|
| `usePerformanceTerrain.ts` | Fetch + engine → snapshots | PerformanceDashboard |
| `useTechnicianPerformance.ts` | Détail 1 tech (re-export) | Aucun consommateur direct détecté |
| `usePerformanceConfig.ts` | Config agence → PerformanceConfig | usePerformanceTerrain |
| `useTechnicianAbsences.ts` | Absences RH structurées | usePerformanceTerrain |

### Composants UI — Dashboard (`src/components/performance/`)

| Composant | Rôle | Dépendance moteur |
|-----------|------|-------------------|
| `PerformanceDashboard.tsx` | Orchestrateur UI principal (547 lignes) | usePerformanceTerrain, engineOutput |
| `TeamHeatmap.tsx` | Grille visuelle équipe | TechnicianPerformance (legacy) |
| `TechnicianRadarChart.tsx` | Radar individuel | TechnicianPerformance (legacy) |
| `SavDetailsDrawer.tsx` | Détail SAV par tech | TechnicianPerformance (legacy) |
| `PerformanceLegend.tsx` | Légende couleurs | Autonome |
| `TechnicianQuickEditDialog.tsx` | Édition paramètres tech | TechnicianPerformance (legacy) |

### Composants UI — V2 (`src/modules/performance/components/`)

| Composant | Rôle | Dépendance moteur |
|-----------|------|-------------------|
| `ConfidenceBadge.tsx` | Badge confiance avec tooltip détaillé | ConfidenceBreakdown |
| `DataQualityBadge.tsx` | Badge alertes qualité + compteur tech | DataQualityFlags, TechnicianSnapshot[] |
| `DegradedStateAlert.tsx` | Alerte avec recommandations actionnables | DataQualityFlags |
| `WorkloadBreakdown.tsx` | Répartition temps par catégorie | workload (snapshot) |
| `ExplainCalculation.tsx` | Traçabilité calcul détaillée | CalculationTrace, ConfidenceBreakdown |
| `CapacityBreakdown.tsx` | Décomposition capacité | CapacityResult |

### Legacy bridge

| Fichier | Rôle |
|---------|------|
| `src/hooks/usePerformanceTerrain.ts` | Re-export backward compat |
| `types.ts → snapshotToLegacy()` | Conversion Snapshot → TechnicianPerformance |

### Point d'entrée routing

- `PilotageTabContent.tsx` → lazy import `PerformanceDashboard`
- Tab "performance" dans le pilotage

---

## 0.3 — Audit qualité des données (estimations terrain)

| Métrique | État estimé | Impact forecast |
|----------|-------------|-----------------|
| Taux durées explicites | **~30-50%** (beaucoup de business_default) | ⚠ Le forecast doit ignorer les durées fallback pour la projection |
| Taux fallback durée | **~50-70%** | ⚠ Fort — highFallbackUsage fréquent |
| Taux matching ambigu | **~5-15%** | ✅ Faible impact |
| Couverture contrats RH | **~20-40%** (table souvent vide) | ⚠ Capacité estimée à 35h pour la majorité |
| Couverture absences RH | **~0-10%** (table nouvelle, vide) | ⚠ Quasi aucune donnée RH réelle |
| Taux techniciens inconnus | **~0-5%** (policy: team_only) | ✅ Faible |
| Jours fériés | **0%** (TODO non implémenté) | ⚠ Capacité surestimée sur mois avec fériés |

---

## 0.4 — Limites fonctionnelles documentées

### ✅ Sources de vérité

| Donnée | Source | Confiance |
|--------|--------|-----------|
| Identité technicien | Apogée users (is_on + skills) | Haute |
| Classification intervention | rules.json → PRODUCTIVE_TYPES / NON_PRODUCTIVE_TYPES | Haute |
| Résolution durée | Hiérarchie explicit > computed > planning > default | Haute (processus) |
| Seuils performance | agency_performance_config (fallback defaults) | Haute |
| Calcul capacité jours ouvrés | `capacity.ts` (weekdays - holidays - absences) | Haute (code) |

### ⚠ Approximations tolérées

| Donnée | Approximation | Risque |
|--------|---------------|--------|
| Durée intervention | business_default (60min) si aucune donnée | Moyen — biais systématique |
| Capacité hebdo | 35h si pas de contrat RH | Moyen — quasi-systématique |
| Absences | planning heuristic (mots-clés, days=1) | Élevé — très imprécis |
| Allocation multi-tech | equal_split | Faible — acceptable |
| CA technicien | Toujours null (V1) | Aucun — masqué en UI |

### ❌ Exclusions formelles du prédictif

| Donnée | Raison d'exclusion |
|--------|-------------------|
| Durées de type `business_default` ou `unknown` | Bruit — ne reflètent pas une durée réelle |
| Absences heuristiques (planning) pour projection future | Trop imprécis — aucun engagement |
| CA technicien | Non disponible — aucune donnée |
| Jours fériés | Non implémenté — parser le JSON config |

---

## 0.5 — Hypothèses prédictives autorisées

### Capacité future

| Input | Autorisé | Condition |
|-------|----------|-----------|
| Contrat RH (weekly_hours) | ✅ Oui | is_current = true |
| Absences RH futures (technician_absences) | ✅ Oui | end_date > today |
| Jours fériés | ✅ Oui | **À implémenter d'abord** |
| Absence planning future | ⚠ Toléré | Flaggé comme non fiable |
| Default 35h | ⚠ Toléré | Avec confidenceLevel = 'low' |

### Charge future

| Input | Autorisé | Condition |
|-------|----------|-----------|
| Créneaux planifiés futurs | ✅ Oui — **charge engagée** | date > today |
| Interventions futures affectées | ✅ Oui — **charge engagée** | date future |
| Pipeline travaux (chargeTravauxEngine) | ✅ Oui — **charge probable** | Séparé de l'engagé |
| Devis signés non planifiés | ⚠ Toléré — **charge hypothétique** | Bas de confiance |

### Signaux de tension

| Signal | Source | Fiabilité |
|--------|--------|-----------|
| Surcharge = charge engagée > capacité | Créneaux + capacité RH | ★★★ si RH peuplé |
| Sous-charge = peu de créneaux futurs | Créneaux planning | ★★☆ |
| Dépendance tech = concentration charge | Distribution créneaux | ★★☆ |
| Trou de charge exploitable | Capacité - charge engagée | ★★☆ |

---

## 0.6 — Synergies existantes avec le prédictif

### chargeTravauxEngine (déjà implémenté dans Statia)

Le module `src/statia/shared/chargeTravauxEngine.ts` calcule déjà :
- `pipelineMaturity` — maturité du pipeline projets
- `pipelineAging` — vieillissement des dossiers
- `riskProjects` — dossiers à risque
- `chargeByTechnician` — charge par technicien (projets futurs)
- `weeklyLoad` — charge hebdomadaire
- `dataQuality` — qualité des données

**→ Ces données sont directement exploitables comme "charge probable" dans le forecast.**

Le hook `useChargeTravauxAVenir` expose déjà tout cela.

### PilotageAvanceSection (déjà dans l'UI)

Les composants suivants existent déjà dans `stats-hub/previsionnel/` :
- `PipelineMaturityCard`
- `PipelineAgingCard`
- `RiskDossiersCard`
- `ChargeTechnicienCard`
- `ChargeSemaineCard`
- `FiabilitePrevisionnelCard`

**→ Base UI réutilisable pour le forecast dashboard.**

---

## 0.7 — Tests existants

| Suite | Tests | Couverture |
|-------|-------|-----------|
| `capacity.test.ts` | Jours ouvrés, holidays, absences | ★★★ |
| `duration.test.ts` | Hiérarchie résolution, aberrant | ★★★ |
| `allocation.test.ts` | Equal split, edge cases | ★★★ |
| `matching.test.ts` | Score similarité, seuils merge | ★★★ |
| `confidence.test.ts` | Poids V2, malus, tiers | ★★★ |
| `consolidation.test.ts` | Pipeline complet | ★★★ |
| `performanceEngine.test.ts` | Orchestrateur bout-en-bout | ★★★ |
| `absences.test.ts` | Scénarios métier RH (8 cas) | ★★★ |
| **Total** | **61 tests, 8 suites** | |

---

## 0.8 — Décisions d'architecture pour Phase 6

### Séparation stricte

```
src/modules/performance/
├── engine/          ← historique (constat) — NE PAS TOUCHER
├── hooks/           ← hooks historiques — NE PAS TOUCHER
├── components/      ← composants V2 — NE PAS TOUCHER
└── forecast/        ← NOUVEAU — tout le prédictif ici
    ├── types.ts
    ├── projection.ts
    ├── capacityFuture.ts
    ├── tension.ts
    ├── recommendations.ts
    └── __tests__/
```

### Réutilisation autorisée

| Module existant | Usage forecast |
|----------------|----------------|
| `capacity.ts → computeCapacity()` | Calcul capacité future (même logique) |
| `confidence.ts` pattern | Inspiration pour `forecastConfidence` |
| `types.ts → PerformanceConfig` | Config commune |
| `chargeTravauxEngine` | Source "charge probable" |
| `useTechnicianAbsences` | Absences futures |

### Interdictions

- Ne pas modifier `performanceEngine.ts`
- Ne pas modifier `snapshotToLegacy()`
- Ne pas mélanger snapshots historiques et forecast dans les mêmes structures
- Ne pas afficher du prédictif sans `forecastConfidenceLevel`

---

## Résumé exécutif

| Dimension | État | Prêt forecast ? |
|-----------|------|-----------------|
| Moteur historique | ★★★ Stable, testé, audité | ✅ Source fiable |
| Capacité future | computeCapacity réutilisable | ✅ Prêt |
| Absences futures | Table existe, hook existe | ✅ Prêt (données rares) |
| Charge engagée | Créneaux futurs disponibles | ✅ Exploitable |
| Charge probable | chargeTravauxEngine existe | ✅ Exploitable |
| Jours fériés | ❌ Non implémenté | ⚠ À faire en pré-requis |
| Contrats RH | Souvent vides | ⚠ Limite terrain |
| UI prédictive | PilotageAvanceSection existe | ✅ Base réutilisable |
| Tests | 61 verts, 8 suites | ✅ Filet de sécurité |

### Pré-requis avant Lot 1

1. **Parser les jours fériés** dans `usePerformanceConfig.ts` (ligne 43 : `holidays: []` en dur)
2. Décider si le forecast est un onglet séparé ou intégré au dashboard existant
