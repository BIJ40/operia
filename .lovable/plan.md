

# Plan d'exécution : Verrouillage contrats V2 + Navigation

## Vue d'ensemble

6 livrables concrets, dans l'ordre : types TS, edge function stats, edge function dossiers, hook KPIs, navigation, placeholder rapport.

---

## 1. Créer `src/apporteur/types/apporteur-stats-v2.ts`

Types stricts pour le contrat `get-apporteur-stats` V2 :

- `ApporteurStatsV2Request` : `{ period, from?, to?, tz? }`
- `ApporteurStatsV2Response` : `{ period, kpis, trends, repartition_univers, collaboration, alertes, series_12m }`
- `kpis` : tous les champs du contrat y compris `coverage_rdv_delay` et `coverage_devis_validation_delay` (nombre 0-100)
- `factures_en_attente` et `factures_reglees` typées `{ count: number; amount: number }`
- `trends` : `Record<string, { delta: number; pct: number } | null>`
- `collaboration` : `{ score, level: 'bronze'|'silver'|'gold', details: { volume_score, regularite_score, transfo_score, delay_score } }`
- `alertes[]` : `{ type: AlerteType, severity: 'low'|'medium'|'high', count, amount?, risk_blockage, sample_refs }`
- `AlerteType` enum : `factures_retard_30j | devis_non_valide_15j | dossier_sans_rdv | dossier_sans_action_7j | rdv_annule | devis_refuse`
- `series_12m` : `{ ca_ht, dossiers, taux_transformation, avg_delays_days }` chaque avec `month` + valeurs

## 2. Créer `src/apporteur/types/apporteur-dossier-v2.ts`

- `DossierRowV2` : extends champs V1 root (rétro-compat) + `v2` object :
  - `universes: string[]`
  - `status: { dossier: DossierStatus; devis: DevisStatus; facture: FactureStatus }`
  - `amounts: { devis_ht, facture_ht, reste_du }`
  - `dates: { created_at, first_rdv_at, devis_sent_at, devis_validated_at, invoice_sent_at, invoice_paid_at, last_activity_at }`
  - `stepper: { status: StepperStep; completed: StepperStep[] }`
- Enums stricts : `DossierStatus`, `DevisStatus`, `FactureStatus`, `StepperStep` (6 étapes : created, rdv_planned, devis_sent, devis_validated, invoice_sent, invoice_paid)

## 3. Refonte `supabase/functions/get-apporteur-stats/index.ts`

Refonte complète (~400 lignes). Un seul fetch par endpoint (projects, factures, devis, interventions en parallèle). Calculs depuis les mêmes arrays :

**Architecture interne** :
- Config targets en constants en haut : `TARGET_VOLUME = 20`, `TARGET_DELAY = 10`, `REGULARITY_FACTOR = 5`
- `getDateRange()` enrichi : accepte `tz` param, retourne aussi `prevStart`/`prevEnd` pour N-1 (même durée décalée)
- Un seul `Promise.all` pour 4 endpoints Apogée + 1 query Supabase (demands)
- Filtrer projects par commanditaireId une seule fois, créer `projectIds` Set
- Helper `filterByPeriod(items, start, end)` pour éviter duplication

**Calculs (tous sur période courante + période N-1 en un seul pass)** :

1. **KPIs de base** : itérer projects/factures/devis filtrés par période, compter dossiers_en_cours, devis_envoyes/valides/refuses, factures en attente/réglées, ca_genere
2. **Délais** : pour chaque project, chercher interventions triées par date → `first_rdv_at`. Delta `created_at → first_rdv_at` = `avg_rdv_delay_days`. Delta `devis_sent_at → devis_validated_at` = `avg_devis_validation_delay_days`. Compter coverage (% dossiers avec donnée dispo)
3. **Panier moyen** : `ca_facture_ht / nb_factures` sur période
4. **Taux transformation** : `devis_valides / devis_total * 100`
5. **Trends** : mêmes calculs sur `prevStart..prevEnd`, delta = current - prev, pct = delta/prev*100
6. **Répartition univers** : extraire `project.data.universes` pour chaque project filtré, agréger count par code, calculer %
7. **Score collaboration** : `transfo_norm*0.4 + volume_norm*0.2 + regularite_norm*0.2 + delay_norm*0.2`, clamp 0-100, level par seuils
8. **Alertes** : scanner factures >30j non réglées, devis >15j non validés, dossiers sans intervention, dossiers sans action récente. `risk_blockage` par barème additif (facture>30j=+40, >60j=+60, devis>15j=+25, sans action 7j=+20, rdv annulé=+15, devis refusé=+10), clamp 0-100
9. **Series 12m** : boucle 12 mois en arrière depuis `to`, pour chaque mois filtrer et calculer ca_ht, count dossiers, taux_transfo, avg delays

