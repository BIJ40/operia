

# Phase 10 — Déduplication complète : cleanup code + base de données

## Diagnostic confirmé

Le bug persiste car **l'onglet Statistiques dans PilotageTabContent vérifie `pilotage.dashboard` (PRO)** au lieu de `pilotage.statistiques` (STARTER).

Preuve RPC pour Clémence (STARTER) :
```text
✅ pilotage.statistiques         → enabled (STARTER)
✅ pilotage.statistiques.general → enabled (STARTER)
❌ pilotage.dashboard            → NON RETOURNÉ (PRO uniquement)
```

Fichier `PilotageTabContent.tsx` ligne 28 :
```typescript
requiresModule: 'pilotage.dashboard'  // ← PRO → FALSE pour STARTER
```

De plus, `pilotage.dashboard` et `pilotage.statistiques` sont deux clés distinctes dans `module_registry` avec des plans différents (PRO vs STARTER). Ce sont exactement les doublons qui créent l'incohérence.

---

## Plan en 3 phases

### Phase A — Fix code : 6 fichiers

| Fichier | Avant | Après |
|---|---|---|
| `PilotageTabContent.tsx:28` | `requiresModule: 'pilotage.dashboard'` | `requiresModule: 'pilotage.statistiques'` |
| `UnifiedWorkspace.tsx:109` | `module: 'pilotage.dashboard'` | `module: 'pilotage.statistiques'` |
| `navigationStructure.ts:61` | `moduleKey: 'pilotage.dashboard'` | `moduleKey: 'pilotage.statistiques'` |
| `sitemapData.ts:254` | `moduleKey: 'pilotage.dashboard'` | `moduleKey: 'pilotage.statistiques'` |
| `PreloadTipsCarousel.tsx:59` | `hasModuleOption('pilotage.dashboard', 'stats_hub')` | `hasModule('pilotage.statistiques')` |
| `rightsTaxonomy.ts:17` | inclut `'pilotage.dashboard'` et `'stats'` | remplacer par `'pilotage.statistiques'` |

### Phase B — Suppression des clés legacy en base de données

**Tables impactées** : `module_registry`, `plan_tier_modules`

Clés root legacy à supprimer de `module_registry` (14 racines orphelines + leurs enfants) :

| Clé legacy | Doublon de (clé canonique) |
|---|---|
| `agence` | `pilotage.agence` |
| `stats` + `stats.*` (8 clés) | `pilotage.statistiques.*` |
| `pilotage.dashboard` | `pilotage.statistiques` |
| `divers_apporteurs` | `organisation.apporteurs` |
| `divers_plannings` | `organisation.plannings` |
| `divers_reunions` | `organisation.reunions` |
| `divers_documents` | `mediatheque.documents` |
| `parc` | `organisation.parc` |
| `rh` | `organisation.salaries` |
| `salaries` | `organisation.salaries` |
| `realisations` | `commercial.realisations` |
| `documents` | `mediatheque` |
| `guides` + enfants | `support.guides` |
| `aide` | `support.aide_en_ligne` |
| `outils` + enfants | répartis dans organisation/commercial |

Également supprimer les lignes correspondantes dans `plan_tier_modules`.

**Sécurité** : aucune FK entre ces tables, pas de risque d'échec cascade. Les `user_modules` sur clés legacy sont gérés par le dual-key mapping existant (pas de suppression user_modules dans cette phase — le mapping continue de fonctionner en lecture).

### Phase C — Nettoyage code des références legacy

| Fichier | Changement |
|---|---|
| `rightsTaxonomy.ts` | Retirer les clés legacy des `moduleKeys` arrays |
| `ModulesMasterView.tsx` | Retirer `MODULE_ROUTES` pour les clés legacy supprimées |
| `shared-constants.ts` | Retirer les clés legacy de `SHARED_MODULE_KEYS` et `SHARED_MODULE_MIN_ROLES` |
| `types/modules.ts` | Retirer les clés legacy de `MODULES` et `EnabledModules` |
| `constants.ts` | Retirer les clés legacy de `AGENCY_REQUIRED_MODULES` |

**Rapport** : `dev-reports/phase10-deduplication-report.md`

---

## Vérification attendue

| Profil | Plan | Pilotage visible ? | Statistiques visible ? |
|---|---|---|---|
| Clémence (N2) | STARTER | OUI | OUI (via `pilotage.statistiques`) |
| User PRO (N2) | PRO | OUI | OUI + sous-onglets PRO |
| N5+ | any | OUI (bypass) | OUI (bypass) |

## Contraintes respectées
- Zero changement de RPC
- Zero perte de données user_modules (dual-key mapping préservé)
- Zero changement UX visible (les mêmes écrans s'affichent)

