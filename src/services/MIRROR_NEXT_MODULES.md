# Migration future : projects & factures vers miroir

> Préparé le 2026-03-26 — **NE PAS ACTIVER** avant stabilisation users (48h–7j)

## Prérequis (déjà en place ✅)

| Élément | Status |
|---------|--------|
| Tables `projects_mirror`, `factures_mirror` | ✅ Créées et remplies par `apogee-full-sync` |
| Mappers typés `mapMirrorProjectToAppShape` | ✅ `src/services/mirrorValidation.ts` |
| Mappers typés `mapMirrorFactureToAppShape` | ✅ `src/services/mirrorValidation.ts` |
| `withMirrorResolution` pour projects/factures | ✅ `dataServiceAdapter.ts` (StatIA path) |
| Monitoring, journal, snapshots | ✅ Génériques, fonctionnent pour tout module |
| Quality guards + silent comparison | ✅ Actifs pour tous les modules |
| Champs requis pour comparaison | ✅ projects: `[id, clientId]`, factures: `[id, projectId]` |

## Activation projects (quand autorisé)

```sql
-- Étape 1 : Vérifier le volume miroir
SELECT COUNT(*) FROM projects_mirror 
WHERE agency_id = '58d8d39f-7544-4e78-86f9-c182eacf29f5' 
  AND mirror_status = 'synced';

-- Étape 2 : Activer en fallback (DAX uniquement)
INSERT INTO data_source_flags (module_key, agency_id, source_mode, is_enabled, freshness_threshold_minutes)
VALUES ('projects', '58d8d39f-7544-4e78-86f9-c182eacf29f5', 'fallback', true, 480);

-- Rollback immédiat
DELETE FROM data_source_flags 
WHERE module_key = 'projects' 
  AND agency_id = '58d8d39f-7544-4e78-86f9-c182eacf29f5';
```

## Activation factures (quand autorisé)

```sql
-- Étape 1 : Vérifier le volume miroir
SELECT COUNT(*) FROM factures_mirror 
WHERE agency_id = '58d8d39f-7544-4e78-86f9-c182eacf29f5' 
  AND mirror_status = 'synced';

-- Étape 2 : Activer en fallback (DAX uniquement)
INSERT INTO data_source_flags (module_key, agency_id, source_mode, is_enabled, freshness_threshold_minutes)
VALUES ('factures', '58d8d39f-7544-4e78-86f9-c182eacf29f5', 'fallback', true, 480);

-- Rollback immédiat
DELETE FROM data_source_flags 
WHERE module_key = 'factures' 
  AND agency_id = '58d8d39f-7544-4e78-86f9-c182eacf29f5';
```

## Séquence recommandée

1. ✅ `users` — pilote STABLE (en cours)
2. ⏳ `projects` — après 48h–7j observation users
3. ⏳ `factures` — après stabilisation projects
4. ⏳ `interventions`, `devis`, `clients` — idem, un par un

## Couverture actuelle du miroir

Le miroir n'intercepte que le chemin **StatIA adapter** (`dataServiceAdapter.ts`).

Pour une couverture complète (80%+ du trafic), il faudra aussi intercepter dans :
- `dataService.ts` (chargement bulk)
- Hooks directs (`usePlanningData`, `useApogeeUsers`, etc.)

Voir `MIRROR_BYPASS_AUDIT.md` pour la liste exhaustive.

## Interdictions

- ❌ Ne pas activer avant feu vert dirigeant
- ❌ Ne pas activer plusieurs modules en même temps
- ❌ Ne pas activer sur une autre agence que DAX avant stabilisation complète
