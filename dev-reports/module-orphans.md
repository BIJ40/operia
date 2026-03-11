# Module Orphans Report — Phase 3

Date: 2026-03-11

## Objectif

Identifier les modules présents dans un référentiel mais absents des autres.

## Analyse croisée

### Clés legacy en production (user_modules / plan_tier_modules)

| Clé legacy | Dans COMPAT_MAP | Utilisée en guard UI | Statut |
|---|---|---|---|
| `ticketing` | ✅ (via `support.ticketing`) | ✅ `ModuleGuard` | OK |
| `agence` | ✅ (via `pilotage.*`) | ✅ `ModuleGuard` | OK |
| `rh` | ✅ (via `organisation.salaries`) | ✅ `ModuleGuard` | OK |
| `guides` | ✅ (via `support.guides`) | ✅ `ModuleGuard` | OK |
| `realisations` | ✅ (via `commercial.realisations`) | ✅ `ModuleGuard` | OK |
| `prospection` | ✅ (via `commercial.*`) | ✅ option checks | OK |
| `stats` | ✅ (via `pilotage.statistiques.*`) | Tabs check | OK |
| `aide` | ✅ (via `support.aide_en_ligne`) | Tabs check | OK |
| `parc` | ✅ (via `organisation.parc`) | Tabs check | OK |
| `divers_apporteurs` | ✅ (via `organisation.apporteurs`) | Tabs check | OK |
| `divers_plannings` | ✅ (via `organisation.plannings`) | Tabs check | OK |
| `divers_reunions` | ✅ (via `organisation.reunions`) | Tabs check | OK |
| `divers_documents` | ✅ (via `organisation.documents_legaux`, `mediatheque.*`) | Tabs check | OK |
| `admin_plateforme` | ✅ (via `admin.*`) | Tabs check | OK |
| `reseau_franchiseur` | ✅ (via `admin.franchiseur`) | Tabs check | OK |

### Clés fonctionnelles Phase 3 sans implémentation backend

| Clé Phase 3 | Compat | Backend native | Statut |
|---|---|---|---|
| `support.faq` | ❌ | ❌ | ⚠️ Orphelin — à créer en Phase 4 |

### Modules potentiellement non référencés

| Module | Présent dans | Absent de | Risque |
|---|---|---|---|
| `helpconfort` | `hasAccessToScope` | COMPAT_MAP, routes | Faible — scope legacy |
| `guide_apogee` | `hasAccessToScope` | COMPAT_MAP | Faible — scope legacy |
| `help_academy` | `enabledModulesV2.md` | COMPAT_MAP | Faible — conteneur UI |
| `pilotage_agence` | `enabledModulesV2.md` | COMPAT_MAP | Faible — alias de `agence` |
| `support` (module container) | `enabledModulesV2.md` | COMPAT_MAP | Faible — conteneur |

## Conclusion

- **0 orphelin critique** en production
- **1 clé Phase 3 orpheline** (`support.faq`) — attendue, création pure
- **5 clés legacy** non référencées dans COMPAT_MAP mais utilisées uniquement via `hasAccessToScope` ou comme conteneurs UI → pas de risque immédiat
