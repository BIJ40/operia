# Audit des appels Apogée bypassing le miroir

> Généré le 2026-03-26 — Pilote actif : `users` DAX en fallback

## Principe

Le miroir n'intercepte les lectures que via `withMirrorResolution()` dans :
- `src/statia/adapters/dataServiceAdapter.ts` (chemin StatIA uniquement)

**Tous les appels directs à `apogeeProxy.*` dans le reste du code bypasse totalement le miroir.**

## Fichiers bypassing le miroir (appels directs apogeeProxy)

### 1. DataService principal (chargement bulk)
| Fichier | Endpoints appelés | Usage |
|---------|-------------------|-------|
| `src/apogee-connect/services/dataService.ts` | getUsers, getClients, getProjects, getInterventions, getFactures, getDevis, getInterventionsCreneaux | Chargement initial bulk de toutes les données agence |

### 2. Hooks React (lectures directes)
| Fichier | Endpoints appelés | Usage |
|---------|-------------------|-------|
| `src/shared/api/apogee/useApogeeUsers.ts` | getUsers | Hook planning / techniciens |
| `src/shared/api/apogee/usePlanningData.ts` | getInterventions, getProjects, getClients, getPlanningCreneaux | Planning hebdomadaire |
| `src/shared/api/apogee/usePlanningCreneaux.ts` | getInterventionsCreneaux | Créneaux planning |
| `src/apogee-connect/hooks/use-recouvrement-stats.ts` | getFactures | Stats recouvrement |

### 3. Moteurs de calcul (hors StatIA adapter)
| Fichier | Endpoints appelés | Usage |
|---------|-------------------|-------|
| `src/statia/engine/metricEngine.ts` | getInterventions, getProjects, getFactures, getDevis, getUsers, getClients | Moteur métriques V2 (bypass adapter) |
| `src/statia/components/StatiaBuilder/MetricPreview.ts` | Tous les endpoints | Preview builder de métriques |

### 4. Autres hooks spécifiques
| Fichier | Endpoints appelés | Usage |
|---------|-------------------|-------|
| `src/franchiseur/hooks/useAgencyUsers.ts` | _(Supabase direct, pas apogeeProxy)_ | Liste utilisateurs via profiles Supabase |

## Modules couverts par le miroir (via StatIA adapter)

| Module | Mode actuel | Agence |
|--------|-------------|--------|
| `users` | `fallback` | DAX uniquement |
| `projects` | `live` (défaut) | — |
| `factures` | `live` (défaut) | — |
| `interventions` | `live` (défaut) | — |
| `devis` | `live` (défaut) | — |
| `clients` | `live` (défaut) | — |
| `creneaux` | Toujours live | — (pas de table miroir) |

## Impact pour la suite

Pour que le miroir couvre **réellement** une lecture, il faut soit :
1. **Intercepter dans `dataService.ts`** (le point d'entrée le plus central)
2. Ou faire passer les hooks individuels par l'adapter StatIA

**Priorité recommandée** pour élargir la couverture :
1. `dataService.ts` → couvre 80% du trafic (bulk loading)
2. `usePlanningData.ts` → planning temps réel
3. `metricEngine.ts` → calculs métriques hors adapter

## Rollback

```sql
DELETE FROM data_source_flags
WHERE module_key = 'users'
  AND agency_id = '58d8d39f-7544-4e78-86f9-c182eacf29f5';
```
