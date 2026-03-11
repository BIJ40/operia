

## Phase 4 — Vague 3 : Confirmed and Ready

Both points verified:

1. **AuthContext.tsx L409**: `hasModuleGuard('agence' as ModuleKey)` — pure permission guard inside `hasAccessToScope()`. Not business logic. Safe to migrate to `'pilotage.agence'`.

2. **UnifiedWorkspace.tsx L109**: `requiresOption: { module: 'stats' }` — tab visibility permission guard. Safe to migrate to `'pilotage.dashboard'`. Same line's `altModules: ['agence']` is also a permission guard → `'pilotage.agence'`.

The plan is confirmed identical to the previously approved version: **43 replacements across 8 files**, no ambiguities remaining.

Ready to execute on your go.

