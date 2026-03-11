

# Phase 5 — Execution Plan

## Bloc A — Front-end fixes (2 files)

### 1. `src/apogee-connect/pages/IndicateursLayout.tsx`
- Add `import { ModuleKey } from '@/types/modules';`
- Line 28: `hasModule('agence')` → `hasModule('pilotage.agence' as ModuleKey)`

### 2. `src/config/dashboardTiles.ts`
- Line 176: `requiresModule: 'agence'` → `requiresModule: 'pilotage.agence'`

## Bloc B — SQL migration

Insert 3 missing keys into `module_registry`:
```sql
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('pilotage.agence','Agence','pilotage','section',50,true,'STARTER',2),
  ('pilotage.dashboard','Dashboard','pilotage','section',10,true,'STARTER',2),
  ('mediatheque.documents','Documents','mediatheque','section',10,true,'STARTER',0)
ON CONFLICT (key) DO NOTHING;
```

## Bloc C — Migration additive `plan_tier_modules`

Per approved plan, duplicate 10 legacy keys as new hierarchical keys (additive, no deletions):
```sql
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
SELECT tier_key,
       CASE module_key
         WHEN 'agence' THEN 'pilotage.agence'
         WHEN 'stats' THEN 'pilotage.dashboard'
         WHEN 'rh' THEN 'organisation.salaries'
         WHEN 'parc' THEN 'organisation.parc'
         WHEN 'divers_apporteurs' THEN 'organisation.apporteurs'
         WHEN 'divers_plannings' THEN 'organisation.plannings'
         WHEN 'divers_reunions' THEN 'organisation.reunions'
         WHEN 'divers_documents' THEN 'mediatheque.documents'
         WHEN 'aide' THEN 'support.aide_en_ligne'
         WHEN 'guides' THEN 'support.guides'
       END,
       enabled,
       options_override
FROM plan_tier_modules
WHERE module_key IN ('agence','stats','rh','parc','divers_apporteurs','divers_plannings','divers_reunions','divers_documents','aide','guides')
ON CONFLICT (tier_key, module_key) DO NOTHING;
```

## Bloc D — Report

Create `dev-reports/phase5-legacy-data-migration-report.md` documenting all changes.

## Scope guarantees
- `COMPAT_MAP` untouched
- RPC unchanged
- No legacy data deleted
- `ticketing`, `prospection` out of scope

