# Phase 8 — Rapport de suppression COMPAT_MAP

**Date** : 2026-03-12  
**Statut** : ✅ Validé  

---

## 1. Résumé exécutif

La Phase 8 a retiré le mécanisme `COMPAT_MAP` du runtime frontend. Les 11 modules legacy ont été migrés vers leurs clés hiérarchiques dans `MODULE_DEFINITIONS`, et tous les consommateurs runtime ont été mis à jour. Le fallback COMPAT a été supprimé des 3 fichiers qui le consommaient. La compilation et les 255 tests unitaires passent sans régression.

---

## 2. Suppressions effectives

### 2.1 COMPAT_MAP
- **Fichier supprimé** : `src/permissions/compatMap.ts`
- **Fonctions retirées** : `resolveModuleViaCompat`, `resolveModuleOptionViaCompat`, `COMPAT_MAP`
- **Imports retirés de** : `AuthContext.tsx`, `ModuleGuard.tsx`, `useEffectiveModules.ts`

### 2.2 moduleCompatTest.ts
- **Fichier supprimé** : `src/devtools/moduleCompatTest.ts`
- Script de test dédié au COMPAT_MAP, devenu sans objet.

---

## 3. Migration MODULE_DEFINITIONS

Les clés `key` de 11 entrées dans `MODULE_DEFINITIONS` (fichier `src/types/modules.ts`) ont été migrées :

| Ancienne clé | Nouvelle clé |
|---|---|
| `agence` | `pilotage.agence` |
| `stats` | `pilotage.dashboard` |
| `rh` | `organisation.salaries` |
| `parc` | `organisation.parc` |
| `divers_apporteurs` | `organisation.apporteurs` |
| `divers_plannings` | `organisation.plannings` |
| `divers_reunions` | `organisation.reunions` |
| `divers_documents` | `mediatheque.documents` |
| `aide` | `support.aide_en_ligne` |
| `guides` | `support.guides` |
| `realisations` | `commercial.realisations` |

Les labels, descriptions, options et catégories ont été conservés à l'identique.

---

## 4. Migration MODULE_OPTION_MIN_ROLES

Fichier : `src/permissions/constants.ts`

Les paths d'options ont été migrés pour refléter les nouvelles clés :
- `agence.indicateurs` → `pilotage.agence.indicateurs`
- `agence.carte_rdv` → `pilotage.agence.carte_rdv`
- `rh.rh_viewer` → `organisation.salaries.rh_viewer`
- `rh.rh_admin` → `organisation.salaries.rh_admin`
- `rh.coffre` → `organisation.salaries.coffre`
- `aide.user` → `support.aide_en_ligne.user`
- `aide.agent` → `support.aide_en_ligne.agent`
- `aide.admin` → `support.aide_en_ligne.admin`

Les entrées `ticketing.*`, `prospection.*`, `planning_augmente.*`, `admin_plateforme.*`, `reseau_franchiseur.*` n'ont **pas** été modifiées.

---

## 5. Migration des appels runtime recensés

### 5.1 hasAccessToScope (AuthContext.tsx)
- `hasModuleOptionGuard('guides', 'apporteurs')` → `hasModuleOptionGuard('support.guides', 'apporteurs')`
- `hasModuleOptionGuard('guides', 'helpconfort')` → `hasModuleOptionGuard('support.guides', 'helpconfort')`
- `hasModuleOptionGuard('guides', 'apogee')` → `hasModuleOptionGuard('support.guides', 'apogee')`

### 5.2 Références hardcodées migrées
| Fichier | Avant | Après |
|---|---|---|
| `AuthContext.tsx` | `checkModuleEnabled(…, 'aide')` | `checkModuleEnabled(…, 'support.aide_en_ligne')` |
| `AuthContext.tsx` | `enabledModules?.aide` | `enabledModules?.['support.aide_en_ligne']` |
| `permissionsEngine.ts` | `enabledModules?.aide` | `enabledModules?.['support.aide_en_ligne']` |
| `use-user-management.ts` | `moduleKey === 'aide'` | `moduleKey === 'support.aide_en_ligne'` |
| `user-full-dialog/constants.ts` | `'aide'`, `'guides'` | `'support.aide_en_ligne'`, `'support.guides'` |

