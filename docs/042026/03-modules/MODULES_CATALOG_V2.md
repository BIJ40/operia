# Catalogue des Modules — V2

> **Date** : 28 mars 2026  
> **Source de vérité cible** : table `module_catalog` (DB)  
> **74 modules** répartis en sections, screens et features

---

## Arbre des modules

### Légende

- 📁 `section` — structure/navigation, jamais permissionnée
- 📄 `screen` — écran permissionnable
- ⚙️ `feature` — fonctionnalité permissionnable

### Pilotage

```
📁 pilotage (section)
  📄 pilotage.agence (screen) — Dashboard agence
  📁 pilotage.statistiques (section)
    📄 pilotage.statistiques.general (screen)
    📄 pilotage.statistiques.apporteurs (screen) — PRO only
    📄 pilotage.statistiques.techniciens (screen) — PRO only
    📄 pilotage.statistiques.univers (screen) — PRO only
    📄 pilotage.statistiques.sav (screen) — PRO only
    📄 pilotage.statistiques.previsionnel (screen) — PRO only
    📄 pilotage.statistiques.recouvrement (screen) — PRO only
    📄 pilotage.statistiques.tresorerie (screen) — PRO only
  📄 pilotage.performance (screen)
  📄 pilotage.actions (screen)
  📄 pilotage.incoherences (screen)
  📄 pilotage.resultat (screen)
  📄 pilotage.recouvrement (screen)
  📄 pilotage.tresorerie (screen)
  📄 pilotage.parc (screen) — Véhicules & EPI
  📄 pilotage.maps (screen)
  📄 pilotage.rentabilite (screen) — Rentabilité dossier
```

### Commercial

```
📁 commercial (section)
  📄 commercial.suivi_client (screen) — Option agence, Stripe
  📄 commercial.comparateur (screen)
  📄 commercial.prospects (screen)
  📄 commercial.realisations (screen) — PRO only
  📄 commercial.signature (screen) — PRO natif, option STARTER
  📄 commercial.social (screen)
```

### Organisation

```
📁 organisation (section)
  📄 organisation.salaries (screen)
  📄 organisation.plannings (screen)
  📄 organisation.reunions (screen)
  📄 organisation.documents_legaux (screen)
  📄 organisation.zones (screen)
  📄 organisation.apporteurs (screen) — Option agence (pack Relations), Stripe
```

### Médiathèque

```
📁 mediatheque (section)
  📄 mediatheque.consulter (screen)
  📄 mediatheque.documents (screen)
  📄 mediatheque.faq (screen)
  📄 mediatheque.exports (screen)
  📄 mediatheque.corbeille (screen) — PRO only
```

### Support

```
📁 support (section)
  📄 support.guides (screen) — Help! Academy
  📄 support.aide_en_ligne (screen) — Helpi chatbot
  📄 support.ticketing (screen) — Assignation utilisateur uniquement
```

### Franchiseur (interface de rôle N3+)

```
📁 franchiseur (section — interface de rôle, hors plans)
  📄 franchiseur.dashboard (screen) — N3+
  📄 franchiseur.agences (screen) — N3+
  📄 franchiseur.redevances (screen) — N4+
  📄 franchiseur.kpi (screen) — N3+
```

### Admin plateforme (interface de rôle N4+)

```
📁 admin (section — interface de rôle, hors plans)
  📄 admin.utilisateurs (screen) — N4+
  📄 admin.agences (screen) — N4+
  📄 admin.permissions (screen) — N4+
  📄 admin.offres (screen) — N4+
```

---

## Matrice de distribution

### Modules `via_plan` (inclus dans les plans)

| Module | STARTER | PRO |
|--------|:---:|:---:|
| `pilotage.agence` | ✅ full | ✅ full |
| `pilotage.statistiques.general` | ✅ full | ✅ full |
| `pilotage.statistiques.apporteurs` | ❌ none | ✅ full |
| `pilotage.statistiques.techniciens` | ❌ none | ✅ full |
| `pilotage.statistiques.univers` | ❌ none | ✅ full |
| `pilotage.statistiques.sav` | ❌ none | ✅ full |
| `pilotage.statistiques.previsionnel` | ❌ none | ✅ full |
| `pilotage.statistiques.recouvrement` | ❌ none | ✅ full |
| `pilotage.statistiques.tresorerie` | ❌ none | ✅ full |
| `pilotage.performance` | ✅ full | ✅ full |
| `pilotage.actions` | ✅ full | ✅ full |
| `pilotage.incoherences` | ✅ full | ✅ full |
| `pilotage.resultat` | ✅ full | ✅ full |
| `pilotage.recouvrement` | ✅ full | ✅ full |
| `pilotage.tresorerie` | ✅ full | ✅ full |
| `pilotage.parc` | ✅ full | ✅ full |
| `pilotage.maps` | ✅ full | ✅ full |
| `pilotage.rentabilite` | ✅ full | ✅ full |
| `commercial.comparateur` | ✅ full | ✅ full |
| `commercial.prospects` | ✅ full | ✅ full |
| `commercial.realisations` | ❌ none | ✅ full |
| `commercial.signature` | ❌ none | ✅ full |
| `commercial.social` | ✅ full | ✅ full |
| `organisation.salaries` | ✅ full | ✅ full |
| `organisation.plannings` | ✅ full | ✅ full |
| `organisation.reunions` | ✅ full | ✅ full |
| `organisation.documents_legaux` | ✅ full | ✅ full |
| `organisation.zones` | ✅ full | ✅ full |
| `mediatheque.consulter` | ✅ full | ✅ full |
| `mediatheque.documents` | ✅ full | ✅ full |
| `mediatheque.faq` | ✅ full | ✅ full |
| `mediatheque.exports` | ✅ full | ✅ full |
| `mediatheque.corbeille` | ❌ none | ✅ full |
| `support.guides` | ✅ full | ✅ full |
| `support.aide_en_ligne` | ✅ full | ✅ full |

### Modules `via_agency_option`

| Module | Stripe vendable | Pack |
|--------|:-:|---|
| `commercial.suivi_client` | ✅ | Pack Suivi Client |
| `commercial.signature` | ✅ | Option signature (STARTER) |
| `organisation.apporteurs` | ✅ | Pack Relations |

### Modules `via_user_assignment`

| Module | Stripe vendable | Assignable par |
|--------|:-:|---|
| `support.ticketing` | ❌ | `both` (N2+ ou N4+) |
| `support.guides` | ❌ | `agency_admin` (N2+) |

---

## Presets par poste (N1)

| Poste | Modules par défaut |
|-------|-------------------|
| **Administratif** | organisation.salaries, organisation.plannings, organisation.documents_legaux, mediatheque.consulter, mediatheque.documents, support.guides, support.aide_en_ligne |
| **Commercial** | commercial.suivi_client, commercial.comparateur, commercial.prospects, commercial.realisations, support.guides, support.aide_en_ligne |
| **Technicien** | support.guides, support.aide_en_ligne |

---

## Préconditions par module

| Module | Préconditions |
|--------|--------------|
| `commercial.suivi_client` | `[{"type":"agency_required"}, {"type":"data_source","key":"agency_suivi_settings"}]` |
| `organisation.apporteurs` | `[{"type":"agency_required"}, {"type":"pack_enabled","key":"relations"}]` |
| Tous les modules pilotage/commercial/organisation | `[{"type":"agency_required"}]` |
| `support.guides`, `support.aide_en_ligne` | `[]` (aucun prérequis) |
| `support.ticketing` | `[]` (aucun prérequis) |
