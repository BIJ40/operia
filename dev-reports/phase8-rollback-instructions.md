# Phase 8 — Instructions de Rollback

**Date** : 2026-03-12  
**Contexte** : Retrait de COMPAT_MAP et migration vers clés hiérarchiques

---

## 1. Stratégie de rollback

La Phase 8 a été exécutée de manière **atomique** dans un seul commit. Le rollback se fait par **revert du commit entier**.

---

## 2. Commande de rollback

```bash
# Identifier le commit Phase 8
git log --oneline -10

# Revert atomique
git revert <COMMIT_SHA> --no-edit

# Vérifier
npm run build
npm run test
```

---

## 3. Liste exhaustive des fichiers à restaurer

### Fichiers supprimés à recréer (2)

| Fichier | Action rollback |
|---|---|
| `src/permissions/compatMap.ts` | Restauré par le revert (contient `COMPAT_MAP`, `resolveModuleViaCompat`, `resolveModuleOptionViaCompat`) |
| `src/devtools/moduleCompatTest.ts` | Restauré par le revert (script de test COMPAT_MAP) |

### Fichiers modifiés à restaurer (15)

| # | Fichier | Ce qui doit revenir |
|---|---|---|
| 1 | `src/types/modules.ts` | `MODULE_DEFINITIONS` keys redeviennent legacy (`agence`, `rh`, etc.), `MODULE_OPTIONS` paths restaurés, `MODULE_SHORT_LABELS` legacy restaurés |
| 2 | `src/permissions/constants.ts` | `MODULE_OPTION_MIN_ROLES` paths legacy restaurés (`agence.indicateurs`, `rh.rh_viewer`, etc.), `AGENCY_REQUIRED_MODULES` sans doublons hiérarchiques |
| 3 | `src/config/modulesByRole.ts` | `DEFAULT_MODULES_BY_ROLE` utilise à nouveau `'guides'`, `'aide'`, `'rh'`, `'agence'` |
| 4 | `src/contexts/AuthContext.tsx` | Imports `compatMap` restaurés, fallbacks `resolveModuleViaCompat`/`resolveModuleOptionViaCompat` restaurés, refs `'aide'`/`'guides'` restaurées |
| 5 | `src/components/auth/ModuleGuard.tsx` | Import `compatMap` restauré, fallbacks COMPAT restaurés |
| 6 | `src/hooks/access-rights/useEffectiveModules.ts` | Import `compatMap` restauré, fallback dans `hasModule` restauré |
| 7 | `src/permissions/permissionsEngine.ts` | `enabledModules?.aide` restauré (au lieu de `enabledModules?.['support.aide_en_ligne']`) |
| 8 | `src/hooks/use-user-management.ts` | `moduleKey === 'aide'` restauré |
| 9 | `src/components/admin/users/InlineModuleBadges.tsx` | `MODULE_ICONS`/`MODULE_COLORS` keys legacy restaurées |
| 10 | `src/components/admin/users/user-full-dialog/constants.ts` | `SPECIAL_ACCESS_KEYS` : `'aide'`, `'guides'` restaurés |
| 11 | `src/components/admin/views/rightsTaxonomy.ts` | `RIGHTS_CATEGORIES` keys legacy restaurées |
| 12 | `src/permissions/moduleRegistry.ts` | `isValidOptionPath` logique simple restaurée |
| 13 | `src/permissions/__tests__/permissionsEngine.test.ts` | `moduleId: 'agence'` etc. restaurés |
| 14 | `src/permissions/__tests__/moduleRegistry.test.ts` | Clés legacy restaurées dans les tests |
| 15 | `src/permissions/__tests__/permissions-lockdown.test.ts` | État pré-Phase 8 restauré |

---

## 4. Ordre de restauration

Le `git revert` restaure tout atomiquement. Si un revert manuel est nécessaire :

1. **D'abord** : Restaurer `src/permissions/compatMap.ts` (les autres fichiers en dépendent via import)
2. **Ensuite** : Restaurer `src/devtools/moduleCompatTest.ts`
3. **Puis** : Restaurer les 15 fichiers modifiés (ordre indifférent, pas de dépendances inter-fichiers au-delà de compatMap)
4. **Enfin** : Vérifier

---

## 5. Checklist de vérification post-rollback

### Build
- [ ] `npm run build` passe sans erreur
- [ ] L'application se charge dans le navigateur

### Tests
- [ ] `npm run test` : 255/255 tests passent
- [ ] `permissionsEngine.test.ts` : 31/31
- [ ] `permissions-lockdown.test.ts` : 35/35
- [ ] `moduleRegistry.test.ts` : 23/23

### Runtime
- [ ] `import { COMPAT_MAP } from '@/permissions/compatMap'` résout correctement
- [ ] `hasAccessToScope('apporteurs')` résout via `hasModuleOptionGuard('guides', 'apporteurs')`
- [ ] `MODULE_DEFINITIONS.find(m => m.key === 'agence')` retourne une entrée
- [ ] `MODULE_DEFINITIONS.find(m => m.key === 'rh')` retourne une entrée
- [ ] Les badges module dans l'admin affichent les icônes correctement
- [ ] La navigation par onglets fonctionne (pilotage, organisation, support, etc.)

### Permissions
- [ ] Un utilisateur `franchisee_admin` avec module `agence` activé accède au pilotage
- [ ] Un utilisateur `base_user` n'accède pas aux modules restreints
- [ ] Le bypass `platform_admin`/`superadmin` fonctionne

---

## 6. Conditions d'activation du rollback

Déclencher le rollback si :
1. Un module précédemment accessible devient inaccessible pour un rôle autorisé
2. Les badges/icônes modules disparaissent dans l'admin
3. `hasAccess()` retourne `false` pour un module hiérarchique qui devrait être autorisé
4. Les tests de permissions échouent après déploiement
5. Un guard de route bloque l'accès de manière injustifiée

---

## 7. Fichiers NON concernés par le rollback

Ces fichiers n'ont **pas** été modifiés en Phase 8 et ne doivent **pas** être touchés lors d'un rollback :

- `src/permissions/shared-constants.ts` — Inchangé
- `supabase/functions/_shared/permissionsEngine.ts` — Inchangé
- `supabase/functions/unified-search/index.ts` — Inchangé
- Toute migration SQL — Aucune modification
- La RPC `get_user_effective_modules` — Aucune modification
