# Phase 4 — Vague 3 Migration Report

Date : 2026-03-11

## 1. Résumé exécutif

| Métrique | Valeur |
|---|---|
| Fichiers analysés | ~15 |
| Fichiers modifiés | 9 |
| Remplacements effectués | 46 (43 guards + 3 types) |
| Périmètre | `agence`, `stats`, `divers_documents` uniquement |

## 2. Mappings traités

### `agence` → `pilotage.agence`

| Métrique | Valeur |
|---|---|
| Occurrences trouvées | 38 |
| Migrées | 38 |
| Non migrées | 0 |

### `stats` → `pilotage.dashboard`

| Métrique | Valeur |
|---|---|
| Occurrences trouvées (guards) | 3 |
| Migrées | 3 |
| Non migrées | 0 |
| Faux positifs écartés | Nombreux (variables stats, datasets, analytics, MODULE_OPTIONS.stats, MODULE_DEFINITIONS key:'stats') — tous non-guards |

### `divers_documents` → `mediatheque.documents`

| Métrique | Valeur |
|---|---|
| Occurrences trouvées (guards) | 2 |
| Migrées | 2 |
| Non migrées | 0 |

## 3. Fichiers modifiés

| # | Fichier | Type d'impact | Résumé |
|---|---|---|---|
| 1 | `src/routes/pilotage.routes.tsx` | route protection | 10× `moduleKey="agence"` → `moduleKey="pilotage.agence"` |
| 2 | `src/config/sitemapData.ts` | sitemap | 12× `moduleKey: 'agence'` → `'pilotage.agence'`, 1× `moduleKey: 'stats'` → `'pilotage.dashboard'` |
| 3 | `src/components/unified/tabs/PilotageTabContent.tsx` | tab visibility | 1× `requiresModule: 'stats'` → `'pilotage.dashboard'`, 4× `requiresModule: 'agence'` → `'pilotage.agence'` |
| 4 | `src/config/dashboardTiles.ts` | dashboard tile | 3× `requiresModule: 'agence'` → `'pilotage.agence'` |
| 5 | `src/pages/UnifiedWorkspace.tsx` | tab visibility | 1× `module: 'stats'` → `'pilotage.dashboard'`, 3× `altModules 'agence'` → `'pilotage.agence'`, 1× `module: 'divers_documents'` → `'mediatheque.documents'` |
| 6 | `src/components/unified/tabs/OrganisationTabContent.tsx` | tab visibility | 1× `requiresModule: 'agence'` → `'pilotage.agence'` |
| 7 | `src/components/unified/tabs/DiversTabContent.tsx` | tab visibility | 4× `requiresModule: 'agence'` → `'pilotage.agence'`, 1× `requiresModule: 'divers_documents'` → `'mediatheque.documents'` |
| 8 | `src/contexts/AuthContext.tsx` | helper/config | 1× `hasModuleGuard('agence')` → `hasModuleGuard('pilotage.agence')` |
| 9 | `src/types/modules.ts` | type system | Ajout de `pilotage.dashboard`, `pilotage.agence`, `mediatheque.documents` au MODULES const (nécessaire pour que ModuleKey accepte les nouvelles clés) |

## 4. Fichiers analysés mais non modifiés

| Fichier | Raison |
|---|---|
| `src/permissions/compatMap.ts` | Exclu (contient les legacy keys comme cibles de résolution) |
| `src/permissions/rightsTaxonomy.ts` | Exclu (taxonomie DB) |
| `src/permissions/constants.ts` | Exclu |
| `src/permissions/shared-constants.ts` | Exclu |
| `src/permissions/permissionsEngine.ts` | Exclu (backend) |
| `src/types/modules.ts` (MODULE_DEFINITIONS) | Les `key: 'agence'` et `key: 'stats'` dans MODULE_DEFINITIONS sont des identifiants métier DB, pas des guards — non migrés |
| `src/types/modules.ts` (MODULE_OPTIONS) | Les entrées `agence`, `stats`, `divers_documents` sont des clés d'options DB — non migrés |
| `src/devtools/moduleCompatTest.ts` | Contient les legacy keys comme test fixtures — correct tel quel |

## 5. Cas non migrés / à arbitrer

Aucun cas ambigu restant. Tous les guards ont été clairement identifiés et migrés.

Les occurrences `stats` non migrées sont :
- `MODULE_OPTIONS.stats` — configuration DB
- `MODULE_DEFINITIONS[].key: 'stats'` — identifiant DB
- Variables locales `stats` — données métier
- `reseau_franchiseur.stats`, `unified_search.stats` — options d'autres modules

## 6. Vérification de sécurité

| Élément | Statut |
|---|---|
| Backend | ✅ Inchangé |
| Supabase | ✅ Inchangé |
| `user_modules` | ✅ Inchangé |
| `plan_tier_modules` | ✅ Inchangé |
| Ticketing | ✅ Inchangé |
| `COMPAT_MAP` | ✅ Inchangé |
| `rightsTaxonomy.ts` | ✅ Inchangé |
| `constants.ts` / `shared-constants.ts` | ✅ Inchangés |

## 7. Risques résiduels

- Les nouvelles clés (`pilotage.agence`, `pilotage.dashboard`, `mediatheque.documents`) résolvent via COMPAT_MAP vers les legacy keys. Si COMPAT_MAP est supprimé avant migration DB, les permissions seront perdues.
- `types/modules.ts` a été modifié pour ajouter les clés au type union `ModuleKey` — nécessaire pour la compilation TypeScript.

## 8. Recommandation pour la suite

Prochaine étape : Vague 4 — Migration des clés `prospection`, `rh`, `parc`, `divers_apporteurs`, `divers_plannings`, `divers_reunions` vers leurs équivalents hiérarchiques (`commercial.*`, `organisation.*`). Cela nécessite d'abord l'ajout des entrées COMPAT_MAP correspondantes (Wave 3.5).
