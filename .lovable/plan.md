

## Phase 4 — Vague 2 : Exécution

### Comptage vérifié : 35 remplacements, 7 fichiers

#### `rh` → `organisation.salaries` (15 remplacements)

| # | Fichier | Ligne(s) | Type |
|---|---|---|---|
| 1 | `OrganisationTabContent.tsx` | L25 | tab config |
| 2 | `UnifiedWorkspace.tsx` | L111 | module principal |
| 3-5 | `rh.routes.tsx` | L51, L70, L82 | ModuleGuard |
| 6-13 | `sitemapData.ts` | L456, L467, L478, L490, L502, L513, L524, L535 | sitemap |
| 14-15 | `dashboardTiles.ts` | L99, L123 | dashboard tiles |

#### `guides` → `support.guides` (20 remplacements)

| # | Fichier | Ligne(s) | Type |
|---|---|---|---|
| 1 | `AideTabContent.tsx` | L24 | tab config |
| 2-6 | `academy.routes.tsx` | L32, L36, L37, L41, L48 | ModuleGuard |
| 7-16 | `sitemapData.ts` | L116, L126, L136, L147, L157, L168, L179, L189, L220, L230 | sitemap |
| 17-19 | `dashboardTiles.ts` | L41, L52, L63 | dashboard tiles |
| 20 | `UnifiedWorkspace.tsx` | L113 | altModules |

### Livrable documentation

Création de `dev-reports/phase4-wave2-migration-report.md` documentant :
- 35 remplacements effectués
- 3 clés bloquées (agence, stats, divers_documents) — absence COMPAT_MAP
- Résidu Wave 1 dans `DiversTabContent.tsx` (4 guards legacy actifs au runtime, sans rupture fonctionnelle, correctif séparé recommandé)

### Garanties
- Backend inchangé, Supabase inchangé
- `user_modules`, `plan_tier_modules` inchangés
- `ticketing` intact, `COMPAT_MAP` conservé
- `rightsTaxonomy.ts`, `constants.ts`, `shared-constants.ts` non touchés (taxonomie DB / backend)

