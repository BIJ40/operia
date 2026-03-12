

# Phase 9c — User Sheet Navigation Alignment

## Root Cause of 3 Failed Attempts

All previous attempts patched the same broken concept: iterating `MODULE_DEFINITIONS` (a flat list of permission module keys) and presenting it as "what the user can access." But `MODULE_DEFINITIONS` is a **permissions registry**, not a **navigation map**. It doesn't know about:
- Domain groupings (Pilotage, Commercial, Organisation...)
- Sub-tab labels as they appear in the UI ("Suivi client" not "dashboard option of prospection")
- Which module options map to which visible sub-tabs
- Which entries share a parent module with different options

The fundamental error: conflating "permission module" with "navigation entry."

## Architecture Decision

**Source of truth for Vue A**: The actual tab configurations from the workspace tab content components. These define exactly what the user sees.

**Two views, cleanly separated:**

```text
┌──────────────────────────────────────────────────────────┐
│  Vue A — Navigation / Accès visibles                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ Pilotage     │ │ Commercial  │ │ Organisation│  ...    │
│  │ ✅ Stats     │ │ ✅ Suivi    │ │ ✅ Salariés  │         │
│  │ ✅ Perf      │ │ ✅ Compar.  │ │ ⛔ Parc     │         │
│  │ ⛔ Devis acc.│ │ ⛔ Veille   │ │ ✅ Plannings│         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
├──────────────────────────────────────────────────────────┤
│  [▸ Afficher les droits effectifs techniques]             │
│  (collapsed by default — current flat MODULE_DEFINITIONS  │
│   view preserved here)                                    │
└──────────────────────────────────────────────────────────┘
```

## Navigation Structure

Extracted from the actual runtime tab components:

| Domain | Sub-entry (UI label) | Guard |
|--------|---------------------|-------|
| **Pilotage** | Statistiques | `hasModule('pilotage.dashboard')` |
| | Performance | `hasModule('pilotage.agence')` |
| | Actions à mener | `hasModule('pilotage.agence')` |
| | Devis acceptés | `hasModule('pilotage.agence')` |
| | Incohérences | `hasModule('pilotage.agence')` |
| **Commercial** | Suivi client | `hasModuleOption('prospection', 'dashboard')` |
| | Comparateur | `hasModuleOption('prospection', 'comparateur')` |
| | Veille | `hasModuleOption('prospection', 'veille')` |
| | Prospects | `hasModuleOption('prospection', 'prospects')` |
| | Réalisations | `hasModule('commercial.realisations')` |
| **Organisation** | Salariés | `hasModule('organisation.salaries')` |
| | Apporteurs | `hasModule('organisation.apporteurs')` |
| | Plannings | `hasModule('organisation.plannings')` |
| | Réunions | `hasModule('organisation.reunions')` |
| | Parc | `hasModule('organisation.parc')` |
| | Documents légaux | `hasModule('pilotage.agence')` |
| **Documents** | Médiathèque | `hasModule('mediatheque.documents')` |
| **Support** | Aide en ligne | `hasModule('support.aide_en_ligne')` |
| | Guides | `hasModule('support.guides')` |
| | FAQ | *(always visible)* |
| | Ticketing | `hasModule('ticketing')` |

Admin and Franchiseur domains are only shown for N5+ and N3+ respectively (role-gated, not module-gated).

## Files to Create/Modify

### 1. NEW: `src/lib/navigationStructure.ts`
Canonical navigation structure config. Each domain maps to the real UI tabs with their labels and module guards. This is the single source of truth for "what appears in navigation."

### 2. NEW: `src/components/admin/users/user-profile-sheet/NavigationAccessView.tsx`
Vue A component. Takes `effectiveModules` (from RPC) and the user's `globalRole`. For each domain:
- Show domain header with icon
- List sub-entries with checkmark (accessible) or lock icon (not accessible, shown greyed)
- Domain-level accessibility = at least one sub-entry accessible

### 3. MODIFY: `src/components/admin/users/UserProfileSheet.tsx`
- Replace the flat `MODULE_DEFINITIONS` iteration (lines 359-394) with:
  - Vue A: `<NavigationAccessView>` (always visible)
  - Vue B: Current flat view wrapped in a `<Collapsible>` with button "Afficher les droits effectifs techniques"
- Keep the existing RPC query (lines 87-110) unchanged — it's correct

### 4. NEW: `dev-reports/phase9c-user-sheet-navigation-alignment-report.md`

## What Does NOT Change
- RPC — no modification
- Database — no modification
- Permissions engine — no modification
- `COMPAT_MAP` — not reintroduced
- `userModulesUtils.ts` — Phase 9 dual-key mapping stays
- `InlineModuleBadges.tsx` — stays as is (badge view for user list)
- `UserAccessSimple.tsx` — stays as is (compact view)
- No refactor outside the user profile sheet

## How Module Resolution Works for Vue A

The `UserProfileSheet` already calls the RPC `get_user_effective_modules` and stores the result in `effectiveModules`. The `NavigationAccessView` receives this and for each navigation entry, checks:

```typescript
// For module-only guards:
const accessible = effectiveModules[moduleKey]?.enabled === true;

// For module+option guards:
const accessible = effectiveModules[moduleKey]?.enabled === true 
  && effectiveModules[moduleKey]?.options?.[optionKey] === true;

// For N5+ bypass (admin/franchiseur domains):
const isAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
```

No new queries. No new hooks. Pure presentation logic.

## Expected Before/After

**Before** (flat list):
```
Accès réels (15 modules)
  Mon agence ✅ [Indicateurs] [Actions] [Diffusion]
  Stats ✅ [Stats Hub] [Exports]
  Salariés ✅ [Gestionnaire] [Admin RH]
  Commercial ✅ [Suivi client] [Comparateur] [Veille] [Prospects]
  Réalisations ✅
  Documents ✅ [Consulter] [Gérer]
  Guides ✅ [Apogée] [Apporteurs] [FAQ]
  Aide ✅ [Utilisateur] [Agent]
  ...
```

**After** (navigation-structured):
```
Navigation utilisateur

  Pilotage
    ✅ Statistiques
    ✅ Performance
    ✅ Actions à mener
    ✅ Devis acceptés
    ✅ Incohérences

  Commercial
    ✅ Suivi client
    ✅ Comparateur
    ✅ Veille
    ✅ Prospects
    ⛔ Réalisations

  Organisation
    ✅ Salariés
    ⛔ Apporteurs
    ✅ Plannings
    ⛔ Réunions
    ⛔ Parc
    ✅ Documents légaux

  Documents
    ✅ Médiathèque

  Support
    ✅ Aide en ligne
    ✅ Guides
    ✅ FAQ
    ⛔ Ticketing

  [▸ Afficher les droits effectifs techniques]
```

