# Phase 9 — Admin Rights Layer Alignment Report

## 1. Résumé exécutif

La couche admin d'affichage/édition des droits utilisateurs était désalignée avec le runtime après Phase 8.
La cause : la table `user_modules` stocke des clés **legacy** (`aide`, `rh`, `agence`…) tandis que `MODULE_DEFINITIONS` utilise des clés **hiérarchiques** (`support.aide_en_ligne`, `organisation.salaries`, `pilotage.agence`…).

Le correctif Phase 9 introduit un **dual-key mapping transitoire** dans `userModulesUtils.ts` pour que les lookups admin (`modules[def.key]`) résolvent correctement.

## 2. Cause exacte du bug admin

```
DB (user_modules)               userModulesToEnabledModules()         MODULE_DEFINITIONS
┌──────────────────┐             ┌──────────────────────────┐         ┌──────────────────────┐
│ module_key='aide' │ ─────────► │ result['aide'] = {..}    │         │ key='support.aide_en_│
│                   │             │                          │         │   ligne'             │
└──────────────────┘             └──────────────────────────┘         └──────────────────────┘
                                              ▼
                                 UI does: modules[def.key]
                                 def.key = 'support.aide_en_ligne'
                                 result['support.aide_en_ligne'] → undefined ← BUG
```

Les composants admin itèrent `MODULE_DEFINITIONS` et cherchent `enabledModules[def.key]` — mais `def.key` est hiérarchique et la clé dans le résultat est legacy. Résultat : tous les modules apparaissent désactivés.

## 3. Séparation des vues : droits effectifs vs configuration

### Vue 1 — Accès réels (droits effectifs)
- **Source** : RPC `get_user_effective_modules`
- **Composant** : `UserProfileSheet.tsx` → Section "Accès réels"
- **Sous-titre ajouté** : "Droits effectifs issus du moteur de permissions — ce que l'utilisateur peut réellement faire."

### Vue 2 — Modules configurés (attributions admin)
- **Source** : Table `user_modules` → `userModulesToEnabledModules()`
- **Composants** :
  - `InlineModuleBadges.tsx` → Popover "Modules configurés" / "Configuration individuelle"
  - `UserAccessSimple.tsx` → "Modules configurés" (remplace "Modules activés")
  - `UserPermissionsColumn.tsx` → Section "Permissions" (lecture via `enabledModules` prop, non modifié car wording déjà neutre)

**Aucun admin ne peut confondre** "ce qui est configuré" avec "ce qui est réellement autorisé".

## 4. Fonctionnement dual-key mapping

### Lecture (`userModulesToEnabledModules`)
Pour chaque row legacy en DB (ex: `module_key='aide'`), le résultat contient :
- `result['aide'] = { enabled: true, options: {...} }` ← clé legacy (compat code existant)
- `result['support.aide_en_ligne'] = { enabled: true, options: {...} }` ← clé hiérarchique (MODULE_DEFINITIONS)

**Déduplication** : si une row hiérarchique explicite existe déjà en DB, elle prend priorité sur la clé legacy mappée.

### Écriture (`enabledModulesToRows`)
Avant insertion DB, les clés hiérarchiques sont normalisées vers legacy :
- `'pilotage.agence'` → écrit `module_key='agence'` en DB
- `'ticketing'` → passe tel quel (pas dans le mapping)

**Anti-doublon** : un `Set<string>` de clés écrites empêche les doublons si both `agence` et `pilotage.agence` sont dans `enabledModules`.

### Caractère transitoire
Cette stratégie est **temporaire**. Elle sera supprimable quand :
1. La DB `user_modules` sera migrée pour stocker les clés hiérarchiques
2. La RPC sera mise à jour pour ne plus renvoyer de clés legacy
3. Les `enabledModules` legacy named props seront supprimées du type TypeScript

## 5. Stratégie anti-doublons visuels

**Question** : le dual-key mapping en lecture peut-il créer des doublons visuels ?

**Réponse** : **NON**, pour les raisons suivantes :

1. **Les composants d'affichage itèrent `MODULE_DEFINITIONS`** — pas les clés de `enabledModules`
2. **`MODULE_DEFINITIONS` ne contient QUE des clés hiérarchiques** (ex: `pilotage.agence`, jamais `agence`)
3. Les clés legacy injectées dans `enabledModules` (`result['aide']`, `result['agence']`) **ne sont jamais rendues directement** — aucune définition ne les référence
4. **`PLAN_VISIBLE_MODULES`** est dérivé de `MODULE_DEFINITIONS` → même garantie

