# Phase 3.5 — Unification des chemins de résolution des permissions

Date: 2026-03-11

## 1. Cartographie exacte des 5 fonctions

### Architecture actuelle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CHEMIN A — COMPAT ACTIF ✅                       │
│                                                                         │
│  useEffectiveModules().hasModule(key)                                   │
│  ├── 1. isAdminBypass ? → true                                         │
│  ├── 2. modules[key]?.enabled ? → true (direct)                        │
│  ├── 3. COMPAT_MAP[key] ?                                              │
│  │   ├── optionCheck → modules[mk]?.enabled && modules[mk]?.options[ok]│
│  │   └── keys fallback → compat.keys.some(k => modules[k]?.enabled)   │
│  └── 4. false                                                          │
│                                                                         │
│  Source modules : RPC get_user_effective_modules (React Query cache)    │
│  Consommateurs : 11 fichiers (tabs, workspace)                         │
│  Fichier : src/hooks/access-rights/useEffectiveModules.ts              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      CHEMIN B — COMPAT ABSENT ❌                        │
│                                                                         │
│  usePermissions().hasModule(key)                                        │
│  └── hasModuleGuard(key)        [AuthContext.tsx L112-114]              │
│      └── hasAccess({ ...accessContext, moduleId: key })                │
│          └── permissionsEngine.hasAccess()                              │
│              ├── 1. isBypassRole ? → true                              │
│              ├── 2. MODULE_MIN_ROLES check                             │
│              ├── 3. AGENCY_REQUIRED check                              │
│              ├── 4. NETWORK_MODULES check                              │
│              ├── 5. getEffectiveModules() → MODULE_DEFINITIONS lookup  │
│              └── 6. PAS DE COMPAT_MAP                                  │
│                                                                         │
│  Source modules : enabledModules JSONB (profil, contexte auth)         │
│  Consommateurs : ~15 fichiers (editors, scopes, pages)                 │
│  Fichier : src/contexts/AuthContext.tsx + src/permissions/permissionsEngine.ts │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        ModuleGuard COMPONENT                            │
│                                                                         │
│  <ModuleGuard moduleKey="ticketing">                                   │
│  └── usePermissions() → accessContext                                  │
│      └── hasAccess({ ...accessContext, moduleId, optionId })           │
│          └── permissionsEngine.hasAccess() ← CHEMIN B                  │
│                                                                         │
│  Consommateurs : 23 routes (projects, pilotage, academy, rh, etc.)    │
│  Fichier : src/components/auth/ModuleGuard.tsx                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Détail par fonction

| Fonction | Fichier | COMPAT_MAP | Source modules | Consommateurs |
|---|---|---|---|---|
| `useEffectiveModules().hasModule` | `useEffectiveModules.ts` | ✅ OUI | RPC → React Query | 11 fichiers (tabs UI) |
| `usePermissions().hasModule` | `AuthContext.tsx` L443 | ❌ NON | `enabledModules` JSONB profil | ~15 fichiers (editors, scopes) |
| `hasModuleGuard` | `AuthContext.tsx` L112-114 | ❌ NON | `accessContext` | Interne → `usePermissions().hasModule` |
| `hasAccess` | `permissionsEngine.ts` L80-129 | ❌ NON | `getEffectiveModules()` | `hasModuleGuard`, `ModuleGuard` |
| `ModuleGuard` | `ModuleGuard.tsx` | ❌ NON | `usePermissions()` → `hasAccess` | 23 routes |

### Consommateurs détaillés

**Chemin A (`useEffectiveModules().hasModule`) — 11 fichiers :**
- `PilotageTabContent.tsx` — filtrage onglets pilotage
- `OrganisationTabContent.tsx` — filtrage onglets organisation
- `AideTabContent.tsx` — filtrage guides + onglets support
- `CommercialTabContent.tsx` — filtrage onglets commercial
- `DocumentsTabContent.tsx` — ⚠️ utilise `usePermissions().hasModule` (anomalie)
- `DiversTabContent.tsx` — filtrage onglets admin/divers
- `UnifiedWorkspace.tsx` — visibilité onglets principaux
- `AcademyIndex.tsx` — check FAQ
- `DataPreloadContext.tsx` — preload conditionnel

**Chemin B (`usePermissions().hasModule`) — ~15 fichiers :**
- `DocumentsTabContent.tsx` — ⚠️ devrait être Chemin A
- `ProspectionTabContent.tsx` — filtrage onglets prospection
- `IndicateursLayout.tsx` — redirect si pas accès
- `CategoryPage.tsx`, `CategoryActionsAMener.tsx` — permissions éditeur
- `HcServicesGuide.tsx` — permissions éditeur
- `EditorContext.tsx`, `HcServicesEditorContext.tsx`, `ApporteurEditorContext.tsx` — édition

