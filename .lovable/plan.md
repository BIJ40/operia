

# Module PROSPECTION APPORTEURS - Plan d'implementation

## Vue d'ensemble

Nouveau module complet "Prospection" integre dans l'espace de travail unifie, accessible uniquement aux utilisateurs auxquels il est attribue via les permissions individuelles (user_modules). Ce module se base sur les donnees Apogee synchronisees (tables RAW) et suit le pattern "Compute Once, Read Many" avec des metriques pre-calculees.

---

## Phase 1 : Fondations (permissions + tables)

### 1.1 Nouveau module dans le systeme de permissions

Ajouter le module `prospection` dans :
- `src/types/modules.ts` : nouveau `ModuleKey` avec sous-options (`dashboard`, `comparateur`, `veille`, `meetings`)
- `src/types/modules.ts` > `MODULE_DEFINITIONS` : definition complete (label "Prospection", icon "Target", minRole N2, defaultForRoles vide = personne par defaut, attribue manuellement)
- `src/types/modules.ts` > `EnabledModules` : ajout `prospection`
- `plan_tier_modules` : inserer le module avec `enabled = false` pour tous les tiers (activation uniquement par override utilisateur)

### 1.2 Tables de metriques (migrations SQL)

**Table `metrics_apporteur_daily`** :
```text
agence_id (uuid, FK apogee_agencies)
apporteur_id (text) -- commanditaireId Apogee
date (date)
dossiers_received_count (int default 0)
dossiers_closed_count (int default 0)
devis_total_count (int default 0)
devis_signed_count (int default 0)
factures_count (int default 0)
ca_ht (numeric default 0)
panier_moyen (numeric default 0)
taux_transfo_devis (numeric default 0)
dossiers_sans_devis_count (int default 0)
devis_non_signes_count (int default 0)
delai_dossier_vers_devis_avg_days (numeric)
delai_devis_vers_signature_avg_days (numeric)
delai_signature_vers_facture_avg_days (numeric)
PK (agence_id, apporteur_id, date)
```

**Table `metrics_apporteur_univers_daily`** :
```text
agence_id (uuid)
apporteur_id (text)
date (date)
univers_code (text)
dossiers_count (int default 0)
devis_count (int default 0)
factures_count (int default 0)
ca_ht (numeric default 0)
PK (agence_id, apporteur_id, date, univers_code)
```

**Table `prospecting_followups`** :
```text
id (uuid PK)
agency_id (uuid, FK)
apporteur_id (text)
apporteur_name (text) -- cache pour affichage rapide
owner_user_id (uuid, FK profiles)
status (text check: 'todo','in_progress','done','dormant')
next_action (text)
next_action_at (timestamptz)
last_meeting_at (timestamptz)
notes (text)
created_at, updated_at
```

**Table `prospecting_meetings`** :
```text
id (uuid PK)
agency_id (uuid, FK)
apporteur_id (text)
apporteur_name (text)
owner_user_id (uuid, FK profiles)
meeting_at (timestamptz)
meeting_type (text check: 'call','onsite','visio')
summary (text)
outcomes (text)
followup_id (uuid, FK prospecting_followups, nullable)
created_at
```

### 1.3 RLS Policies

Toutes les tables filtrées par `agency_id` :
- SELECT : utilisateur authentifie dont `profiles.agency_id` = row `agency_id`, ou N5+
- INSERT/UPDATE sur followups/meetings : `owner_user_id = auth.uid()` ou N3+
- Les tables metrics sont en lecture seule cote client (ecriture via Edge Function service_role)
- Verification module `prospection` via `has_module_v2(auth.uid(), 'prospection')`

---

## Phase 2 : Edge Function de calcul

### 2.1 `compute-apporteur-metrics`

Edge Function qui :
1. Recoit `{ agency_id, date_from?, date_to? }` (defaut : 400 derniers jours)
2. Lit les donnees RAW Apogee (projects, devis, factures) via service_role
3. Pour chaque jour et chaque apporteur (commanditaireId) :
   - Compte dossiers recus / clotures
   - Compte devis totaux / signes
   - Compte factures, calcule CA HT
   - Calcule panier moyen, taux transfo, delais moyens
   - Ventile par univers
4. Upsert dans `metrics_apporteur_daily` et `metrics_apporteur_univers_daily`
5. Safe divide partout (division par zero = null)

Declenchement :
- Cron nocturne (pg_cron + pg_net)
- Bouton "Recalculer" dans l'UI (appel direct)

---

## Phase 3 : Hooks React Query

Tous les hooks dans `src/prospection/hooks/` :

| Hook | Source | Usage |
|------|--------|-------|
| `useApporteurListMetrics` | metrics_apporteur_daily agrege | Liste des apporteurs avec KPIs |
| `useApporteurDashboard` | metrics_apporteur_daily + univers | Fiche individuelle |
| `useApporteurComparison` | metrics_apporteur_daily multi-IDs | Comparateur |
| `useApporteurAlerts` | metrics_apporteur_daily deltas | Veille / alertes |
| `useProspectingFollowups` | prospecting_followups | Suivi commercial |
| `useProspectingMeetings` | prospecting_meetings | Timeline RDV |