**Retourne** `{ success: true, data: ApporteurStatsV2Response }`

## 4. Enrichir `supabase/functions/get-apporteur-dossiers/index.ts`

Modifications ciblées (pas de refonte, ajout de champs) :

- Dans la boucle `for (const p of projects)` (ligne ~340), après le calcul V1 existant, ajouter un objet `v2` à chaque dossier :
  - `universes` : `(p.data?.universes || []).map(u => typeof u === 'string' ? u : u.code || u.label || String(u))`
  - `status` : triple statut `{ dossier, devis, facture }` déduit des mêmes données déjà calculées
  - `amounts` : `{ devis_ht, facture_ht, reste_du }` (déjà calculés)
  - `dates` : mapper les 6 jalons existants vers le format V2
  - `stepper` : calculer `completed[]` à partir des dates non-null, `status` = dernière étape completed

- Les champs V1 root restent intacts (rétro-compat totale).

## 5. Créer `src/apporteur/hooks/useApporteurKpis.ts`

- React Query avec key `['apporteur-kpis', period, from, to]`
- Appelle `post<{success, data: ApporteurStatsV2Response}>('/get-apporteur-stats', { period, from, to })`
- `staleTime: 5 * 60 * 1000`, `gcTime: 15 * 60 * 1000`, `retry: 1`
- Export helper `formatTrend(trend: {delta, pct} | null): string` — retourne `"+8.4%"` ou `"-9.3%"` ou `"–"` si null/0

## 6. Navigation : refonte onglets

**`ApporteurTabsContext.tsx`** :
- Supprimer module `divers`
- Renommer : `accueil` → `{ id: 'accueil', label: 'Tableau de bord' }`, `demandes` → `{ id: 'demandes', label: 'Nouvelle demande' }`
- Ajouter : `{ id: 'rapport', label: 'Rapport', icon: BarChart3, closable: false }` entre `demandes` et `profil`
- Icônes : Home → LayoutDashboard, FileText → FilePlus, ajouter BarChart3

**`ApporteurTabsContent.tsx`** :
- Supprimer import/mapping `DiversContent`
- Ajouter `const RapportContent = lazy(() => import('../tabs/RapportTabContent'))`
- Ajouter mapping `rapport: RapportContent`

**`ApporteurTabsBar.tsx`** :
- Supprimer accent `divers`
- Ajouter accent `rapport: 'orange'`

**Créer `src/apporteur/components/tabs/RapportTabContent.tsx`** : placeholder avec icône BarChart3, titre "Rapport d'activité", texte "Bientôt disponible"

**Supprimer `src/apporteur/components/tabs/DiversTabContent.tsx`**

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/apporteur/types/apporteur-stats-v2.ts` | Créer |
| `src/apporteur/types/apporteur-dossier-v2.ts` | Créer |
| `supabase/functions/get-apporteur-stats/index.ts` | Refonte |
| `supabase/functions/get-apporteur-dossiers/index.ts` | Enrichir |
| `src/apporteur/hooks/useApporteurKpis.ts` | Créer |
| `src/apporteur/hooks/useApporteurDossiers.ts` | Enrichir type import |
| `src/apporteur/components/browser-tabs/ApporteurTabsContext.tsx` | Modifier |
| `src/apporteur/components/browser-tabs/ApporteurTabsContent.tsx` | Modifier |
| `src/apporteur/components/browser-tabs/ApporteurTabsBar.tsx` | Modifier |
| `src/apporteur/components/tabs/RapportTabContent.tsx` | Créer |
| `src/apporteur/components/tabs/DiversTabContent.tsx` | Supprimer |

Aucune migration DB.

