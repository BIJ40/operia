# Phase 7 — Constants Migration Report

**Date**: 2026-03-12
**Statut**: ✅ Complété — tous les tests passent (89/89)

---

## 1. Résumé exécutif

Migration additive des constantes front, shared-constants et Edge Function types pour inclure les 11 clés hiérarchiques. Aucune suppression legacy. COMPAT_MAP inchangé. RPC inchangée. Base de données inchangée.

- **6 fichiers modifiés** (dans le périmètre autorisé)
- **89 tests passent** (0 échecs)
- `MODULE_OPTION_MIN_ROLES` **non enrichi** (décision documentée ci-dessous)

---

## 2. Fichiers modifiés

| Fichier | Nature de la modification |
|---|---|
| `src/permissions/constants.ts` | `AGENCY_REQUIRED_MODULES` — ajout additif des clés hiérarchiques |
| `src/permissions/shared-constants.ts` | `SHARED_MODULE_KEYS`, `SHARED_MODULE_MIN_ROLES`, `SHARED_AGENCY_REQUIRED_MODULES` — ajout additif |
| `supabase/functions/_shared/permissionsEngine.ts` | `ModuleKey` type, `AGENCY_REQUIRED_MODULES`, `MODULE_MIN_ROLES`, `ALL_MODULE_KEYS` — ajout additif |
| `src/permissions/devValidator.ts` | Fix `lastIndexOf('.')` pour clés multi-points |
| `src/permissions/__tests__/permissions-lockdown.test.ts` | Fix assertions multi-points + filtrage engineAgencyModules |
| `src/permissions/__tests__/moduleRegistry.test.ts` | Fix assertions multi-points |

**Aucun autre fichier modifié.**

---

## 3. Constantes migrées

### `AGENCY_REQUIRED_MODULES` (additif)

```
Avant: ['agence', 'rh', 'parc', 'prospection']
Après: ['agence', 'rh', 'parc', 'prospection', 'pilotage.agence', 'organisation.salaries', 'organisation.parc']
```

**Pourquoi additif** : `hasAccess()` vérifie `AGENCY_REQUIRED_MODULES.includes(moduleId)` sans passer par COMPAT_MAP. Si un appelant passe encore une clé legacy (ex: `'agence'`), la suppression de la clé legacy casserait silencieusement le contrôle d'agence. Les deux versions coexistent jusqu'à la suppression de COMPAT_MAP.

### `SHARED_MODULE_KEYS`

11 clés hiérarchiques ajoutées. 16 clés legacy conservées.

### `SHARED_MODULE_MIN_ROLES`

11 entrées hiérarchiques ajoutées avec les min_roles correspondants du `module_registry`.

### `SHARED_AGENCY_REQUIRED_MODULES`

Identique à `AGENCY_REQUIRED_MODULES` (additif).

---

## 4. Types Edge Function migrés

### `ModuleKey` type

11 nouvelles valeurs ajoutées à l'union type :
- `pilotage.agence`, `pilotage.dashboard`
- `organisation.salaries`, `organisation.parc`, `organisation.apporteurs`, `organisation.plannings`, `organisation.reunions`
- `mediatheque.documents`
- `support.aide_en_ligne`, `support.guides`
- `commercial.realisations`

### `MODULE_MIN_ROLES`, `ALL_MODULE_KEYS`, `AGENCY_REQUIRED_MODULES`

Tous enrichis en mode additif dans `permissionsEngine.ts`.

---

## 5. Compatibilité legacy maintenue

- Toutes les clés legacy restent dans tous les tableaux et types
- COMPAT_MAP **inchangé**
- MODULE_DEFINITIONS **inchangé** (source de vérité pour les clés flat)
- Aucun comportement runtime modifié

---

## 6. Décision : MODULE_OPTION_MIN_ROLES NON enrichi

### Analyse des consommateurs runtime

