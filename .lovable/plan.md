

# Phase 9f — Fix FRANCHISEUR_ROLES + label Réseau→Franchiseur

## Changes

### `src/lib/navigationStructure.ts` — 2 edits

**Line 49** — Fix `FRANCHISEUR_ROLES`: remove `franchisee_admin`, add `franchisor_user` + `franchisor_admin`:
```typescript
export const FRANCHISEUR_ROLES: GlobalRole[] = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'];
```

**Line 116** — Fix label:
```typescript
label: 'Franchiseur',
```

### `dev-reports/phase9f-franchiseur-visibility-fix-report.md` — create

Audit report covering: bug, root cause, fix, verification matrix (N2 blocked, N3+ visible), no side effects.

## Verification

| Role | Level | Sees Franchiseur? |
|---|---|---|
| `franchisee_admin` | N2 | **NO** (removed from array) |
| `franchisor_user` | N3 | YES |
| `franchisor_admin` | N4 | YES |
| `platform_admin` | N5 | YES |
| `superadmin` | N6 | YES |

## Not touched
- RPC, database, permissions engine, other domains, runtime guards