**ModuleGuard (23 routes) :**
- `projects.routes.tsx` × 7 — `moduleKey="ticketing"`
- `pilotage.routes.tsx` × 5 — `moduleKey="agence"`
- `academy.routes.tsx` × 5 — `moduleKey="guides"`
- `rh.routes.tsx` × 3 — `moduleKey="rh"`
- `realisations.routes.tsx` × 3 — `moduleKey="realisations"`

---

## 2. Source de vérité cible

**`useEffectiveModules().hasModule`** doit devenir la source unique de résolution de modules.

### Justification

| Critère | Chemin A (`useEffectiveModules`) | Chemin B (`permissionsEngine`) |
|---|---|---|
| COMPAT_MAP | ✅ Intégré | ❌ Absent |
| Source de données | RPC serveur (cascade plan + overrides + min_role) | JSONB profil (pas de cascade) |
| Cache | React Query (staleTime 30s) | Re-render profil |
| Impersonation | ✅ Natif | Via contexte auth |
| Phase 3 ready | ✅ | ❌ |

### Principe d'unification

```
AVANT (2 chemins) :
  usePermissions().hasModule → permissionsEngine.hasAccess() (sans COMPAT)
  useEffectiveModules().hasModule → COMPAT_MAP (avec COMPAT)

APRÈS (1 chemin) :
  usePermissions().hasModule ──┐
  ModuleGuard ─────────────────┤──→ useEffectiveModules().hasModule (COMPAT)
  useEffectiveModules().hasModule ──┘
```

---

## 3. Stratégie d'unification sans casse

### Option retenue : Rewire `hasModuleGuard` dans AuthContext

**Modifier `AuthContext.tsx`** pour que `hasModuleGuard` et `hasModuleOptionGuard` délèguent à la logique COMPAT_MAP au lieu d'appeler directement `hasAccess()`.

### Implémentation en 3 sous-étapes

#### Étape 3.5.1 — Extraire le COMPAT_MAP en module partagé

Créer `src/permissions/compatMap.ts` :
- Exporter le `COMPAT_MAP` et la fonction `resolveModuleKey(modules, key)` 
- `useEffectiveModules.ts` importe depuis ce module
- Zero changement de comportement

#### Étape 3.5.2 — Rewire `hasModuleGuard` dans AuthContext

Dans `AuthContext.tsx`, remplacer :
```typescript
// AVANT (L112-114)
const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
  return hasAccess({ ...accessContext, moduleId: moduleKey });
}, [accessContext]);
```

Par :
```typescript
// APRÈS
const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
  // 1. Direct check via permissionsEngine (legacy path)
  if (hasAccess({ ...accessContext, moduleId: moduleKey })) return true;
  // 2. COMPAT_MAP fallback (Phase 3 path)
  return resolveModuleViaCompat(enabledModules, moduleKey, isBypassRole(globalRole));
}, [accessContext, enabledModules, globalRole]);
```

Où `resolveModuleViaCompat` est importé depuis `compatMap.ts` et reproduit la logique COMPAT_MAP sans dépendance React.

#### Étape 3.5.3 — Modifier ModuleGuard (optionnel, si nécessaire)

`ModuleGuard` utilise `hasAccess()` directement (pas via `usePermissions().hasModule`). Il faut aussi ajouter le fallback COMPAT dans `ModuleGuard.tsx` :

```typescript
// AVANT (L76-96) - hasAccess direct
canAccessModule = hasAccess({ ...permissionContext, moduleId: moduleKey });

// APRÈS
canAccessModule = hasAccess({ ...permissionContext, moduleId: moduleKey })
  || resolveModuleViaCompat(enabledModules, moduleKey, isBypassRole(globalRole));
```

### Garanties de non-casse

| Règle | Comment |
|---|---|
| Pas de changement de données | Aucune modification de user_modules, plan_tier_modules |
| Pas de changement RPC | Aucune modification backend |
| Backward compatible | L'ancien `hasAccess()` est appelé EN PREMIER — si la clé legacy fonctionne, le COMPAT n'est même pas évalué |
| Prod ticketing | `ModuleGuard moduleKey="ticketing"` → `hasAccess()` trouve `ticketing` directement → COMPAT jamais atteint |
| Ajout pur | Le COMPAT est un fallback additionnel, pas un remplacement |

---

## 4. Impacts sur les guards existants

### Impact zéro sur la production actuelle

Tous les guards prod utilisent des clés legacy (`ticketing`, `agence`, `guides`, `rh`, `realisations`). Ces clés sont résolues par `hasAccess()` directement, AVANT le fallback COMPAT.

Le COMPAT_MAP ne sera activé que lorsque Phase 4 migrera les guards vers les nouvelles clés (ex: `support.ticketing`).

