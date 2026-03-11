

## Phase 4 — Vague 1 Migration

Migration ciblée de 6 clés legacy vers leurs nouvelles clés fonctionnelles. 22 remplacements dans 7 fichiers. Aucun changement backend, aucun impact ticketing, COMPAT_MAP conservé.

### Modifications

**1. `src/components/unified/tabs/OrganisationTabContent.tsx`** — 4 remplacements
- L26: `'divers_apporteurs'` → `'organisation.apporteurs'`
- L27: `'divers_plannings'` → `'organisation.plannings'`
- L28: `'divers_reunions'` → `'organisation.reunions'`
- L29: `'parc'` → `'organisation.parc'`

**2. `src/components/unified/tabs/DiversTabContent.tsx`** — 4 remplacements
- L65: `'divers_apporteurs'` → `'organisation.apporteurs'`
- L67: `'parc'` → `'organisation.parc'`
- L242: `'divers_reunions'` → `'organisation.reunions'`
- L243: `'divers_plannings'` → `'organisation.plannings'`

**3. `src/pages/UnifiedWorkspace.tsx`** — 6 remplacements
- L110: `'realisations'` → `'commercial.realisations'`
- L111: `'parc'` → `'organisation.parc'`, `'divers_apporteurs'` → `'organisation.apporteurs'`, `'divers_plannings'` → `'organisation.plannings'`, `'divers_reunions'` → `'organisation.reunions'`
- L113: `'aide'` → `'support.aide_en_ligne'`

**4. `src/routes/realisations.routes.tsx`** — 3 remplacements
- L22, L34, L46: `moduleKey="realisations"` → `moduleKey="commercial.realisations"`

**5. `src/components/unified/tabs/CommercialTabContent.tsx`** — 1 remplacement
- L33: `realisations: 'realisations'` → `realisations: 'commercial.realisations'`

**6. `src/components/unified/tabs/AideTabContent.tsx`** — 1 remplacement
- L23: `requiresModule: 'aide'` → `requiresModule: 'support.aide_en_ligne'`

**7. `src/config/sitemapData.ts`** — 3 remplacements
- L558, L568, L578: `moduleKey: 'aide'` → `moduleKey: 'support.aide_en_ligne'`

### Livrable documentation

Création de `dev-reports/phase4-wave1-migration-report.md` avec les 8 sections requises (résumé exécutif, mappings traités, fichiers modifiés, fichiers analysés non modifiés, cas non migrés, vérification sécurité, risques résiduels, recommandation suite).

### Garanties
- Backend inchangé
- `user_modules` / `plan_tier_modules` inchangés
- `ticketing` intact (aucune occurrence touchée)
- COMPAT_MAP conservé actif → rétrocompatibilité assurée
- `rh`, `agence`, `stats`, `guides`, `admin_plateforme`, `reseau_franchiseur` non touchés

