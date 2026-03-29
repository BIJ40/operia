

# Nettoyage Legacy V1 — Plan de suppression

## Contexte

Le système V2 est en production (Phase 17 complétée). Cependant, tout le code V1 est encore présent : moteur de permissions, hooks qui interrogent des tables supprimées (via `as any`), vues admin obsolètes, et le bridge V1/V2 qui maintient un fallback inutile. Ce code mort représente environ 3000+ lignes.

## Fichiers Legacy identifiés

### Tier 1 — Hooks interrogeant des tables V1 mortes (6 fichiers)
Ces hooks utilisent `as any` pour accéder à des tables qui n'existent plus ou sont remplacées :

| Fichier | Table V1 morte | Remplacé par |
|---------|---------------|-------------|
| `useAgencySubscription.ts` | `agency_subscription` | `agency_plan` (V2) |
| `usePlanTiers.ts` | `plan_tiers`, `plan_tier_modules` | `plan_catalog`, `plan_module_grants` |
| `useModuleRegistry.ts` | `module_registry` | `module_catalog` |
| `useAgencyFeature.ts` | `agency_features` | `agency_module_entitlements` |
| `useAgencyFeaturesAdmin.ts` | `agency_features`, `user_modules` | `user_access` |
| `useParityTest.ts` | `user_modules` | Plus nécessaire (migration terminée) |
| `useModuleOverrides.ts` | `user_modules` | `user_access` |

### Tier 2 — Config files V1 (4 fichiers)
| Fichier | Lignes | Remplacé par |
|---------|:---:|-------------|
| `src/config/planTiers.ts` | ~40 | `plan_catalog` (DB) |
| `src/config/agencyFeatures.ts` | ~? | `agency_module_entitlements` (DB) |
| `src/config/modulesByRole.ts` | ~122 | RPC `get_user_permissions` |
| `src/config/roleAgenceModulePresets.ts` | ~88 | `job_profile_presets` (DB) |

### Tier 3 — Moteur V1 (3 fichiers)
| Fichier | Lignes | Remplacé par |
|---------|:---:|-------------|
| `src/permissions/permissionsEngine.ts` | ~613 | RPC `get_user_permissions` |
| `src/permissions/moduleRegistry.ts` | ~191 | `module_catalog` (DB) |
| `src/permissions/constants.ts` | ~150 | `module_catalog` + `shared-constants.ts` |

### Tier 4 — Vues admin V1 (4 fichiers)
| Vue | Utilise | Remplacée par |
|----|---------|-------------|
| `ModulesMasterView.tsx` (l'ancien) | `useModuleRegistry` | `ModulesMasterViewV2` |
| `OffresAndOptionsView.tsx` | `usePlanTiers`, `useAgencySubscription`, `agency_features` | `PlanCatalogViewV2` |
| `AgencyFeaturesAdminView.tsx` | `useAgencyFeaturesAdmin`, `agency_features` | `agency_module_entitlements` UI |
| `PermissionsParityTestView.tsx` | `useParityTest`, `user_modules` | Plus nécessaire |

### Tier 5 — Bridge V1/V2
| Fichier | Action |
|---------|--------|
| `usePermissionsBridge.ts` | Supprimer le fallback V1, garder uniquement le chemin V2 |
| `PermissionsContext.tsx` (V1) | Conserver temporairement car `AuthContext` l'alimente encore |

## Étapes d'implémentation

### Etape 1 — Simplifier le bridge (1 fichier)
Réécrire `usePermissionsBridge` pour ne plus importer `usePermissions` V1 ni `useAppFeatureFlag`. Toujours utiliser le chemin V2. Les 77 fichiers consommateurs ne changent pas.

### Etape 2 — Supprimer les hooks V1 morts (7 fichiers)
Supprimer `useAgencySubscription`, `usePlanTiers`, `useModuleRegistry`, `useAgencyFeature`, `useAgencyFeaturesAdmin`, `useParityTest`, `useModuleOverrides`. Mettre à jour `src/hooks/access-rights/index.ts`.

### Etape 3 — Supprimer les config V1 (4 fichiers)
Supprimer `planTiers.ts`, `agencyFeatures.ts`, `modulesByRole.ts`, `roleAgenceModulePresets.ts`.

### Etape 4 — Mettre à jour les consommateurs impactés
- `usePlanAccess.ts` : réécrire pour utiliser les données V2 (RPC) au lieu de `useAgencySubscription`
- `FeatureGuard.tsx` : réécrire pour utiliser les permissions V2
- `PlanGuard.tsx` : réécrire pour utiliser les permissions V2
- `TeamMemberModules.tsx` / `AgencyTeamRightsPanel.tsx` : retirer l'import de `roleAgenceModulePresets`
- `AuthContext.tsx` : retirer l'import de `@/permissions` (moteur V1) et `userModulesToEnabledModules`
- `sitemapData.ts` : retirer le type `PlanKey`
- `views/index.ts` : retirer les exports des vues V1

### Etape 5 — Supprimer les vues admin V1 (4 fichiers)
Supprimer `ModulesMasterView.tsx`, `OffresAndOptionsView.tsx`, `AgencyFeaturesAdminView.tsx`, `PermissionsParityTestView.tsx`. Retirer leurs onglets/routes dans `AdminHubContent`.

### Etape 6 — Supprimer le moteur V1 (3 fichiers)
Supprimer `permissionsEngine.ts`, `moduleRegistry.ts`, `constants.ts`. Nettoyer `src/permissions/index.ts` pour ne réexporter que les types et `shared-constants.ts`.

### Etape 7 — Nettoyage final
- Supprimer `src/config/moduleTree.ts` si plus aucun import
- Supprimer les tests V1 dans `src/permissions/__tests__/` qui testent le moteur V1
- Supprimer `LEGACY_V1_REFERENCE.md` (mission accomplie)
- Mettre à jour la doc `GUIDE_DROITS_PLANS_OVERRIDES.md`

## Risques et mitigations

- **Le bridge V2 doit être stable** : si le flag `USE_PERMISSIONS_V2` est `false` en base, le bridge V1 est le seul chemin actif. Il faut confirmer que le flag est `true` avant de supprimer le fallback.
- **AuthContext V1** : le provider V1 alimente encore `useAuth()` (backward compat). On le simplifie mais on ne le supprime pas encore — juste retirer la dépendance au moteur V1.
- **Tests** : certains tests unitaires importent directement le moteur V1. Ils seront supprimés ou migrés.

## Estimation
~20 fichiers supprimés, ~10 fichiers modifiés, ~3500 lignes retirées.

