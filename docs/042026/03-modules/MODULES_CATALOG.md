# Catalogue des Modules OPERIA — État Actuel V1

> **Date** : 29 mars 2026
> **Source de vérité** : `src/types/modules.ts` (MODULE_DEFINITIONS, 928 lignes)
> **Registre DB** : `module_registry` (74 modules)

---

## 1. Arbre complet des modules

### Légende

- 📁 `section` — structure/navigation, jamais permissionnée directement
- 📄 `screen` — écran permissionnable
- ⚙️ `feature` — fonctionnalité permissionnable

---

### Pilotage

```
📁 pilotage (section)
├── 📄 pilotage.agence — Dashboard agence [N2+, STARTER+]
├── 📁 pilotage.statistiques (section)
│   ├── 📄 pilotage.statistiques.general [N2+, STARTER+]
│   ├── 📄 pilotage.statistiques.apporteurs [N2+, PRO]
│   ├── 📄 pilotage.statistiques.techniciens [N2+, PRO]
│   ├── 📄 pilotage.statistiques.univers [N2+, PRO]
│   ├── 📄 pilotage.statistiques.sav [N2+, PRO]
│   ├── 📄 pilotage.statistiques.previsionnel [N2+, PRO]
│   ├── 📄 pilotage.statistiques.recouvrement [N2+, PRO]
│   └── 📄 pilotage.statistiques.tresorerie [N2+, PRO]
├── 📄 pilotage.performance [N2+, STARTER+]
├── 📄 pilotage.actions [N2+, STARTER+]
├── 📄 pilotage.incoherences [N2+, STARTER+]
├── 📄 pilotage.resultat [N2+, STARTER+]
├── 📄 pilotage.recouvrement [N2+, STARTER+]
├── 📄 pilotage.tresorerie [N2+, STARTER+]
├── 📄 pilotage.parc [N2+, STARTER+] — Véhicules & EPI
├── 📄 pilotage.maps [N2+, STARTER+]
└── 📄 pilotage.rentabilite [N2+, STARTER+] — Rentabilité dossier
```

### Commercial

```
📁 commercial (section)
├── 📄 commercial.suivi_client [N1+, option agence] — Pack Suivi Client
├── 📄 commercial.comparateur [N1+, STARTER+]
├── 📄 commercial.prospects [N1+, STARTER+] — CRM prospects
├── 📄 commercial.realisations [N1+, PRO] — AVAP
├── 📄 commercial.signature [N1+, PRO / option STARTER]
└── 📄 commercial.social [N1+, STARTER+] — Social media
```

### Organisation

```
📁 organisation (section)
├── 📄 organisation.salaries [N2+, STARTER+] — RH
├── 📄 organisation.plannings [N2+, STARTER+]
├── 📄 organisation.reunions [N2+, STARTER+]
├── 📄 organisation.documents_legaux [N2+, STARTER+]
├── 📄 organisation.zones [N2+, STARTER+] — Zones déplacement
└── 📄 organisation.apporteurs [N2+, option agence] — Pack Relations
```

### Médiathèque

```
📁 mediatheque (section)
├── 📄 mediatheque.consulter [N2+, STARTER+]
├── 📄 mediatheque.documents [N2+, STARTER+]
├── 📄 mediatheque.faq [N0+, STARTER+]
├── 📄 mediatheque.exports [N2+, STARTER+]
└── 📄 mediatheque.corbeille [N2+, PRO]
```

### Support

```
📁 support (section)
├── 📄 support.guides [N0+, STARTER+] — Help! Academy
├── 📄 support.aide_en_ligne [N0+, STARTER+] — Helpi chatbot
└── 📄 support.ticketing [N0+, assignation individuelle]
```

### Franchiseur (interface de rôle N3+)

```
📁 reseau_franchiseur (interface de rôle — hors plans)
├── 📄 reseau_franchiseur.dashboard [N3+]
├── 📄 reseau_franchiseur.stats [N3+]
├── 📄 reseau_franchiseur.agences [N3+]
├── 📄 reseau_franchiseur.redevances [N4+]
└── 📄 reseau_franchiseur.comparatifs [N3+]
```

### Admin plateforme (interface de rôle N4+)

```
📁 admin_plateforme (interface de rôle — hors plans)
├── 📄 admin_plateforme.users [N5+]
├── 📄 admin_plateforme.agencies [N5+]
├── 📄 admin_plateforme.permissions [N5+]
└── 📄 admin_plateforme.faq_admin [N5+]
```

---

## 2. Matrice de distribution par plan