### 5.3 Composants admin migrés
- `InlineModuleBadges.tsx` : `MODULE_ICONS` et `MODULE_COLORS` migrés pour les 11 modules
- `rightsTaxonomy.ts` : `RIGHTS_CATEGORIES`, `NAVIGATION_LABEL_FALLBACKS`, `LEGACY_LABELS` migrés

### 5.4 Suppression des fallbacks COMPAT dans les 3 consommateurs
| Fichier | Action |
|---|---|
| `AuthContext.tsx` | Import `compatMap` retiré, fallbacks `resolveModuleViaCompat`/`resolveModuleOptionViaCompat` supprimés |
| `ModuleGuard.tsx` | Import `compatMap` retiré, `hasAccess` simplifié sans fallback |
| `useEffectiveModules.ts` | Import `compatMap` retiré, `hasModule`/`hasModuleOption` simplifiés |

---

## 6. AGENCY_REQUIRED_MODULES — maintien additif

`AGENCY_REQUIRED_MODULES` dans `src/permissions/constants.ts` conserve une approche **additive** :
```ts
['agence', 'pilotage.agence', 'rh', 'organisation.salaries', 'parc', 'organisation.parc', 'prospection']
```

**Motif** : cette constante sert de garde-fou transversal. La rendre hiérarchique-only dans la même phase que la suppression de `COMPAT_MAP` ajouterait un risque inutile. Le nettoyage des doublons legacy sera fait dans une phase ultérieure après validation complète.

---

## 7. EnabledModules — props legacy conservées (mesure transitoire)

Les propriétés nommées legacy (`agence?`, `rh?`, `parc?`, `aide?`, `guides?`, etc.) sont **conservées** dans l'interface `EnabledModules` (`src/types/modules.ts`).

**Motif** : ces propriétés sont encore **consommées au runtime** par :
1. La RPC `get_user_effective_modules` qui retourne les deux formats (legacy + hiérarchique)
2. `DEFAULT_MODULES_BY_ROLE` qui utilise désormais les clés hiérarchiques mais l'interface doit accepter les deux
3. L'index signature `[key: string]` gère les clés hiérarchiques, mais les propriétés nommées garantissent le typage strict pour les consumers qui n'ont pas encore migré

**Statut** : mesure transitoire non bloquante. Ces props seront retirables quand :
- La RPC ne retourne plus que des clés hiérarchiques
- Tous les consumers externes (Edge Functions, admin UI) auront migré

---

## 8. Fichiers volontairement non purgés

### 8.1 `src/permissions/shared-constants.ts`
Les clés legacy (`agence`, `stats`, `rh`, `parc`, `divers_*`, `aide`, `guides`) sont **conservées** dans `SHARED_MODULE_KEYS`, `SHARED_MODULE_MIN_ROLES`, et `SHARED_MODULE_COMPAT_MAP`.

**Motif** :
- La RPC continue de retourner des clés legacy
- La base de données (`user_modules`, `plan_tier_modules`) contient encore des clés legacy
- Les Edge Functions lisent ces constantes pour résoudre les permissions côté serveur
- Aucun audit n'a prouvé que ces couches ne consomment plus ces clés

### 8.2 `supabase/functions/_shared/permissionsEngine.ts`
Les union members legacy du type `ModuleKey` sont **conservés**.

**Motif** :
- Les Edge Functions reçoivent des données de la base qui peuvent contenir des clés legacy
- Supprimer ces types casserait la compilation des Edge Functions sans bénéfice runtime

### 8.3 Pourquoi cela n'empêche pas le retrait de COMPAT_MAP
Le `COMPAT_MAP` servait exclusivement de **fallback runtime côté frontend** : quand `hasAccess('pilotage.agence')` échouait, il résolvait via `agence`. Maintenant que `MODULE_DEFINITIONS` utilise directement les clés hiérarchiques, `hasAccess` trouve la bonne entrée sans fallback. Les couches serveur (shared-constants, Edge Functions) fonctionnent indépendamment avec leur propre résolution.

