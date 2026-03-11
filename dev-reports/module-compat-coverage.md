# COMPAT_MAP Coverage Report — Phase 3

Date: 2026-03-11

## Objectif

Vérifier que chaque clé fonctionnelle Phase 3 possède un mapping dans le COMPAT_MAP.

## Couverture

| Clé fonctionnelle | has_compat | compat_keys | option_check |
|---|---|---|---|
| `pilotage.statistiques` | ✅ | `stats` | — |
| `pilotage.statistiques.general` | ✅ | `stats` | — |
| `pilotage.statistiques.apporteurs` | ✅ | `stats` | — |
| `pilotage.statistiques.techniciens` | ✅ | `stats` | — |
| `pilotage.statistiques.univers` | ✅ | `stats` | — |
| `pilotage.statistiques.sav` | ✅ | `stats` | — |
| `pilotage.statistiques.previsionnel` | ✅ | `stats` | — |
| `pilotage.statistiques.exports` | ✅ | `stats` | `stats.exports` |
| `pilotage.performance` | ✅ | `agence` | — |
| `pilotage.actions_a_mener` | ✅ | `agence` | — |
| `pilotage.devis_acceptes` | ✅ | `agence` | — |
| `pilotage.incoherences` | ✅ | `agence` | — |
| `commercial.suivi_client` | ✅ | `prospection` | `prospection.dashboard` |
| `commercial.comparateur` | ✅ | `prospection` | `prospection.comparateur` |
| `commercial.veille` | ✅ | `prospection` | `prospection.veille` |
| `commercial.prospects` | ✅ | `prospection` | `prospection.prospects` |
| `commercial.realisations` | ✅ | `realisations` | — |
| `organisation.salaries` | ✅ | `rh` | — |
| `organisation.apporteurs` | ✅ | `divers_apporteurs` | — |
| `organisation.plannings` | ✅ | `divers_plannings` | — |
| `organisation.reunions` | ✅ | `divers_reunions` | — |
| `organisation.parc` | ✅ | `parc` | — |
| `organisation.documents_legaux` | ✅ | `divers_documents` | — |
| `mediatheque.consulter` | ✅ | `divers_documents` | `divers_documents.consulter` |
| `mediatheque.gerer` | ✅ | `divers_documents` | `divers_documents.gerer` |
| `mediatheque.corbeille` | ✅ | `divers_documents` | `divers_documents.corbeille_vider` |
| `support.aide_en_ligne` | ✅ | `aide` | — |
| `support.guides` | ✅ | `guides` | — |
| `support.ticketing` | ✅ | `ticketing` | — |
| `support.faq` | ❌ | — | — |
| `admin.gestion` | ✅ | `admin_plateforme` | — |
| `admin.franchiseur` | ✅ | `reseau_franchiseur` | — |
| `admin.ia` | ✅ | `admin_plateforme` | — |
| `admin.contenu` | ✅ | `admin_plateforme` | — |
| `admin.ops` | ✅ | `admin_plateforme` | — |
| `admin.plateforme` | ✅ | `admin_plateforme` | — |

## Résumé

| Métrique | Valeur |
|---|---|
| Total clés fonctionnelles | 36 |
| Avec compat | 35 |
| Sans compat (création pure) | 1 (`support.faq`) |
| **Couverture** | **97.2%** |

## Note sur `support.faq`

`support.faq` est une création pure Phase 3 — il n'existe aucun module legacy correspondant. Ce module nécessitera une entrée native dans `user_modules` / `plan_tier_modules` lors de la Phase 4. Pas de compat nécessaire.