Concrètement :
- `InlineModuleBadges` itère `PLAN_VISIBLE_MODULES` (hiérarchique) → 1 badge par module
- `UserProfileSheet` itère `MODULE_DEFINITIONS` → 1 carte par module
- `UserAccessSimple` itère `MODULE_DEFINITIONS` → 1 ligne par module
- Aucun composant ne fait `Object.keys(enabledModules).map(...)` pour le rendu

**Risque zéro** de doublons visuels, doubles comptages, ou badges dupliqués.

## 6. Ajout de l'option `edition` à `support.guides`

L'option `edition` était utilisée dans 10 fichiers via `hasModuleOption('guides', 'edition')` et référencée dans `SPECIAL_ACCESS_KEYS` (`constants.ts`), mais **absente de MODULE_OPTIONS et MODULE_DEFINITIONS**.

**Correction** :
- Ajoutée dans `MODULE_OPTIONS['support.guides']` : `edition: 'support.guides.edition'`
- Ajoutée dans `MODULE_DEFINITIONS` (support.guides options) avec `defaultEnabled: false`
- Les 10 call sites migrés de `'guides'` → `'support.guides'`

## 7. Fichiers modifiés

| # | Fichier | Fix | Nature |
|---|---------|-----|--------|
| 1 | `src/lib/userModulesUtils.ts` | 1+2 | Dual-key mapping READ + WRITE |
| 2 | `src/types/modules.ts` | 3 | Ajout option `edition` à `support.guides` |
| 3 | `src/hooks/admin-tickets/useSupportUsers.ts` | 4 | `.eq → .in` query |
| 4 | `src/pages/admin/SupportSettings.tsx` | 4 | `.eq → .in` query |
| 5 | `src/contexts/EditorContext.tsx` | 5 | `'guides' → 'support.guides'` |
| 6 | `src/contexts/ApporteurEditorContext.tsx` | 5 | idem |
| 7 | `src/contexts/HcServicesEditorContext.tsx` | 5 | idem |
| 8 | `src/pages/CategoryPage.tsx` | 5 | idem |
| 9 | `src/pages/CategoryHcServices.tsx` | 5 | idem |
| 10 | `src/pages/CategoryActionsAMener.tsx` | 5 | idem |
| 11 | `src/pages/ApogeeGuide.tsx` | 5 | idem |
| 12 | `src/pages/HcServicesGuide.tsx` | 5 | idem |
| 13 | `src/pages/ApporteurGuide.tsx` | 5 | idem |
| 14 | `src/pages/AcademyIndex.tsx` | 5 | `'guides' → 'support.guides'` (faq) |
| 15 | `src/components/preload/PreloadTipsCarousel.tsx` | 6 | Clés legacy → hiérarchiques |
| 16 | `src/components/admin/users/UserProfileSheet.tsx` | 7 | Sous-titre "droits effectifs" |
| 17 | `src/components/admin/users/InlineModuleBadges.tsx` | 7 | Wording "Modules configurés" |
| 18 | `src/components/admin/users/UserAccessSimple.tsx` | 7 | Wording "Modules configurés" |
| 19 | `src/__tests__/userModulesUtils.test.ts` | 8 | Tests dual-key + normalisation |
| 20 | `dev-reports/phase9-admin-rights-alignment-report.md` | 9 | Ce rapport |

**Fichiers NON modifiés (comme prévu)** :
- `UserPermissionsColumn.tsx` — wording déjà neutre ("Permissions"), aucun changement nécessaire
- RPC — aucune modification
- Base de données — aucune modification
- `COMPAT_MAP` — non réintroduit
- `shared-constants.ts` / Edge Function — non modifiés

## 8. Risques résiduels

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Row DB écrite en hiérarchique par Phase 8 | Faible (Phase 8 vient de landing) | Moyenne | Le dual-key mapping gère ce cas |
| SupportSettings écrit `module_key='aide'` (hardcodé L184) | Existant | Faible | Fonctionne car DB attend legacy |
| RPC renvoie clés legacy ET hiérarchiques | Attendu | Aucun | `UserProfileSheet` itère MODULE_DEFINITIONS |

## 9. Recommandation prod : GO / NO-GO

### **GO CONDITIONNEL**

✅ L'admin affiche les bons labels hiérarchiques métier
✅ Les deux vues (effective vs configurée) sont clairement séparées
✅ L'édition écrit les bonnes clés legacy en DB
✅ Les options manquantes (`edition`) sont formalisées
✅ Aucun doublon visuel possible
✅ Aucune modification RPC/DB

⚠️ **Condition** : valider que le build compile et que les tests passent avant déploiement.