---

## 9. Résultat compilation

✅ **Build preview OK** — Aucune erreur de compilation. L'application se charge correctement.

---

## 10. Résultat tests

✅ **255 tests passés sur 255** (14 fichiers de test)

Tests de permissions spécifiquement validés :
- `permissionsEngine.test.ts` : 31/31 ✅
- `permissions-lockdown.test.ts` : 35/35 ✅
- `moduleRegistry.test.ts` : 23/23 ✅

---

## 11. Validation finale du runtime

| Critère | Statut |
|---|---|
| `COMPAT_MAP` supprimé | ✅ |
| `moduleCompatTest.ts` supprimé | ✅ |
| Aucun import de `compatMap` dans le codebase | ✅ |
| `MODULE_DEFINITIONS` migré vers clés hiérarchiques | ✅ |
| `MODULE_OPTION_MIN_ROLES` aligné | ✅ |
| `DEFAULT_MODULES_BY_ROLE` migré | ✅ |
| `hasAccessToScope` migré | ✅ |
| Références hardcodées migrées | ✅ |
| `shared-constants.ts` conservé partiellement legacy | ✅ (volontaire) |
| Edge Function conservée partiellement legacy | ✅ (volontaire) |
| `AGENCY_REQUIRED_MODULES` additif | ✅ |
| `EnabledModules` props legacy conservées | ✅ (transitoire documenté) |
| Aucun fichier hors périmètre modifié | ✅ |

---

## 12. Nettoyage résiduel futur

Les étapes suivantes pourront être traitées dans une phase ultérieure :
1. Purger les clés legacy de `shared-constants.ts` (après migration RPC/DB)
2. Purger les union members legacy de l'Edge Function
3. Retirer les props nommées legacy de `EnabledModules`
4. Retirer les doublons legacy de `AGENCY_REQUIRED_MODULES`
5. Migrer `unified-search/index.ts` (`'guides'` → `'support.guides'`)

Ces opérations nécessitent au préalable :
- Migration des données en base (`user_modules`, `plan_tier_modules`)
- Mise à jour de la RPC pour ne plus retourner de clés legacy
- Validation que les Edge Functions ne lisent plus les clés legacy

---

## 13. Liste complète des fichiers modifiés/supprimés

### Fichiers supprimés (2)
1. `src/permissions/compatMap.ts`
2. `src/devtools/moduleCompatTest.ts`

### Fichiers modifiés (15)
1. `src/types/modules.ts` — MODULE_DEFINITIONS keys, MODULE_OPTIONS paths, MODULE_SHORT_LABELS
2. `src/permissions/constants.ts` — MODULE_OPTION_MIN_ROLES, AGENCY_REQUIRED_MODULES
3. `src/config/modulesByRole.ts` — DEFAULT_MODULES_BY_ROLE
4. `src/contexts/AuthContext.tsx` — Retrait COMPAT imports/fallbacks, migration refs hardcodées
5. `src/components/auth/ModuleGuard.tsx` — Retrait COMPAT imports/fallbacks
6. `src/hooks/access-rights/useEffectiveModules.ts` — Retrait COMPAT imports/fallbacks
7. `src/permissions/permissionsEngine.ts` — Migration ref `aide`
8. `src/hooks/use-user-management.ts` — Migration ref `aide`
9. `src/components/admin/users/InlineModuleBadges.tsx` — MODULE_ICONS/COLORS
10. `src/components/admin/users/user-full-dialog/constants.ts` — SPECIAL_ACCESS_KEYS
11. `src/components/admin/views/rightsTaxonomy.ts` — RIGHTS_CATEGORIES
12. `src/permissions/moduleRegistry.ts` — isValidOptionPath multi-dot fix
13. `src/permissions/__tests__/permissionsEngine.test.ts` — Migration clés tests
14. `src/permissions/__tests__/moduleRegistry.test.ts` — Migration clés tests
15. `src/permissions/__tests__/permissions-lockdown.test.ts` — Aucune modification requise (utilise déjà les clés via MODULE_DEFINITIONS)
