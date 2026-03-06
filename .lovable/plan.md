

## Probleme actuel

Le dialog de parametrage technicien (clic droit → "Parametrer horaires & jours") existe deja (`TechSettingsDialog.tsx`) mais il est trop simpliste : un seul horaire global + une liste de jours travailles en checkboxes. Il ne permet pas de definir des horaires differents par jour (ex: repos le lundi, 8h-17h le mardi, etc.).

De plus, le moteur de charge (`computeLoad.ts`) utilise un `maxDaily` fixe (420 min par defaut) sans tenir compte des horaires reels du technicien par jour.

## Plan

### 1. Migration base de donnees — Nouvelle table `technician_weekly_schedule`

Remplacer les colonnes simples (`work_start`, `work_end`, `work_days`) par une table dediee avec une ligne par jour :

```sql
CREATE TABLE public.technician_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  work_start TEXT DEFAULT '08:00',
  work_end TEXT DEFAULT '17:00',
  lunch_start TEXT DEFAULT '12:00',
  lunch_end TEXT DEFAULT '13:00',
  UNIQUE(collaborator_id, day_of_week)
);
```

Avec RLS alignee sur les politiques `collaborators` existantes.

### 2. Refonte du `TechSettingsDialog`

Transformer le dialog en tableau a 7 lignes (Lundi → Dimanche). Chaque ligne :
- Toggle "Travaillé / Repos"
- Si travaille : 4 champs time (debut, fin, pause debut, pause fin)
- Si repos : ligne grisee, pas de champs horaires

On charge/sauvegarde depuis `technician_weekly_schedule` via le `collaborator_id` lie a `apogee_user_id`.

### 3. Integration dans le calcul de charge

Modifier `computeTechDayLoad` pour :
- Recevoir le schedule du technicien en parametre
- Calculer `maxDaily` dynamiquement selon le jour de la semaine (ex: mardi 8h-17h - 1h pause = 480 min)
- Si `is_working = false` pour ce jour → charge = 0, technicien marque indisponible

### 4. Hook de chargement des schedules

Creer un hook ou enrichir `usePlanningV2Data` pour charger les `technician_weekly_schedule` de tous les techniciens de l'agence et les injecter dans le calcul de charge et le filtrage d'indisponibilite.

### 5. Synchronisation module salarie

Les donnees etant stockees dans une table liee a `collaborators`, elles sont automatiquement accessibles depuis le module RH/Salaries existant. Le dialog est le point d'entree unique pour l'edition.

### Fichiers impactes

| Fichier | Action |
|---|---|
| Migration SQL | Creer `technician_weekly_schedule` |
| `TechSettingsDialog.tsx` | Refonte complete — tableau jour par jour |
| `computeLoad.ts` | `computeTechDayLoad` recoit le schedule, calcul dynamique |
| `usePlanningV2Data.ts` | Charger les schedules, injecter dans loads |
| `DayDispatchView.tsx` | Utiliser schedule pour detecter repos/indispo |