### Modules inclus dans les plans

| Module | STARTER | PRO |
|--------|:---:|:---:|
| `pilotage.agence` | ✅ | ✅ |
| `pilotage.statistiques.general` | ✅ | ✅ |
| `pilotage.statistiques.apporteurs` | ❌ | ✅ |
| `pilotage.statistiques.techniciens` | ❌ | ✅ |
| `pilotage.statistiques.univers` | ❌ | ✅ |
| `pilotage.statistiques.sav` | ❌ | ✅ |
| `pilotage.statistiques.previsionnel` | ❌ | ✅ |
| `pilotage.statistiques.recouvrement` | ❌ | ✅ |
| `pilotage.statistiques.tresorerie` | ❌ | ✅ |
| `pilotage.performance` | ✅ | ✅ |
| `pilotage.actions` | ✅ | ✅ |
| `pilotage.incoherences` | ✅ | ✅ |
| `pilotage.resultat` | ✅ | ✅ |
| `pilotage.recouvrement` | ✅ | ✅ |
| `pilotage.tresorerie` | ✅ | ✅ |
| `pilotage.parc` | ✅ | ✅ |
| `pilotage.maps` | ✅ | ✅ |
| `pilotage.rentabilite` | ✅ | ✅ |
| `commercial.suivi_client` | ✅ | ✅ |
| `commercial.comparateur` | ✅ | ✅ |
| `commercial.prospects` | ✅ | ✅ |
| `commercial.realisations` | ❌ | ✅ |
| `commercial.signature` | ❌ | ✅ |
| `commercial.social` | ✅ | ✅ |
| `organisation.salaries` | ✅ | ✅ |
| `organisation.plannings` | ✅ | ✅ |
| `organisation.reunions` | ✅ | ✅ |
| `organisation.documents_legaux` | ✅ | ✅ |
| `organisation.zones` | ✅ | ✅ |
| `mediatheque.consulter` | ✅ | ✅ |
| `mediatheque.documents` | ✅ | ✅ |
| `mediatheque.faq` | ✅ | ✅ |
| `mediatheque.exports` | ✅ | ✅ |
| `mediatheque.corbeille` | ❌ | ✅ |
| `support.guides` | ✅ | ✅ |
| `support.aide_en_ligne` | ✅ | ✅ |

### Modules hors plan (assignation individuelle)

| Module | Mode d'attribution |
|--------|-------------------|
| `support.ticketing` | `via_user_assignment` uniquement |

### Modules option agence

| Module | Pack |
|--------|------|
| `organisation.apporteurs` | Pack Relations |
| `commercial.suivi_client` | Pack Suivi Client (aussi via plan) |
| `commercial.signature` | Option STARTER (natif PRO) |

---

## 3. Options par module

Les modules ont des options granulaires permettant un contrôle fin :

| Module | Options |
|--------|---------|
| `ticketing` | `kanban`, `create`, `manage`, `import` |
| `prospection` | `dashboard`, `comparateur`, `prospects` |
| `organisation.salaries` | `rh_viewer`, `rh_admin` |
| `organisation.parc` | `vehicules`, `epi`, `equipements` |
| `pilotage.agence` | `indicateurs`, `actions_a_mener`, `diffusion` |
| `pilotage.statistiques` | `general`, `exports` |
| `support.aide_en_ligne` | `agent`, `user` |
| `support.guides` | `apogee`, `apporteurs`, `helpconfort`, `faq` |
| `mediatheque.documents` | `consulter`, `gerer`, `corbeille_vider` |
| `organisation.apporteurs` | `consulter`, `gerer` |
| `planning_augmente` | `suggest`, `optimize`, `admin` |
| `admin_plateforme` | `users`, `agencies`, `permissions`, `faq_admin` |
| `reseau_franchiseur` | `dashboard`, `stats`, `agences`, `redevances`, `comparatifs` |

---

## 4. Presets par poste N1

| Poste (`role_agence`) | Modules par défaut |
|----------------------|-------------------|
| **Administratif** | organisation.salaries, organisation.plannings, organisation.documents_legaux, mediatheque.consulter, mediatheque.documents, support.guides, support.aide_en_ligne |
| **Commercial** | commercial.suivi_client, commercial.comparateur, commercial.prospects, commercial.realisations, support.guides, support.aide_en_ligne |
| **Technicien** | support.guides, support.aide_en_ligne |

> ⚠️ Ces presets sont actuellement hardcodés dans `src/config/roleAgenceModulePresets.ts`. La V2 les migrera vers `job_profile_presets` en DB.
