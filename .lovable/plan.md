

# Phase 5 — Data Quality & Confiance avancee

## Etat actuel

- **Absences** : detection heuristique par mots-cles dans planning, `days: 1` en dur, source = `planning_unavailability`. Aucune table d'absences n'existe en base.
- **Confiance** : scoring lineaire sans malus, 4 poids fixes (0.35/0.25/0.20/0.20). Pas de tiers (high/medium/low).
- **UX** : badges et alertes OR-agreges, pas de comptage par tech impacte, pas de recommandations.
- **Debug** : ExplainCalculation existe mais sans detail penalites ni matchs ambigus.

---

## Micro-lot 1 — Table d'absences + integration moteur

### 1.1 Migration : creer `technician_absences`

```sql
CREATE TABLE technician_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  technician_apogee_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_type TEXT NOT NULL DEFAULT 'autre',
  is_full_day BOOLEAN NOT NULL DEFAULT true,
  hours NUMERIC(4,1),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE technician_absences ENABLE ROW LEVEL SECURITY;
-- RLS: lecture/ecriture par agence
```

Cle de liaison : `technician_apogee_id` (= l'id Apogee du user, coherent avec `technicianMap`).

### 1.2 Hook `useTechnicianAbsences`

Nouveau fichier `src/modules/performance/hooks/useTechnicianAbsences.ts`.

- Query Supabase `technician_absences` filtre par `agency_id` et periode
- Retourne `Map<string, AbsenceEntry[]>` avec calcul reel des jours/heures par tech
- Gere demi-journees et chevauchements weekend

### 1.3 Modifier `usePerformanceTerrain`

- Appeler `useTechnicianAbsences` en parallele du fetch existant
- Si absences RH trouvees : source = `'leave_table'`, days = calcul reel, confidence = 1.0
- Sinon : fallback sur detection heuristique actuelle (inchange)
- Mise a jour du type `AbsenceInfo` pour supporter `hours` en plus de `days`

### 1.4 Modifier `capacity.ts`

- Accepter `absenceHours` en option (en plus de `absenceDays`)
- Si `absenceHours` fourni : deduire en minutes directement au lieu de jours entiers
- Support demi-journees

### 1.5 DataQualityFlags

Remplacer le booleen `missingAbsenceData` par :

```typescript
absenceReliability: 'none' | 'partial' | 'reliable'
```

- `reliable` = toutes les absences viennent de `leave_table`
- `partial` = mix RH + planning
- `none` = aucune source

Impact : `DegradedStateAlert`, `DataQualityBadge`, `ExplainCalculation` doivent lire le nouveau champ.

### Fichiers modifies

| Fichier | Action |
|---|---|
| Migration SQL | Creer table + RLS |
| `engine/types.ts` | `absenceReliability` dans `DataQualityFlags`, `absenceHours` dans `AbsenceInfo` |
| `engine/capacity.ts` | Support `absenceHours` |
| `hooks/useTechnicianAbsences.ts` | Nouveau hook |
| `hooks/usePerformanceTerrain.ts` | Integration absences RH |
| `engine/performanceEngine.ts` | Peupler `absenceReliability` |
| `components/DataQualityBadge.tsx` | Lire `absenceReliability` |
| `components/DegradedStateAlert.tsx` | Lire `absenceReliability` |
| `PerformanceDashboard.tsx` | Adapter aggregation flags |

---

## Micro-lot 2 — Confiance V2

### 2.1 Malus dynamiques dans `confidence.ts`

Apres le calcul lineaire existant, appliquer des penalites :

```typescript
let penalty = 0;
if (matchAmbiguousCount > 0) penalty += 0.10;
if (highFallbackUsage) penalty += 0.15;
if (missingContract) penalty += 0.20;
globalConfidenceScore = Math.max(0, globalConfidenceScore - penalty);
```

Modifier la signature pour accepter `highFallbackUsage` et `missingContract` en input.

### 2.2 Nouveaux poids

```typescript
duration: 0.30, capacity: 0.25, matching: 0.25, classification: 0.20
```

### 2.3 Confidence tiers

Ajouter dans `types.ts` :

```typescript
export type ConfidenceLevel = 'high' | 'medium' | 'low';
```

Ajouter `confidenceLevel` dans `ConfidenceBreakdown`. Calculer dans `confidence.ts` :
- `> 0.8` = high
- `0.6-0.8` = medium  
- `< 0.6` = low

### 2.4 Propagation

`ConfidenceBadge` affiche le tier avec couleur (vert/orange/rouge).

### Fichiers modifies

| Fichier | Action |
|---|---|
| `engine/types.ts` | `ConfidenceLevel`, `confidenceLevel` dans `ConfidenceBreakdown` |
| `engine/confidence.ts` | Malus + nouveaux poids + tier |
| `engine/rules.ts` | Mettre a jour `CONFIDENCE_WEIGHTS` |
| `engine/performanceEngine.ts` | Passer `highFallbackUsage` et `missingContract` au calcul |
| `components/ConfidenceBadge.tsx` | Afficher tier |

---

## Micro-lot 3 — UX decisionnelle

### 3.1 DataQualityBadge V2

Remplacer le simple compteur par un affichage du nombre de techniciens impactes :

```
⚠️ 3 techniciens — fallback eleve
```

Recevoir `snapshots` en prop, compter par type de flag.

### 3.2 DegradedStateAlert V2

Ajouter des recommandations par flag :

| Flag | Recommandation |
|---|---|
| missingPlanningCoverage | Verifier le planning |
| highFallbackUsage | Ameliorer la saisie des durees |
| ambiguousMatching | Verifier les doublons |
| missingContract | Completer les donnees RH |
| absenceReliability = none | Saisir les absences |

### 3.3 Dashboard : adapter aggregation

Passer les snapshots complets aux composants V2 au lieu des flags OR-agreges.

### Fichiers modifies

| Fichier | Action |
|---|---|
| `components/DataQualityBadge.tsx` | Accepter snapshots, compter techs impactes |
| `components/DegradedStateAlert.tsx` | Ajouter recommandations |
| `PerformanceDashboard.tsx` | Passer snapshots aux composants |

---

## Micro-lot 4 — Debug avancee

### 4.1 ExplainCalculation enrichi

Ajouter sections :
- Penalites appliquees (liste des malus avec valeur)
- Matchs ambigus (count + scores)
- Source des absences (RH vs planning vs none)

### 4.2 Mode debug via query param

Si `?debugPerformance=true` : afficher matchLog brut et consolidationTrace complet dans un panneau collapsible supplementaire.

### Fichiers modifies

| Fichier | Action |
|---|---|
| `components/ExplainCalculation.tsx` | Sections penalites + ambigus + absences |
| `PerformanceDashboard.tsx` | Lire query param, passer mode debug |

---

## Ordre d'execution

1. **Micro-lot 1** — migration + hook absences + integration moteur
2. **Micro-lot 2** — confiance V2 (malus + tiers)
3. **Micro-lot 3** — UX decisionnelle
4. **Micro-lot 4** — debug/explain

## Regles strictes

- Aucune modification des outputs legacy (`snapshotToLegacy` reste stable)
- Le fallback heuristique absences reste actif si pas de donnees RH
- Tests existants doivent rester verts
- Pas de breaking change sur les composants deja branches

