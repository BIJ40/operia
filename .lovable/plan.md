

## Validation Phase 3 + Preparation Phase 4

### Diagnostic critique découvert

Il existe **deux chemins `hasModule` parallèles** dans le codebase, et le COMPAT_MAP n'est actif que dans l'un :

```text
Chemin A (11 fichiers) — COMPAT actif ✔
  useEffectiveModules().hasModule  →  COMPAT_MAP  →  résolution legacy

Chemin B (57 fichiers) — COMPAT absent ✘
  usePermissions().hasModule  →  hasModuleGuard  →  hasAccess() (permissions engine)
  ModuleGuard component       →  hasAccess() (permissions engine)
```

**Conséquence** : `usePermissions().hasModule('support.ticketing')` retournera `false` pour un utilisateur avec uniquement `ticketing`. La double-lecture Phase 3 ne fonctionne que partiellement.

**Bonne nouvelle** : les guards ticketing en production utilisent la clé legacy `ticketing` partout — donc rien n'est cassé aujourd'hui. Mais la Phase 4 (migration des guards) échouera si on ne résout pas ce double chemin d'abord.

### Inventaire des consommateurs ticketing (prod)

| Fichier | Méthode | Clé utilisée | Compat actif |
|---|---|---|---|
| `AideTabContent.tsx` | `useEffectiveModules().hasModule` | `'ticketing'` | Oui |
| `projects.routes.tsx` (x7) | `ModuleGuard moduleKey=` | `'ticketing'` | Non (hasAccess) |
| `dashboardTiles.ts` | `requiresModule:` | `'ticketing'` | Filtré en amont |
| `sitemapData.ts` (x7) | `moduleGuard.moduleKey` | `'ticketing'` | Config statique |

Tous utilisent `'ticketing'` (legacy) — production intacte.

### Plan d'exécution — 8 étapes

---

**Étape 1 — Script de test double-lecture**

Fichier : `src/devtools/moduleCompatTest.ts`

Script pur TypeScript (pas de hook React) simulant les 3 cas demandés. Exécutable via `import` dans la console dev ou dans un composant debug. Utilise directement le COMPAT_MAP exporté et une fonction `simulateHasModule` qui reproduit la logique de résolution sans dépendre du contexte React.

Sortie console : `[ModuleCompatTest] Cas 1: PASS/FAIL` pour chaque assertion.

---

**Étape 2 — Audit des accès directs aux modules**

Scanner : `enabledModules[`, `modules[` dans les fichiers `.ts/.tsx` (hors `useEffectiveModules.ts` et `permissionsEngine.ts`).

Résultats trouvés :
- `permissionsEngine.ts` : accès direct légitime (moteur interne)
- `UserModulesTab.tsx` : accès direct pour affichage admin
- `roleMatrix.ts` : accès direct pour matrice de rôles

Rapport : `dev-reports/module-guards-audit.md`

---

**Étape 3 — Couverture COMPAT_MAP**

Vérifier que chaque clé Phase 3 dans `MODULES` a soit un mapping dans `COMPAT_MAP`, soit est `support.faq` (création pure). 36 clés fonctionnelles, 35 dans COMPAT_MAP, 1 sans (`support.faq`).

Rapport : `dev-reports/module-compat-coverage.md`

---

**Étape 4 — Modules orphelins**

Croiser `MODULES` / `COMPAT_MAP` / `module_registry` DB / guards UI pour identifier les clés présentes dans un référentiel mais absentes des autres.

Rapport : `dev-reports/module-orphans.md`

---

**Étape 5 — Test sécurité Ticketing**

Fichier : `src/devtools/ticketingAccessTest.ts`

Simulation directe vérifiant que `support.ticketing` résout via `ticketing` et que `support.guides` ne résout pas sans `guides`.

---

**Étape 6 — Test admin bypass**

Vérifier que `isAdminBypass` + toutes les nouvelles clés = `true`.

Rapport : `dev-reports/admin-bypass-test.md`

---

**Étape 7 — Plan migration Phase 4**

Fichier : `dev-reports/migration-plan-phase4.md`

Inventaire de tous les guards UI avec `current_key`, `target_key`, `risk_level`, classés par domaine (pilotage → admin, ticketing en dernier).

**Point critique signalé** : avant de migrer les guards vers les nouvelles clés, il faudra unifier les deux chemins `hasModule` (usePermissions vs useEffectiveModules) pour que le COMPAT_MAP soit actif partout. Sans cela, `ModuleGuard moduleKey="support.ticketing"` échouera.

---

**Étape 8 — Rapport final**

Fichier : `dev-reports/permissions-phase3-validation.md`

Consolidation de tous les résultats avec verdict `SAFE_FOR_PHASE4`.

Le verdict signalera le problème des deux chemins comme **bloquant** pour Phase 4.

### Fichiers créés/modifiés

| Fichier | Action |
|---|---|
| `src/devtools/moduleCompatTest.ts` | Créer |
| `src/devtools/ticketingAccessTest.ts` | Créer |
| `dev-reports/module-guards-audit.md` | Créer |
| `dev-reports/module-compat-coverage.md` | Créer |
| `dev-reports/module-orphans.md` | Créer |
| `dev-reports/admin-bypass-test.md` | Créer |
| `dev-reports/migration-plan-phase4.md` | Créer |
| `dev-reports/permissions-phase3-validation.md` | Créer |

### Ce qui ne change PAS

- Aucune RPC / edge function
- Aucune table `user_modules` / `plan_tier_modules`
- Aucun guard runtime
- Aucun écran ticketing
- Le COMPAT_MAP existant reste intact

