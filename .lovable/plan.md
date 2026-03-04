

## Module "Planification Augmentée" — Plan d'implémentation

### Résumé

Créer le squelette complet du module : enregistrement dans le système de permissions, tables backend, Edge Functions (suggest + optimize), et front minimal (2 boutons + affichage résultats). Le moteur d'optimisation démarre en V1 heuristique (pas OR-Tools dans Deno).

### Contrainte technique critique

Les Edge Functions tournent sur **Deno** (Supabase). OR-Tools (C++/Python) n'est pas disponible. Le solveur V1 sera un **scoring heuristique multi-critères** en TypeScript pur. Un vrai solveur CP-SAT nécessiterait un service externe (hors scope V1).

---

### Phase 1 — Enregistrement du module

**Fichier** : `src/types/modules.ts`
- Ajouter `planning_augmente: 'planning_augmente'` dans `MODULES`
- Ajouter les options : `suggest`, `optimize`, `admin`
- Ajouter dans `MODULE_DEFINITIONS` (adminOnly, minRole: `franchisee_admin`)
- Ajouter dans `EnabledModules`

**Fichier** : `src/permissions/constants.ts`
- Ajouter `MODULE_MIN_ROLES['planning_augmente']` et `MODULE_LABELS`

**Fichier** : `src/hooks/useFeatureFlags.ts` — Rien à changer (feature_flags table gère déjà dynamiquement)

---

### Phase 2 — Tables backend (migration)

6 tables :

```sql
-- 1. Compétences techniciens
CREATE TABLE tech_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  tech_apogee_id INT NOT NULL,
  univers TEXT NOT NULL,
  level INT DEFAULT 1, -- 1-5
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, tech_apogee_id, univers)
);

-- 2. Calibration durées (prévu vs réel)
CREATE TABLE duration_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  tech_apogee_id INT NOT NULL,
  univers TEXT NOT NULL,
  planned_to_real_ratio NUMERIC DEFAULT 1.0,
  sample_size INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, tech_apogee_id, univers)
);

-- 3. Cache trajets
CREATE TABLE travel_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_geohash TEXT NOT NULL,
  to_geohash TEXT NOT NULL,
  minutes_estimate NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_geohash, to_geohash)
);

-- 4. Suggestions de planification
CREATE TABLE planning_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  dossier_id INT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  score_breakdown_json JSONB,
  status TEXT DEFAULT 'pending', -- pending, applied, dismissed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Moves d'optimisation semaine
CREATE TABLE planning_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES apogee_agencies(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  input_json JSONB NOT NULL,
  moves_json JSONB NOT NULL,
  summary_gains_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Config pondérations par agence
CREATE TABLE planning_optimizer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES apogee_agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weights JSONB DEFAULT '{"sla":0.3,"ca":0.2,"route":0.2,"coherence":0.15,"equity":0.1,"continuity":0.05}',
  hard_constraints JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS : N2+ de l'agence en lecture/écriture, N5+ toutes agences.

---

### Phase 3 — Edge Functions

**`suggest-planning`** (principal)
- Input : `{ agency_id, dossier_id }`
- Logique V1 :
  1. Fetch dossier (univers, type, durée, localisation, tech initiateur)
  2. Fetch techniciens actifs + skills + dispos semaine
  3. Fetch planning existant (créneaux libres)
  4. Filtre candidats (skills, dispo, distance Haversine)
  5. Score multi-critères (SLA, route, continuité, charge, cohérence)
  6. Retourne top 3 avec breakdown
- Output : `{ suggestions: [{ rank, date, hour, tech_id, tech_name, duration, buffer, score, reasons[] }] }`

**`optimize-week`**
- Input : `{ agency_id, week_start }`
- Logique V1 :
  1. Fetch tout le planning de la semaine
  2. Identifier les swaps/moves possibles (paires proches géographiquement sur mauvais tech)
  3. Scorer chaque move (gain route + gain trous + risque)
  4. Retourner top N moves triés par gain net
- Output : `{ moves: [{ type, description, from, to, gain_minutes, gain_ca, risk, explanation }] }`

**`apply-planning-action`**
- Écrit dans `planning_suggestions` ou `planning_moves` avec status=applied
- Audit trail complet (input/output)

---

### Phase 4 — Front minimal

**Emplacement admin** : `PlateformeView` > onglet "Modules" (AdminFeatureFlags) — le module apparaît comme un feature flag activable.

**Page config** : Nouvelle vue dans PlateformeView ou section dédiée pour :
- Voir/éditer les pondérations (`planning_optimizer_config`)
- Voir les logs de suggestions récentes
- KPIs (stats d'utilisation)

**Composants métier** (intégrables plus tard dans les pages dossier/planning) :
- `SuggestPlanningButton` : bouton + dialog résultat top 3
- `OptimizeWeekButton` : bouton + dialog liste de moves
- Chaque suggestion/move : card avec score, raisons, boutons Appliquer/Ignorer

---

### Phase 5 — Feature Flag

Insérer dans `feature_flags` :
- `module_key: 'planning_augmente'`
- `module_group: 'intelligence'`
- `is_enabled: false` (désactivé par défaut)
- `dev_status: 'in_progress'`

---

### Fichiers créés/modifiés

| Action | Fichier |
|--------|---------|
| Modifier | `src/types/modules.ts` — Ajouter module + options + definition |
| Modifier | `src/permissions/constants.ts` — Labels + min roles |
| Créer | `supabase/functions/suggest-planning/index.ts` |
| Créer | `supabase/functions/optimize-week/index.ts` |
| Créer | `supabase/functions/apply-planning-action/index.ts` |
| Créer | `src/components/planning-augmente/SuggestPlanningButton.tsx` |
| Créer | `src/components/planning-augmente/OptimizeWeekButton.tsx` |
| Créer | `src/components/planning-augmente/SuggestionCard.tsx` |
| Créer | `src/components/planning-augmente/MoveCard.tsx` |
| Créer | `src/components/planning-augmente/PlanningAugmenteAdmin.tsx` |
| Créer | `src/hooks/usePlanningAugmente.ts` — hooks React Query |
| Migration | 6 tables + RLS policies |
| Insert | 1 feature flag row |

### Ordre d'exécution

1. Migration tables + RLS
2. Module registration (types + permissions)
3. Edge Functions (suggest-planning d'abord)
4. Hooks React Query
5. Composants front
6. Feature flag insert
7. Intégration dans PlateformeView

