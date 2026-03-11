

## Plan: Générer `dev-reports/phase4-migration-plan.md`

Document de pilotage uniquement, aucune modification de code source.

### Contenu du livrable

Le fichier contiendra 6 sections construites à partir de l'inventaire existant et du COMPAT_MAP :

**1. Regroupement par clé legacy** — 15 clés, avec occurrences, fichiers, types d'usage.

**2. Mapping legacy → nouvelle clé** — Basé sur le COMPAT_MAP actuel. Cas multi-cibles signalés explicitement (`agence` → 4 cibles pilotage + usage organisation/divers, `admin_plateforme` → 5 sous-clés admin, `prospection` → 4 sous-clés avec options).

**3. Classement par risque** :
- Faible : `divers_*`, `parc`, `realisations`, `aide`
- Moyen : `guides`, `stats`, `rh`
- Élevé : `agence`, `admin_plateforme`, `reseau_franchiseur`, `prospection`
- Critique : `ticketing`

**4. Ordre de migration en 4 vagues** :
- V1 : clés simples 1:1 (divers_*, parc, realisations, aide)
- V2 : clés avec options (guides, stats, rh)
- V3 : clés multi-cibles (agence, prospection, admin_plateforme, reseau_franchiseur)
- V4 : ticketing (dernier, sous conditions strictes)

**5. Cas bloquants / arbitrages** :
- `agence` : 1 clé legacy → 4+ cibles, usage croisé organisation/divers
- `prospection` : mapping dépendant des options
- `admin_plateforme` : éclatement non 1:1 vers 5 sous-sections
- `organisation.documents_legaux` : clé pure Phase 4 sans legacy

**6. Premier lot exécutable** : fichiers/occurrences migrables immédiatement (V1), ticketing exclu.

### Méthode

Lecture seule de l'inventaire + COMPAT_MAP, croisement, production du document markdown.

