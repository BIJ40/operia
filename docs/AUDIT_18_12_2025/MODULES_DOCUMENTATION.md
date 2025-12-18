# Documentation Complète des Modules HelpConfort

> **Version**: 2.2 – Mise à jour : 18 Décembre 2025  
> **Source de vérité**: `src/types/modules.ts`  
> **Release** : v0.8.1+ "Pointages & Timesheets"

---

## 📋 Table des matières

1. [Help! Academy](#1-help-academy)
2. [Pilotage Agence](#2-pilotage-agence)
3. [Réseau Franchiseur](#3-réseau-franchiseur)
4. [Support](#4-support)
5. [Administration Plateforme](#5-administration-plateforme)
6. [Suivi Dev (Gestion de Projet)](#6-suivi-dev-gestion-de-projet)
7. [RH (Ressources Humaines)](#7-rh-ressources-humaines)
8. [Parc](#8-parc)
9. [Messagerie Interne](#9-messagerie-interne)
10. [Recherche Unifiée](#10-recherche-unifiée)
11. [Fonctionnalités Transverses (hors modules)](#11-fonctionnalités-transverses-hors-modules)

---

## 1. Help! Academy

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `help_academy` |
| **Icône** | `BookOpen` |
| **Rôle minimum** | `base_user` (N0) |
| **Rôles par défaut** | N1, N2, N3, N4, N5, N6 |

### Description
Centre de formation et de documentation pour tous les utilisateurs de la plateforme. Regroupe les guides métier, les procédures et la documentation des prescripteurs.

### Utilisation
- Consultation des guides Apogée (logiciel métier)
- Accès aux procédures HelpConfort
- Documentation des apporteurs/prescripteurs
- Mode édition pour les rédacteurs autorisés

### Particularités
- Système de favoris intégré
- Recherche sémantique avec IA (Helpi)
- Support multi-contextes (Apogée, HelpConfort, Apporteurs)
- Gestion des versions de contenu

### Sous-modules

#### 📘 apogee
| Propriété | Valeur |
|-----------|--------|
| **Description** | Guide du logiciel Apogée |
| **Routes** | `/academy/apogee`, `/academy/apogee/category/:slug` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Tous les utilisateurs avec le module Help Academy |

Contenu: Documentation complète du logiciel métier Apogée, organisée par catégories et sous-catégories avec contenu riche (texte, images, vidéos).

#### 📗 helpconfort
| Propriété | Valeur |
|-----------|--------|
| **Description** | Guide des procédures HelpConfort |
| **Routes** | `/academy/hc-base`, `/academy/hc-base/category/:slug` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | Utilisateurs avec option activée manuellement |

Contenu: Base documentaire des procédures et bonnes pratiques du réseau HelpConfort.

#### 📙 apporteurs
| Propriété | Valeur |
|-----------|--------|
| **Description** | Guide des prescripteurs |
| **Routes** | `/academy/apporteurs`, `/academy/apporteurs/category/:slug/sub/:subslug` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Tous les utilisateurs avec le module Help Academy |

Contenu: Documentation spécifique à chaque apporteur/prescripteur (assurances, bailleurs, etc.), procédures de traitement par type de sinistre.

#### ✏️ edition
| Propriété | Valeur |
|-----------|--------|
| **Description** | Mode édition des guides |
| **Routes** | - (modification inline) |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | **Attribution individuelle uniquement** (N5/N6 ou rédacteurs désignés) |

⚠️ **Option sensible** - Non disponible dans les plans, attribution manuelle par administrateur uniquement.

---

## 2. Pilotage Agence

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `pilotage_agence` |
| **Icône** | `BarChart3` |
| **Rôle minimum** | `franchisee_user` (N1) |
| **Rôles par défaut** | N2, N5, N6 |

### Description
Tableau de bord analytique pour le pilotage opérationnel d'une agence. Centralise les KPIs, statistiques et outils de suivi pour les dirigeants et responsables d'agence.

### Utilisation
- Visualisation des indicateurs clés (CA, SAV, délais, etc.)
- Suivi des apporteurs et techniciens
- Analyse des univers métier
- Planification et actions prioritaires
- Affichage sur écran de diffusion

### Particularités
- Connexion temps réel à l'API Apogée
- Calculs StatIA centralisés
- Filtres par période dynamiques
- Exports CSV/Excel

### Sous-modules

#### 📊 indicateurs (Vue d'ensemble)
| Propriété | Valeur |
|-----------|--------|
| **Description** | Page d'accueil avec KPIs principaux |
| **Routes** | `/hc-agency`, `/hc-agency/indicateurs` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Dashboard principal avec vue synthétique : CA mensuel, taux SAV, panier moyen, délai 1er devis.

#### 📈 stats_hub
| Propriété | Valeur |
|-----------|--------|
| **Description** | Tableaux de bord avancés |
| **Routes** | `/hc-agency/stats-hub` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N2+ avec option activée |

Hub statistiques complet avec 5 onglets : Général, Apporteurs, Techniciens, Univers, SAV. Inclut graphiques, matrices et KPIs détaillés (42 indicateurs).

#### 🔍 veille_apporteurs
| Propriété | Valeur |
|-----------|--------|
| **Description** | Surveillance des apporteurs |
| **Routes** | `/hc-agency/veille-apporteurs` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N2+ avec option activée |

Détection automatique des apporteurs dormants, en déclin ou sous-seuil. Analyse des tendances CA par prescripteur.

#### ✅ actions_a_mener
| Propriété | Valeur |
|-----------|--------|
| **Description** | Liste des actions prioritaires |
| **Routes** | `/hc-agency/actions`, `/hc-agency/actions/category/:slug` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Gestion des tâches opérationnelles : dossiers à facturer, devis à relancer, interventions à planifier.

#### 📺 diffusion
| Propriété | Valeur |
|-----------|--------|
| **Description** | Affichage sur écran TV |
| **Routes** | `/hc-agency/statistiques/diffusion` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Mode présentation pour affichage sur écran collectif : rotation automatique des slides, KPIs en temps réel.

#### 📤 exports
| Propriété | Valeur |
|-----------|--------|
| **Description** | Export des données |
| **Routes** | `/hc-agency/exports` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N2+ avec option activée |

Génération de rapports et exports de données statistiques.

---

## 3. Réseau Franchiseur

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `reseau_franchiseur` |
| **Icône** | `Network` |
| **Rôle minimum** | `franchisor_user` (N3) |
| **Rôles par défaut** | N3, N4, N5, N6 |

### Description
Vision multi-agences pour la tête de réseau. Permet la supervision, le pilotage consolidé et la gestion du réseau de franchises.

### Utilisation
- Consolidation des KPIs réseau
- Comparaison inter-agences
- Gestion des animateurs et directeurs
- Suivi des redevances
- Administration des agences

### Particularités
- Filtres multi-agences persistants
- Calculs consolidés en parallèle (15 agences simultanées)
- Données anonymisées selon RGPD pour certaines vues
- Scope limité par assignments (N3)

### Sous-modules

#### 🏠 dashboard
| Propriété | Valeur |
|-----------|--------|
| **Description** | Vue d'ensemble réseau |
| **Routes** | `/hc-reseau`, `/hc-reseau/dashboard` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N3+ avec module activé |

Dashboard principal réseau avec KPIs consolidés, alertes et synthèse.

#### 📊 stats
| Propriété | Valeur |
|-----------|--------|
| **Description** | KPIs consolidés réseau |
| **Routes** | `/hc-reseau/tableaux` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N3+ avec module activé |

Tableaux statistiques multi-agences avec graphiques et tendances.

#### 🏢 agences
| Propriété | Valeur |
|-----------|--------|
| **Description** | Fiches et paramètres agences |
| **Routes** | `/hc-reseau/agences`, `/hc-reseau/agences/:agencyId` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N3+ avec module activé |

Liste des agences avec fiches détaillées : informations, configuration, abonnement, animateurs assignés.

#### 💰 redevances
| Propriété | Valeur |
|-----------|--------|
| **Description** | Calcul et suivi des redevances |
| **Routes** | `/hc-reseau/redevances` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N4+ avec option activée |

Système de calcul des redevances par tranches progressives. Historique des versements et projections.

#### ⚖️ comparatifs
| Propriété | Valeur |
|-----------|--------|
| **Description** | Comparaison inter-agences |
| **Routes** | `/hc-reseau/comparatif`, `/hc-reseau/periodes` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N3+ avec module activé |

Tableau comparatif de 15 KPIs par agence. Benchmarking et identification des performances.

---

## 4. Support

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `support` |
| **Icône** | `MessageSquare` |
| **Rôle minimum** | `base_user` (N0) |
| **Rôles par défaut** | N1, N2, N3, N4, N5, N6 |

### Description
Système de support unifié permettant la création de tickets, le chat avec l'IA Helpi et l'accès au centre d'aide.

### Utilisation
- Création et suivi de tickets d'assistance
- Chat intelligent avec Helpi (RAG)
- Consultation de la FAQ
- Support live avec agents (si disponible)

### Particularités
- Tickets accessibles à TOUS les utilisateurs authentifiés (droit fondamental)
- Console support réservée aux agents désignés
- Escalade automatique selon SLA
- Chat live avec notification SMS aux agents

### Sous-modules

#### 🎫 user
| Propriété | Valeur |
|-----------|--------|
| **Description** | Créer et suivre ses propres tickets |
| **Routes** | `/support`, `/support/mes-demandes` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Tous les utilisateurs authentifiés |

Interface utilisateur pour soumettre des demandes d'assistance et suivre leur traitement.

#### 👨‍💻 agent
| Propriété | Valeur |
|-----------|--------|
| **Description** | Répondre aux tickets des utilisateurs |
| **Routes** | `/support/console`, `/admin/support` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | **Attribution individuelle uniquement** (agents support désignés) |

⚠️ **Option sensible** - Non disponible dans les plans. Console support avec vue Kanban, réponses, escalades. Requiert support_role = 'agent' en base.

#### 🛡️ admin
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gérer l'équipe et les escalades |
| **Routes** | `/admin/support/team`, `/admin/support/settings` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | **Attribution individuelle uniquement** (responsables support) |

⚠️ **Option sensible** - Gestion de l'équipe support, configuration des SLA, statistiques support.

---

## 5. Administration Plateforme

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `admin_plateforme` |
| **Icône** | `Settings` |
| **Rôle minimum** | `platform_admin` (N5) |
| **Rôles par défaut** | N5, N6 |

### Description
Console d'administration centrale de la plateforme. Accès réservé aux administrateurs techniques et superadmins.

### Utilisation
- Gestion des utilisateurs
- Configuration des agences
- Gestion des droits et permissions
- Sauvegardes et maintenance
- Monitoring système

### Particularités
- Accès strictement réservé N5/N6
- Audit de toutes les actions
- Possibilité d'impersonation
- Export base de données complet

### Sous-modules

#### 👥 users
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion des comptes utilisateurs |
| **Routes** | `/admin/utilisateurs`, `/admin/users` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N5+ |

Création, modification, désactivation des comptes. Reset de mot de passe. Impersonation.

#### 🏢 agencies
| Propriété | Valeur |
|-----------|--------|
| **Description** | Configuration des agences |
| **Routes** | `/admin/agences`, `/admin/agencies/:agencyId` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N5+ |

Paramétrage des agences : informations, abonnements, modules activés, animateurs.

#### 🔐 permissions
| Propriété | Valeur |
|-----------|--------|
| **Description** | Rôles et droits d'accès |
| **Routes** | `/admin/droits`, `/admin/permissions-center` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ (scope variable selon niveau) |

Console Droits & Accès avec 4 onglets : Utilisateurs, Souscriptions, Plans, Historique.

#### 💾 backup
| Propriété | Valeur |
|-----------|--------|
| **Description** | Import/export de données |
| **Routes** | `/admin/backup`, `/admin/helpconfort-backup`, `/admin/cache-backup` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N5+ |

Sauvegardes des guides, cache, export base de données complète (6 parties).

#### 📋 logs
| Propriété | Valeur |
|-----------|--------|
| **Description** | Journaux d'activité |
| **Routes** | `/admin/user-activity`, `/admin/system-health` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N5+ avec option activée |

Suivi d'activité utilisateurs, santé système, intégration Sentry.

#### ❓ faq_admin
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion de la FAQ |
| **Routes** | `/admin/faq` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N5+ avec option activée |

Administration complète de la FAQ : création, édition, catégorisation, import/export.

---

## 6. Suivi Dev (Gestion de Projet)

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `apogee_tickets` |
| **Icône** | `Kanban` |
| **Rôle minimum** | `base_user` (N0) |
| **Rôles par défaut** | N5, N6 |

### Description
Système de suivi du développement du logiciel Apogée. Gestion des tickets, Kanban, et workflow de validation.

### Utilisation
- Création et suivi de tickets de développement
- Visualisation Kanban des états
- Qualification et estimation
- Gestion des doublons

### Particularités
- Workflow avec transitions par rôle (developer/tester/franchiseur)
- Système de heat priority
- Classification automatique par IA
- Historique complet des modifications

### Sous-modules

#### 📋 kanban
| Propriété | Valeur |
|-----------|--------|
| **Description** | Tableau Kanban des tickets |
| **Routes** | `/projects`, `/projects/kanban`, `/projects/list` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Utilisateurs avec module activé |

Vue Kanban avec colonnes par statut, drag & drop, filtres avancés.

#### 📥 import
| Propriété | Valeur |
|-----------|--------|
| **Description** | Import depuis fichiers Excel |
| **Routes** | `/projects/import` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Utilisateurs avec option activée |

Import en masse de tickets depuis fichiers Excel avec mapping automatique.

#### ⚙️ manage
| Propriété | Valeur |
|-----------|--------|
| **Description** | Créer et gérer les tickets |
| **Routes** | `/projects/review`, `/projects/permissions`, `/projects/doublons` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | Utilisateurs avec option activée |

Gestion complète : création, édition, qualification, gestion des doublons.

---

## 7. RH (Ressources Humaines)

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `rh` |
| **Icône** | `Briefcase` |
| **Rôle minimum** | `base_user` (N0) |
| **Rôles par défaut** | N1, N2, N5, N6 |

### Description
Module de gestion des ressources humaines avec accès différencié selon le profil : coffre-fort personnel pour les collaborateurs, gestion opérationnelle pour les managers.

### Utilisation
- Coffre-fort numérique (bulletins de paie, contrats)
- Gestion des demandes RH
- Administration des collaborateurs
- Suivi des contrats et salaires

### Particularités
- Données sensibles chiffrées (RGPD)
- Fusion automatique User ↔ Collaborator
- Documents classés par catégories
- Workflow de demandes avec validation

### Sous-modules

#### 🔒 coffre
| Propriété | Valeur |
|-----------|--------|
| **Description** | Accès à ses propres documents RH |
| **Routes** | `/rh/coffre`, `/rh/demande` |
| **Activé par défaut** | ❌ Non (N1) / ✅ Oui si rôle approprié |
| **Qui a accès** | Tous les collaborateurs avec option activée |

Coffre-fort numérique personnel : bulletins de paie, contrats, attestations. Possibilité de faire des demandes RH.

#### ⏱️ pointages
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion des pointages / timesheets |
| **Routes** | `/t/pointage` (N1), `/rh/timesheets` (N2) |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N1 (saisie personnelle), N2+ (validation équipe) |

**Workflow 5 états** : `DRAFT → SUBMITTED → N2_MODIFIED → COUNTERSIGNED → VALIDATED`

Fonctionnalités :
- **N1** : Saisie hebdomadaire des heures (matin/après-midi par jour)
- **N2** : Validation directe, modification avec contre-signature, ou rejet
- Affichage des modifications N2 en rouge avec calcul des différences
- Conservation des entrées originales pour audit

Tables : `timesheets` avec `entries_original` et `entries_modified` (JSONB)

#### 👁️ rh_viewer
| Propriété | Valeur |
|-----------|--------|
| **Description** | Documents et demandes équipe |
| **Routes** | `/rh/equipe`, `/rh/equipe/:id`, `/rh/demandes`, `/rh/conges` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N2+ avec option activée |

Gestion opérationnelle RH : visualisation des fiches collaborateurs, traitement des demandes, gestion des congés. Sans accès aux données de paie.

#### 👔 rh_admin
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion complète : salaires, contrats |
| **Routes** | `/rh/dashboard`, `/rh/equipe/salaires` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N2+ avec option activée |

Administration RH complète incluant données sensibles : salaires, contrats, données sociales.

---

## 8. Parc

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `parc` |
| **Icône** | `Truck` |
| **Rôle minimum** | `franchisee_user` (N1) |
| **Rôles par défaut** | N2, N5, N6 |

### Description
Gestion de la flotte de véhicules et des équipements de l'agence. Suivi des maintenances, EPI et matériel.

### Utilisation
- Gestion du parc automobile
- Suivi des contrôles techniques
- Gestion des EPI
- Inventaire des équipements

### Particularités
- Alertes automatiques (CT, entretien, EPI expirés)
- QR codes pour identification rapide
- Historique des interventions
- Statistiques de coûts

### Sous-modules

#### 🚗 vehicules
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion flotte véhicules |
| **Routes** | `/parc/vehicules` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Inventaire véhicules, suivi kilométrique, échéances CT/assurance, cartes carburant.

#### 🦺 epi
| Propriété | Valeur |
|-----------|--------|
| **Description** | Équipements de protection individuelle |
| **Routes** | `/parc/epi` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Attribution EPI par collaborateur, suivi des dates de validité, renouvellements.

#### 🔧 equipements
| Propriété | Valeur |
|-----------|--------|
| **Description** | Autres équipements |
| **Routes** | `/parc/equipements` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Inventaire outillage, matériel technique, suivi des attributions.

---

## 9. Messagerie Interne

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `messaging` |
| **Icône** | `MessageCircle` |
| **Rôle minimum** | `franchisee_user` (N1) |
| **Rôles par défaut** | N1, N2, N3, N4, N5, N6 |

### Description
Système de chat interne permettant la communication entre utilisateurs de la plateforme.

### Utilisation
- Conversations privées
- Groupes de discussion
- Partage de fichiers

### Particularités
- Temps réel avec Supabase Realtime
- Notifications intégrées
- Historique des conversations

### Sous-modules

#### 💬 dm
| Propriété | Valeur |
|-----------|--------|
| **Description** | Conversations privées |
| **Routes** | `/messages` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N1+ avec module activé |

Messages directs entre deux utilisateurs.

#### 👥 groups
| Propriété | Valeur |
|-----------|--------|
| **Description** | Groupes de discussion |
| **Routes** | `/messages/groups` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N1+ avec module activé |

Création et participation à des groupes de discussion multi-utilisateurs.

---

## 10. Recherche Unifiée

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `unified_search` |
| **Icône** | `Sparkles` |
| **Rôle minimum** | `franchisee_user` (N1) |
| **Rôles par défaut** | N2, N3, N4, N5, N6 |

### Description
Barre de recherche intelligente combinant recherche statistique (StatIA) et recherche documentaire (RAG).

### Utilisation
- Questions en langage naturel sur les statistiques
- Recherche dans la documentation
- Chat avec Helpi

### Particularités
- IA Gemini pour l'interprétation NLP
- Routing intelligent vers le bon moteur
- Résultats avec pertinence scoring

### Sous-modules

#### 📊 stats
| Propriété | Valeur |
|-----------|--------|
| **Description** | Questions sur les statistiques |
| **Routes** | - (intégré dans la barre de recherche) |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Requêtes NLP transformées en appels StatIA : "Quel est mon CA en novembre ?" → calcul automatique.

#### 📚 docs
| Propriété | Valeur |
|-----------|--------|
| **Description** | Recherche documentation |
| **Routes** | - (intégré dans la barre de recherche) |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N1+ avec module activé |

Recherche sémantique dans les guides avec RAG et réponse générée par IA.

---

## 11. Fonctionnalités Transverses (hors modules)

Ces fonctionnalités sont accessibles indépendamment des modules :

### Pages communes
| Page | Route | Accès |
|------|-------|-------|
| Dashboard personnel | `/` | N1+ |
| Profil utilisateur | `/profile` | Tous authentifiés |
| Changelog | `/changelog` | Tous |
| Roadmap | `/roadmap` | Tous |
| FAQ publique | `/support/faq` | Tous |
| QR Assets | `/qr/:token` | Public |

### Fonctionnalités système
| Fonctionnalité | Description | Accès |
|----------------|-------------|-------|
| Changement mot de passe obligatoire | Forcé à la première connexion | Tous |
| Annonces prioritaires | Popup obligatoire pour messages importants | Tous |
| Mode maintenance | Blocage avec message | Selon whitelist |
| Impersonation | Prendre l'identité d'un autre utilisateur | N5+ |

---

## 📊 Récapitulatif des Plans

| Plan | Modules inclus | Options par défaut |
|------|----------------|-------------------|
| **STARTER** | help_academy, support, pilotage_agence | apogee, user, vue_ensemble |
| **PRO** | Tous les modules | Toutes les options standards |

### Options exclues des plans (attribution individuelle)
- `help_academy.edition` - Mode édition des guides
- `support.agent` - Console support agent
- `support.admin` - Administration support

---

## 🔐 Hiérarchie des Rôles

| Niveau | Rôle technique | Label | Scope |
|--------|----------------|-------|-------|
| N0 | `base_user` | Extérieur | Aucun |
| N1 | `franchisee_user` | Collaborateur Agence | Son agence |
| N2 | `franchisee_admin` | Dirigeant Agence | Son agence |
| N3 | `franchisor_user` | Animateur Réseau | Agences assignées |
| N4 | `franchisor_admin` | Directeur Réseau | Tout le réseau |
| N5 | `platform_admin` | Administrateur | Plateforme |
| N6 | `superadmin` | Super Admin | Absolu |

---

## 12. DocGen (Génération Documents)

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `docgen` |
| **Icône** | `FileText` |
| **Rôle minimum** | `franchisee_admin` (N2) |
| **Rôles par défaut** | N2, N5, N6 |

### Description
Module de génération de documents professionnels (lettres, attestations, certificats) à partir de templates DOCX avec tokens auto-remplis.

### Utilisation
- Upload de templates DOCX avec tokens `{{NOM_TOKEN}}`
- Génération de documents avec smart tokens auto-remplis
- Preview PDF en temps réel
- Export DOCX ou PDF finalisé

### Particularités
- Smart tokens auto-populés (AGENCE_*, DIRIGEANT_*, COLLAB_*, DATE_*, USER_*)
- Wizard step-by-step pour champs manuels
- Conversion DOCX→PDF via Gotenberg
- Versioning et publication des templates

### Sous-modules

#### 📄 instance
| Propriété | Valeur |
|-----------|--------|
| **Description** | Créer et éditer des documents |
| **Routes** | `/rh/docgen`, `/rh/docgen/:instanceId` |
| **Activé par défaut** | ✅ Oui |
| **Qui a accès** | N2+ avec module activé |

Interface de création de documents avec preview PDF live et export.

#### ⚙️ templates
| Propriété | Valeur |
|-----------|--------|
| **Description** | Gestion des templates (Studio) |
| **Routes** | `/admin/templates` |
| **Activé par défaut** | ❌ Non |
| **Qui a accès** | N4+ uniquement |

Studio d'administration des templates : upload, configuration tokens, publication.

---

## 13. Portail Apporteur (externe)

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `apporteur_portal` |
| **Icône** | `Building2` |
| **Rôle minimum** | Authentification apporteur (hors N0-N6) |
| **Rôles par défaut** | Utilisateurs `apporteur_users` |

### Description
Portail externe isolé pour les prescripteurs (assurances, bailleurs, etc.) permettant le suivi de leurs dossiers et la création de demandes d'intervention.

### Utilisation
- Consultation des dossiers du commanditaire
- Création de demandes d'intervention
- Suivi des statistiques (dossiers en cours, factures impayées)

### Particularités
- Authentification isolée (ApporteurAuthContext) hors hiérarchie N0-N6
- Liaison automatique via `apporteurs.apogee_client_id` → commanditaire Apogée
- Notifications email via Resend
- Isolation totale des données entre apporteurs

### Routes

| Route | Page | Description |
|-------|------|-------------|
| `/apporteur` | Login | Authentification apporteur |
| `/apporteur/dashboard` | Dashboard | KPIs + nouvelle demande |
| `/apporteur/dossiers` | Dossiers | Table des dossiers commanditaire |

---

## 14. Rapports Mensuels

| Propriété | Valeur |
|-----------|--------|
| **Clé technique** | `monthly_reports` |
| **Icône** | `FileBarChart` |
| **Rôle minimum** | `franchisor_admin` (N4) |
| **Rôles par défaut** | N4, N5, N6 |

### Description
Génération automatique de rapports d'activité mensuels pour les dirigeants d'agence. PDF multi-sections avec KPIs, graphiques et alertes.

### Utilisation
- Configuration des sections à inclure
- Prévisualisation des rapports
- Génération automatique le 10 du mois
- Historique des rapports générés

### Particularités
- CRON auto-génération (10 du mois 08:00 UTC)
- CRON purge (rapports >12 mois)
- Sections modulables (synthèse, CA, techniciens, univers, SAV, etc.)
- Charts SVG intégrés (bar charts, donut charts)

### Routes

| Route | Page | Description |
|-------|------|-------------|
| `/admin/rapportactivite` | RapportActiviteAdmin | Console de configuration (N4+) |

---

> **Document généré le** : 18 Décembre 2025  
> **Mainteneur** : Équipe Technique HelpConfort
