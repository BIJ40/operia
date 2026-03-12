# Phase 9d — Admin Taxonomy Cleanup Report

## Date: 2026-03-12

## 1. Incohérences trouvées

Le `module_registry` contient **deux hiérarchies parallèles** au niveau racine :

| Type | Clés | Problème |
|------|------|----------|
| Hiérarchiques (nouveaux) | `pilotage`, `commercial`, `organisation`, `mediatheque`, `support`, `admin` | Correctement classifiés |
| Legacy (anciens) | `stats`, `agence`, `rh`, `salaries`, `parc`, `outils`, `prospection`, `realisations`, `documents`, `guides`, `aide`, `ticketing`, `divers_*`, `admin_plateforme`, `reseau_franchiseur` | Tombaient dans "Legacy / non classé" |

### Problèmes spécifiques
- `stats` et `agence` = domaine Pilotage, mais non capturés → section Legacy
- `rh`, `salaries`, `parc`, `outils`, `divers_*` = domaine Organisation, non capturés
- `documents` (legacy) vs `mediatheque.documents` (nouveau) = même domaine, séparés
- `guides`, `aide` = domaine Support, non capturés
- Labels legacy incohérents (ex: "Ressources humaines" au lieu de "Salariés")

## 2. Avant / Après

### Avant
- `RIGHTS_CATEGORIES` couvrait ~15 moduleKeys
- ~9 racines legacy dans "non classé"
- Labels non normalisés

### Après
- `RIGHTS_CATEGORIES` couvre ~30 moduleKeys (toutes racines legacy incluses)
- Section "non classé" vide (sauf orphelins réels)
- Labels normalisés via `NAVIGATION_LABEL_FALLBACKS` étendu
- `LEGACY_LABELS` étendu pour détecter les anciens noms

## 3. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/views/rightsTaxonomy.ts` | `moduleKeys` étendus + fallbacks labels + legacy labels |
| `dev-reports/admin-taxonomy-cleanup-report.md` | Ce rapport |

## 4. Confirmation : aucune clé runtime modifiée

- ✅ Aucune clé fonctionnelle (`key`) modifiée
- ✅ Aucune RPC modifiée
- ✅ Aucune table modifiée
- ✅ Aucun guard runtime modifié
- ✅ Moteur de permissions intact
- ✅ `useModuleRegistry` intact
- ✅ `useEffectiveModules` intact

## 5. Statut final

**✅ Taxonomie admin cohérente** — Toutes les entrées du registre sont désormais classifiées dans les 6 domaines métier (Pilotage, Commercial, Organisation, Documents, Support, Admin).
