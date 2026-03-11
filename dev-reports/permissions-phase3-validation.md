# Permissions Phase 3 — Validation Report

Date: 2026-03-11

## Résumé exécutif

| Critère | Statut | Détails |
|---|---|---|
| Double-lecture (COMPAT_MAP) | ⚠️ PARTIEL | Actif sur Chemin A (`useEffectiveModules`), absent sur Chemin B (`ModuleGuard` / `usePermissions`) |
| Ticketing compat | ✅ PASS | `ticketing` → `support.ticketing` fonctionne via Chemin A. Prod utilise clé legacy = stable |
| Guards usage | ✅ OK | Tous les guards prod utilisent des clés legacy — aucun breakage |
| COMPAT_MAP coverage | ✅ 97.2% | 35/36 clés couvertes. 1 clé création pure (`support.faq`) |
| Admin bypass | ✅ PASS | N5+ bypass fonctionnel sur les deux chemins |
| Modules orphelins | ✅ OK | 0 orphelin critique. 1 clé Phase 3 attendue (`support.faq`) |
| Phase 4 readiness | ⚠️ BLOQUÉ | Unification des deux chemins hasModule requise avant migration |

## Diagnostic détaillé

### 1. Double-lecture

```
Chemin A — useEffectiveModules().hasModule
├── Direct check: modules[key]?.enabled
├── COMPAT_MAP lookup
│   ├── optionCheck → module.options[optionKey]
│   └── keys fallback → legacy OR logic
└── ✅ FONCTIONNEL

Chemin B — usePermissions().hasModule / ModuleGuard
├── hasAccess() → permissionsEngine
├── Vérifie enabledModules[moduleId]
├── ❌ PAS DE COMPAT_MAP
└── Fonctionne uniquement avec clés legacy
```

**Impact prod** : AUCUN — tout le code prod utilise des clés legacy.
**Impact Phase 4** : BLOQUANT — la migration vers les nouvelles clés cassera le Chemin B.

### 2. Ticketing

| Test | Résultat |
|---|---|
| `hasModule("ticketing")` avec `ticketing=true` | ✅ true |
| `hasModule("support.ticketing")` avec `ticketing=true` | ✅ true (Chemin A) |
| `hasModule("support.guides")` avec `ticketing=true` | ✅ false |
| Routes prod `ModuleGuard moduleKey="ticketing"` | ✅ Fonctionne (clé legacy directe) |

### 3. Couverture COMPAT_MAP

- **35/36** clés fonctionnelles mappées
- Seule exception : `support.faq` (création pure, pas de legacy)
- Tous les domaines couverts : pilotage, commercial, organisation, médiathèque, support, admin

### 4. Admin bypass

- Chemin A : `isAdminBypass` flag → bypass avant COMPAT_MAP ✅
- Chemin B : `isBypassRole()` dans permissionsEngine ✅
- Toutes les clés (legacy + Phase 3) retournent `true` pour N5+

### 5. Guards audit

- **0 accès direct dangereux** en production
- **3 fichiers admin** avec accès direct `modules[key]` — pas critique, recommandation de migration pour consistance
- **23 routes** utilisent `ModuleGuard` avec clés legacy — fonctionnel, migration Phase 4

## Action requise avant Phase 4

### Unification des chemins hasModule

**Option A** — Injecter le COMPAT_MAP dans `permissionsEngine.hasAccess()` :
- Pro : centralise la logique
- Con : modifie le moteur core

**Option B** — Faire passer `ModuleGuard` par `useEffectiveModules().hasModule` :
- Pro : réutilise la logique existante
- Con : change le wiring du guard

**Option C** — Ajouter le COMPAT_MAP dans `PermissionsContext.hasModule` :
- Pro : impacte tous les consommateurs de `usePermissions()` d'un coup
- Con : duplique le COMPAT_MAP

**Recommandation** : Option B — modifier `ModuleGuard` pour utiliser `useEffectiveModules().hasModule` au lieu de `hasAccess()` du permissionsEngine.

## Verdict final

```
╔══════════════════════════════════════╗
║  SAFE_FOR_PHASE4 = false            ║
║                                      ║
║  Raison: double chemin hasModule     ║
║  Action: unifier avant migration     ║
║  Prod actuelle: STABLE ✅            ║
╚══════════════════════════════════════╝
```

## Fichiers de référence

| Fichier | Contenu |
|---|---|
| `src/devtools/moduleCompatTest.ts` | Tests double-lecture (3 cas) |
| `src/devtools/ticketingAccessTest.ts` | Tests sécurité ticketing (4 scénarios) |
| `dev-reports/module-guards-audit.md` | Audit accès directs |
| `dev-reports/module-compat-coverage.md` | Couverture COMPAT_MAP |
| `dev-reports/module-orphans.md` | Modules orphelins |
| `dev-reports/admin-bypass-test.md` | Test admin bypass |
| `dev-reports/migration-plan-phase4.md` | Plan migration Phase 4 |
