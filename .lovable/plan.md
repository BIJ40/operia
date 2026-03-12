

# Phase 9d — Admin Taxonomy Cleanup

## Problem Diagnosis

The `module_registry` table contains **two parallel hierarchies** at root level (`parent_key IS NULL`):

**Hierarchical roots (new, type "module"):**
`pilotage`, `commercial`, `organisation`, `mediatheque`, `support`, `admin` — with proper children

**Legacy roots (old, type "section"/"screen"/"feature"):**
`agence`, `stats`, `rh`, `salaries`, `parc`, `prospection`, `realisations`, `documents`, `guides`, `aide`, `ticketing`, `outils`, `divers_apporteurs`, `divers_plannings`, `divers_reunions`, `divers_documents`, `admin_plateforme`, `reseau_franchiseur`

The taxonomy in `rightsTaxonomy.ts` only captures a subset via `moduleKeys`. Legacy roots like `stats`, `agence`, `rh`, `parc`, `salaries`, `outils`, `divers_*`, `realisations`, `documents`, `guides`, `aide` **fall through** to "Legacy / non classé" — making the admin view incoherent.

**Current `moduleKeys` coverage vs. what's missing:**

| Category | Currently matched | Missing legacy roots |
|---|---|---|
| Pilotage | `pilotage`, `pilotage.dashboard`, `pilotage.agence` | `stats`, `agence` |
| Commercial | `commercial`, `prospection`, `commercial.realisations` | `realisations` |
| Organisation | `organisation`, `organisation.*` | `rh`, `salaries`, `parc`, `outils`, `divers_apporteurs`, `divers_plannings`, `divers_reunions`, `divers_documents` |
| Documents | `mediatheque`, `mediatheque.documents` | `documents` |
| Support | `support`, `support.aide_en_ligne`, `support.guides`, `ticketing` | `guides`, `aide` |
| Admin | `admin`, `admin_plateforme`, `reseau_franchiseur` | *(none)* |

## Fix — Pure frontend taxonomy update

**No DB changes. No RPC changes. No key changes. No permissions engine changes.**

### File 1: `src/components/admin/views/rightsTaxonomy.ts`

**Expand `moduleKeys`** to capture all legacy roots under proper categories:

```typescript
export const RIGHTS_CATEGORIES: RightsCategory[] = [
  { id: 'pilotage', label: 'Pilotage', moduleKeys: [
    'pilotage', 'pilotage.dashboard', 'pilotage.agence',
    'stats', 'agence'
  ]},
  { id: 'commercial', label: 'Commercial', moduleKeys: [
    'commercial', 'prospection', 'commercial.realisations',
    'realisations'
  ]},
  { id: 'organisation', label: 'Organisation', moduleKeys: [
    'organisation', 'organisation.salaries', 'organisation.apporteurs',
    'organisation.plannings', 'organisation.reunions', 'organisation.parc',
    'rh', 'salaries', 'parc', 'outils', 
    'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'divers_documents'
  ]},
  { id: 'documents', label: 'Documents', moduleKeys: [
    'mediatheque', 'mediatheque.documents', 'documents'
  ]},
  { id: 'support', label: 'Support', moduleKeys: [
    'support', 'support.aide_en_ligne', 'support.guides',
    'ticketing', 'guides', 'aide'
  ]},
  { id: 'admin', label: 'Admin', moduleKeys: [
    'admin', 'admin_plateforme', 'reseau_franchiseur'
  ]},
];
```

**Expand label fallbacks** to normalize legacy labels to business labels:

```typescript
const NAVIGATION_LABEL_FALLBACKS: Record<string, string> = {
  // Existing
  'organisation.salaries': 'Salariés',
  'organisation.parc': 'Parc',
  prospection: 'Prospection',
  admin_plateforme: 'Admin plateforme',
  'pilotage.agence': 'Mon agence',
  'mediatheque.documents': 'Documents',
  'organisation.apporteurs': 'Apporteurs',
  'organisation.plannings': 'Plannings',
  'organisation.reunions': 'Réunions',
  'support.aide_en_ligne': 'Aide en ligne',
  reseau_franchiseur: 'Franchiseur',
  // New legacy roots
  agence: 'Mon agence',
  rh: 'Salariés',
  parc: 'Parc',
  realisations: 'Réalisations',
  divers_apporteurs: 'Apporteurs',
  divers_plannings: 'Plannings',
  divers_reunions: 'Réunions',
  divers_documents: 'Documents légaux',
  outils: 'Outils',
};

const LEGACY_LABELS: Partial<Record<string, string[]>> = {
  // Existing
  'organisation.salaries': ['Ressources humaines', 'RH'],
  'organisation.parc': ['Parc véhicules & EPI'],
  prospection: ['Commercial / Prospection'],
  admin_plateforme: ['Administration'],
  'pilotage.agence': ['Pilotage agence'],
  reseau_franchiseur: ['Réseau Franchiseur'],
  'support.aide_en_ligne': ['Aide'],
  // New
  agence: ['Pilotage agence'],
  rh: ['Ressources humaines'],
  parc: ['Parc véhicules & EPI'],
};
```

### File 2: `dev-reports/admin-taxonomy-cleanup-report.md`

Audit report with before/after, confirming no runtime key changes.

## Before / After

**Before:** 24 root-level nodes, ~9 legacy roots dumped into "Legacy / non classé". Admin sees duplicates (e.g., `pilotage` module + `stats` root + `agence` root all in different sections).

**After:** All roots classified into 6 business domains. Legacy roots appear alongside their hierarchical equivalents with corrected labels. "Legacy / non classé" section becomes empty (or contains only truly orphaned nodes). Zero functional key changes.

## Files modified
1. `src/components/admin/views/rightsTaxonomy.ts` — expanded moduleKeys + label fallbacks
2. `dev-reports/admin-taxonomy-cleanup-report.md` — audit report

## Files NOT modified
- RPC — untouched
- Database — untouched
- Permissions engine — untouched
- Runtime guards — untouched
- Module keys — untouched

