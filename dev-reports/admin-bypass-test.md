# Admin Bypass Test Report — Phase 3

Date: 2026-03-11

## Objectif

Vérifier que `platform_admin` / `superadmin` (N5+) passent à travers tous les checks de modules, y compris les nouvelles clés fonctionnelles.

## Mécanisme

Dans `useEffectiveModules.ts` ligne 173 :
```typescript
const isAdminBypass = effectiveAuth.realGlobalRole === 'platform_admin' 
                   || effectiveAuth.realGlobalRole === 'superadmin';

const hasModule = (moduleKey: ModuleKey): boolean => {
  if (isAdminBypass) return true;  // ← bypass avant toute vérification
  ...
};
```

Le bypass est appliqué **avant** la résolution COMPAT_MAP — donc toutes les clés (legacy et Phase 3) retournent `true`.

## Résultats de test

| Clé testée | `platform_admin` | `superadmin` |
|---|---|---|
| `ticketing` | ✅ true | ✅ true |
| `support.ticketing` | ✅ true | ✅ true |
| `support.guides` | ✅ true | ✅ true |
| `support.faq` | ✅ true | ✅ true |
| `pilotage.performance` | ✅ true | ✅ true |
| `pilotage.statistiques` | ✅ true | ✅ true |
| `commercial.suivi_client` | ✅ true | ✅ true |
| `commercial.comparateur` | ✅ true | ✅ true |
| `organisation.salaries` | ✅ true | ✅ true |
| `mediatheque.consulter` | ✅ true | ✅ true |
| `admin.gestion` | ✅ true | ✅ true |
| `admin.franchiseur` | ✅ true | ✅ true |
| `admin.ia` | ✅ true | ✅ true |
| `admin.ops` | ✅ true | ✅ true |
| (toute clé arbitraire) | ✅ true | ✅ true |

## Chemin B — ModuleGuard / permissionsEngine

Le bypass admin dans `ModuleGuard` passe par `hasAccess()` du permissions engine, qui vérifie `isBypassRole()` :

```typescript
// permissionsEngine.ts
export const BYPASS_ROLES: GlobalRole[] = ['platform_admin', 'superadmin'];
```

Ce chemin bypass également correctement pour les rôles N5+.

## Conclusion

| Chemin | Bypass admin | Statut |
|---|---|---|
| Chemin A (`useEffectiveModules`) | `isAdminBypass` flag | ✅ OK |
| Chemin B (`ModuleGuard` / `hasAccess`) | `isBypassRole()` | ✅ OK |

**Admin bypass : PASS ✅**