Les hooks aggregent cote client les metriques daily sur la periode demandee (SUM/AVG) -- les donnees pre-calculees par jour restent legeres.

---

## Phase 4 : UI / Navigation

### 4.1 Integration workspace

Le module `prospection` s'ajoute comme un **nouvel onglet principal** dans `UnifiedWorkspace` (au meme niveau que Agence, Stats, RH, Outils...), visible uniquement si l'utilisateur a le module `prospection` active dans ses permissions.

### 4.2 Structure des ecrans (sous-onglets Pill)

**Onglet "Prospection"** avec 4 sous-onglets :

1. **Liste** (defaut) -- `ApporteurListPage`
   - Tableau : nom apporteur, ville, dossiers 30j, CA 30j, taux transfo 90j, tendance
   - Filtres : periode, univers, statut suivi
   - Badge "Alerte baisse" si drop > 20%
   - Clic = ouvre fiche apporteur

2. **Fiche** (dynamique, via selection) -- `ApporteurDashboardPage`
   - Cards KPIs (dossiers, devis, factures, CA, panier, taux transfo, delais)
   - Funnel visuel : dossiers -> devis -> signes -> factures
   - Mix univers (bar chart par univers)
   - Courbes tendance (CA + dossiers + taux sur 12 mois)
   - Bloc "Opportunites" (regles deterministes)
   - Panneau suivi commercial (notes, meetings, next action)

3. **Comparateur** -- `ApporteurComparisonPage`
   - Selecteur 2-5 apporteurs
   - Tableau KPI comparatif avec delta vs leader
   - Barres comparatives
   - Argumentaire commercial auto-genere

4. **Veille** -- `ApporteurAlertsPage`
   - Liste des alertes (baisse CA > 20%, baisse dossiers, hausse devis non signes, delais qui explosent)
   - Assigner alerte a un commercial
   - Creer une next_action

### 4.3 Export PDF

Composant `ExportPitchButton` qui genere via jsPDF (deja installe) :
- Page 1 : synthese KPIs + points forts + axes progression
- Page 2 : mix univers + tendances + opportunites

---

## Phase 5 : Moteur d'insights (deterministe)

Regles codees dans `src/prospection/engine/insights.ts` :

| Regle | Condition | Recommandation |
|-------|-----------|----------------|
| Univers manquant | ca_ht(univers) = 0 sur 6 mois | "Opportunite univers X" |
| Devis non signes | ratio > 45% et total >= 10 | "Probleme conversion" |
| Panier faible | < mediane * 0.8 | "Monter en gamme" |
| Tendance negative | CA 90j < precedent * 0.85 | "Alerte baisse" |
| Delai explose | delai > mediane * 1.5 | "Process a revoir" |

---

## Arborescence fichiers

```text
src/prospection/
  hooks/
    useApporteurListMetrics.ts
    useApporteurDashboard.ts
    useApporteurComparison.ts
    useApporteurAlerts.ts
    useProspectingFollowups.ts
    useProspectingMeetings.ts
  engine/
    insights.ts           -- regles deterministes
    aggregators.ts        -- fonctions d'agregation daily -> range
  pages/
    ApporteurListPage.tsx
    ApporteurDashboardPage.tsx
    ApporteurComparisonPage.tsx
    ApporteurAlertsPage.tsx
  components/
    ApporteurKPICards.tsx
    ApporteurFunnel.tsx
    ApporteurUniversChart.tsx
    ApporteurTrendCharts.tsx
    InsightsPanel.tsx
    FollowupPanel.tsx
    MeetingTimeline.tsx
    MeetingCreateDialog.tsx
    ExportPitchButton.tsx
    AlertCard.tsx
    ComparisonTable.tsx
  index.ts

supabase/functions/compute-apporteur-metrics/index.ts
```

---

## Section technique detaillee

### Modifications fichiers existants

| Fichier | Modification |
|---------|-------------|
| `src/types/modules.ts` | Ajout `prospection` dans MODULES, MODULE_OPTIONS, MODULE_DEFINITIONS, EnabledModules, PLAN_VISIBLE_MODULES, MODULE_SHORT_LABELS |
| `src/types/accessControl.ts` | Ajout `prospection` dans AGENCY_REQUIRED_MODULES |
| `src/permissions/index.ts` | Ajout label "Prospection" dans MODULE_LABELS |
| `src/components/unified/UnifiedWorkspace.tsx` | Ajout onglet "Prospection" conditionne par hasModule('prospection') |
| `src/config/sitemapData.ts` | Ajout route prospection avec moduleGuard |
| `plan_tier_modules` (DB) | INSERT module 'prospection' enabled=false pour STARTER et PRO |
| `supabase/config.toml` | Ajout verify_jwt=false pour compute-apporteur-metrics |

### Ordre d'implementation

1. Migrations SQL (tables + index + RLS)
2. Module permissions (types + DB insert)
3. Edge Function compute-apporteur-metrics
4. Hooks React Query
5. Moteur insights
6. Composants UI (liste -> fiche -> comparateur -> veille)
7. Integration workspace + navigation
8. Export PDF
9. Cron nocturne