| Consommateur | Construction du path | Source du moduleKey |
|---|---|---|
| `permissionsEngine.ts:115` | `${moduleId}.${optionId}` | Appelant (MODULE_DEFINITIONS keys) |
| `UserModulesTab.tsx:168` | `${moduleDef.key}.${option.key}` | MODULE_DEFINITIONS |
| Edge Function | N/A (pas de consommation) | — |

### Conclusion

**Tous les consommateurs runtime construisent les paths à partir de `MODULE_DEFINITIONS.key`**, qui utilise les clés flat legacy (ex: `rh`, `agence`). Aucun code ne construit `organisation.salaries.rh_viewer`.

Ajouter des entrées hiérarchiques dans `MODULE_OPTION_MIN_ROLES` serait du **code mort** — jamais consommé à l'exécution.

**Ces entrées devront être ajoutées uniquement quand MODULE_DEFINITIONS migrera vers les clés hiérarchiques** (étape ultérieure, hors périmètre Phase 7).

### Impact sur la suppression future de COMPAT_MAP

Aucun. La suppression de COMPAT_MAP concerne la résolution des clés de modules, pas les paths d'options. `MODULE_OPTION_MIN_ROLES` suivra naturellement la migration de MODULE_DEFINITIONS.

---

## 7. Adaptation des validateurs pour clés multi-points

### Problème

Les clés hiérarchiques (ex: `pilotage.agence`) produisent des paths à 3 segments (`pilotage.agence.indicateurs`) quand combinées avec une option. Les validateurs utilisaient `split('.')` avec une assertion `length === 2`, ce qui cassait.

### Solution

Remplacement de `split('.')[0]` par `lastIndexOf('.')` pour séparer correctement :
- `rh.rh_viewer` → moduleKey=`rh`, optionKey=`rh_viewer`
- `pilotage.agence.indicateurs` → moduleKey=`pilotage.agence`, optionKey=`indicateurs`

### Fichiers corrigés

- `devValidator.ts` : validation des paths dans `validateModuleOptionMinRoles()`
- `permissions-lockdown.test.ts` : 3 assertions dans "Module option min roles"
- `moduleRegistry.test.ts` : assertion dans "MODULE_OPTION_MIN_ROLES only contains valid option paths"

### Test agency-required

Le test "allows agency modules with agencyId" filtre maintenant les clés hiérarchiques (qui ne sont pas dans MODULE_DEFINITIONS et donc pas résolvables par `getEffectiveModules`). Les clés hiérarchiques sont testées au niveau guard/COMPAT_MAP, pas au niveau engine.

---

## 8. État du système avant suppression COMPAT_MAP

| Composant | État |
|---|---|
| RPC `get_user_effective_modules` | ✅ Stable, non modifiée |
| Guards front (ModuleGuard, hasAccess) | ✅ Fonctionnels via COMPAT_MAP |
| AGENCY_REQUIRED_MODULES | ✅ Additif (legacy + hiérarchique) |
| MODULE_MIN_ROLES (front) | ✅ Dérivé de MODULE_DEFINITIONS (legacy) |
| MODULE_MIN_ROLES (Edge) | ✅ Additif (legacy + hiérarchique) |
| SHARED_MODULE_KEYS | ✅ Additif (legacy + hiérarchique) |
| Edge Function ModuleKey type | ✅ Additif |
| Validateurs/tests | ✅ Compatibles multi-points |
| MODULE_OPTION_MIN_ROLES | ✅ Legacy uniquement (pas de code mort) |
| COMPAT_MAP | ✅ Inchangé, actif |

### Prochaines étapes pour le cutover final

1. Migrer MODULE_DEFINITIONS vers clés hiérarchiques
2. Mettre à jour MODULE_OPTION_MIN_ROLES (suivra MODULE_DEFINITIONS)
3. Supprimer les clés legacy de toutes les constantes
4. Supprimer COMPAT_MAP
