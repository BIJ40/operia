

## Plan: MAJ Changelog + page scrollable

### 1. Fix scroll — `MinimalLayout.tsx`

Line 111: `overflow-hidden` bloque le scroll du contenu. Changer en `overflow-auto` sur le `<main>`.

### 2. MAJ Changelog — `src/config/changelog.ts`

Ajouter une nouvelle version **V0.9.6** en tête du tableau `CHANGELOG` :

- **Title**: "Phase 4 — Audit & Plan de migration Permissions"
- **Date**: 2026-03-11
- Entrées :
  - `audit` : Inventaire complet des 165 guards de permissions (phase4-guards-inventory)
  - `audit` : Plan de migration 4 vagues avec classement par risque (phase4-migration-plan)
  - `improvement` : Identification 15 clés legacy et mapping vers clés hiérarchiques Phase 4
  - `improvement` : Premier lot exécutable identifié (17 occurrences, 6 fichiers, Vague 1)

### 3. MAJ Version — `src/config/version.ts`

- `APP_VERSION` → `'0.9.6'`
- `APP_CODENAME` → `'Phase 4 — Audit & Plan de migration Permissions'`

