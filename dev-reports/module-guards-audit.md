# Module Guards Audit — Phase 3

Date: 2026-03-11

## Objectif

Scanner les accès directs à `enabledModules[`, `modules[` hors moteurs internes pour recommander la migration vers `hasModule()`.

## Résultats

### Accès directs légitimes (moteurs internes — pas de migration nécessaire)

| Fichier | Ligne | Code | Raison |
|---|---|---|---|
| `src/types/modules.ts` | 495-514 | `enabledModules[moduleKey]` | Helpers utilitaires `isModuleEnabled` / `isModuleOptionEnabled` |
| `src/lib/userModulesUtils.ts` | 143, 157 | `modules[moduleKey]` | Helpers bas niveau pour admin |
| `src/hooks/access-rights/useEffectiveModules.ts` | 175 | `modules[moduleKey]` | Moteur COMPAT_MAP lui-même |
| `src/contexts/ImpersonationContext.tsx` | 132-136 | `resolvedModules[moduleKey]` | Construction modules impersonnés |

### Accès directs dans des composants UI — migration recommandée

| Fichier | Ligne | Code | Recommended Fix |
|---|---|---|---|
| `src/components/admin/users/UserAccessSimple.tsx` | 36-40 | `modules[def.key]` | Utiliser `isModuleEnabled()` ou `hasModule()` |
| `src/components/admin/users/UserProfileSheet.tsx` | 169-179 | `effectiveModules[def.key]` | Utiliser `isModuleEnabled()` |
| `src/components/users/UserModulesTab.tsx` | 146, 154 | `enabledModules[moduleKey]` | OK — composant admin d'édition de modules |
| `src/hooks/user-management/useUserFilters.ts` | 21 | `modules[moduleKey]` | Utiliser `isModuleEnabled()` |
| `src/hooks/use-user-management.ts` | 282, 614, 637 | `modules[moduleKey]` / `currentModules[moduleKey]` | OK — mutation admin de modules |
| `src/config/roleMatrix.ts` | 450 | `enabledModules[moduleKey]` | Utiliser `isModuleEnabled()` |

### Composants utilisant `hasModule()` via hooks (OK ✅)

| Fichier | Source du `hasModule` |
|---|---|
| `PilotageTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `OrganisationTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `AideTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `CommercialTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `DocumentsTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `DiversTabContent.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `UnifiedWorkspace.tsx` | `useEffectiveModules()` → COMPAT actif ✅ |
| `IndicateursLayout.tsx` | `usePermissions()` → COMPAT absent ⚠️ |

### Routes utilisant `ModuleGuard` (Chemin B — COMPAT absent ⚠️)

| Fichier | moduleKey utilisé | COMPAT actif |
|---|---|---|
| `projects.routes.tsx` (x7) | `ticketing` | Non — mais clé legacy, fonctionne |
| `pilotage.routes.tsx` (x5) | `agence` | Non — mais clé legacy, fonctionne |
| `academy.routes.tsx` (x5) | `guides` | Non — mais clé legacy, fonctionne |
| `rh.routes.tsx` (x3) | `rh` | Non — mais clé legacy, fonctionne |
| `realisations.routes.tsx` (x3) | `realisations` | Non — mais clé legacy, fonctionne |

## Conclusion

- **Aucun accès direct ne cause de bug en prod** — toutes les routes utilisent des clés legacy.
- **3 fichiers admin** mériteraient une migration vers `isModuleEnabled()` pour consistance.
- **Le problème principal reste le double chemin** : `ModuleGuard` (Chemin B) n'utilise pas le COMPAT_MAP.
- **Phase 4 bloquée** tant que `ModuleGuard` n'est pas unifié avec la logique COMPAT.