### Matrice d'impact par composant

| Composant | Modifié | Impact runtime | Risque |
|---|---|---|---|
| `AuthContext.tsx` (`hasModuleGuard`) | OUI | Ajout fallback COMPAT | NUL — fallback ajouté après check legacy |
| `AuthContext.tsx` (`hasModuleOptionGuard`) | OUI | Idem | NUL |
| `ModuleGuard.tsx` | OUI | Ajout fallback COMPAT | NUL — même logique |
| `useEffectiveModules.ts` | NON | — | — |
| `permissionsEngine.ts` | NON | — | — |
| Toutes les routes | NON | — | — |
| Tous les tabs | NON | — | — |

### Anomalie à corriger

`DocumentsTabContent.tsx` utilise `usePermissions().hasModule` avec des clés non-standard (`documents.gerer`, `documents.corbeille_vider`). Après unification, ces clés ne seront toujours pas résolues car elles ne sont ni dans `MODULE_DEFINITIONS` ni dans `COMPAT_MAP`. 

**Action** : Ajouter ces clés au COMPAT_MAP si elles doivent fonctionner, OU migrer vers les clés correctes (`mediatheque.gerer`, `mediatheque.corbeille`).

---

## 5. Condition SAFE_FOR_PHASE4

Phase 4 peut démarrer **uniquement** lorsque TOUTES les conditions suivantes sont vérifiées :

### Conditions obligatoires

| # | Condition | Vérification |
|---|---|---|
| C1 | `COMPAT_MAP` extrait dans un module partagé (`compatMap.ts`) | Fichier existe, importé par `useEffectiveModules.ts` |
| C2 | `hasModuleGuard` dans `AuthContext.tsx` inclut le fallback COMPAT | Code review + test unitaire |
| C3 | `ModuleGuard` composant inclut le fallback COMPAT | Code review + test unitaire |
| C4 | Test automatique : `hasModule("support.ticketing")` via Chemin B = `true` quand `ticketing=true` | `moduleCompatTest.ts` étendu |
| C5 | Test automatique : `hasModule("support.guides")` via Chemin B = `false` quand `ticketing=true` | `moduleCompatTest.ts` étendu |
| C6 | Test automatique : admin bypass actif sur les deux chemins | `adminBypassTest.ts` |
| C7 | Anomalie `DocumentsTabContent.tsx` corrigée | Code review |
| C8 | Zéro changement visible en production | Smoke test complet |

### Test de validation finale

```typescript
// Ce test DOIT passer sur les DEUX chemins avant Phase 4
const user = { enabledModules: { ticketing: { enabled: true } }, globalRole: 'base_user' };

// Chemin A
useEffectiveModules().hasModule('support.ticketing') === true   // ✅ déjà OK
useEffectiveModules().hasModule('support.guides') === false     // ✅ déjà OK

// Chemin B — DOIT devenir true après Phase 3.5
usePermissions().hasModule('support.ticketing') === true        // ❌ → ✅
usePermissions().hasModule('support.guides') === false          // ✅ déjà OK (pas de module)

// ModuleGuard — DOIT devenir true après Phase 3.5
<ModuleGuard moduleKey="support.ticketing"> → renders children  // ❌ → ✅
<ModuleGuard moduleKey="support.guides"> → redirects            // ✅ déjà OK
```

### Verdict

```
SAFE_FOR_PHASE4 =
  C1 ✅ AND C2 ✅ AND C3 ✅ AND C4 ✅ AND C5 ✅ AND C6 ✅ AND C7 ✅ AND C8 ✅
```

Si **une seule condition échoue**, Phase 4 est bloquée.

---

## Fichiers impactés par Phase 3.5

| Fichier | Action |
|---|---|
| `src/permissions/compatMap.ts` | **CRÉER** — COMPAT_MAP + `resolveModuleViaCompat()` |
| `src/hooks/access-rights/useEffectiveModules.ts` | **MODIFIER** — importer COMPAT_MAP depuis `compatMap.ts` |
| `src/contexts/AuthContext.tsx` | **MODIFIER** — rewire `hasModuleGuard` + `hasModuleOptionGuard` |
| `src/components/auth/ModuleGuard.tsx` | **MODIFIER** — ajout fallback COMPAT |
| `src/devtools/moduleCompatTest.ts` | **MODIFIER** — étendre pour tester Chemin B |
| `src/components/unified/tabs/DocumentsTabContent.tsx` | **MODIFIER** — corriger clés modules |

### Fichiers NON modifiés

- `src/permissions/permissionsEngine.ts` — pas touché
- Aucune RPC / edge function
- Aucune table Supabase
- Aucun fichier de routes
- Aucun composant UI visible
