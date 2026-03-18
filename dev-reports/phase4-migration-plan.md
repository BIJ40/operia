# Phase 4 — Plan de Migration des Guards

Date: 2026-03-11

Source: `dev-reports/phase4-guards-inventory.md` (165 occurrences, 15 clés legacy)

---

## 1. Regroupement par clé legacy

### `agence` — ~35 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `sitemapData.ts` | moduleGuard | PilotageIndex, AgencyPerformance, AgencyAnomalies, AcceptedQuotesPage, AgencyDevisDetail (sans option) |
| `sitemapData.ts` | moduleGuard + opt | `indicateurs`, `actions_a_mener` (×2), `diffusion`, `mes_apporteurs`, `carte_rdv`, `veille_apporteurs` |
| `dashboardTiles.ts` | requiresModule | Pilotage Agence, Actions à mener, Diffusion, Espace Technicien |
| `PilotageTabContent.tsx` | requiresModule | Performance, Actions à mener, Devis acceptés, Incohérences |
| `OrganisationTabContent.tsx` | requiresModule | Documents légaux tab |
| `DiversTabContent.tsx` | requiresModule | Administratif, Performance, Devis acceptés, Incohérences |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |
| `IndicateursLayout.tsx` | hasModule | Guard d'accès |
| `PilotageIndex.tsx` | hasModuleOption | `agence.stats_hub`, `agence.mes_apporteurs` |
| `PreloadTipsCarousel.tsx` | hasModuleOption | `agence.stats_hub` |

### `guides` — ~25 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `academy.routes.tsx` | ModuleGuard | 5 routes (Category, ApporteurSubcategories, CategoryApporteur, CategoryHcServices, CategoryHelpConfort) |
| `sitemapData.ts` | moduleGuard | 10 entrées (AcademyIndex → CategoryHelpConfort) |
| `dashboardTiles.ts` | requiresModule | 3 tiles (Apogée, Apporteurs, HC Services) |
| `AideTabContent.tsx` | requiresModule | Guides tab |
| `CategoryPage.tsx` | hasModuleOption | `guides.edition` |
| `ApporteurGuide.tsx` | hasModuleOption | `guides.edition` |
| `HcServicesGuide.tsx` | hasModuleOption | `guides.edition` |
| `ApogeeGuide.tsx` | hasModuleOption | `guides.edition` |
| `CategoryActionsAMener.tsx` | hasModuleOption | `guides.edition` |
| `CategoryHcServices.tsx` | hasModuleOption | `guides.edition` |
| `AcademyIndex.tsx` | hasModuleOption | `guides.faq` |
| `EditorContext.tsx` | hasModuleOption | `guides.edition` |
| `ApporteurEditorContext.tsx` | hasModuleOption | `guides.edition` |
| `HcServicesEditorContext.tsx` | hasModuleOption | `guides.edition` |
| `PreloadTipsCarousel.tsx` | hasModuleOption | `guides.formations` |

### `ticketing` — ~16 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `projects.routes.tsx` | ModuleGuard | 6 routes (Kanban, History, List, Incomplete, Review, Admin) |
| `sitemapData.ts` | moduleGuard | 7 entrées (ProjectsIndex → TicketsAdmin) |
| `dashboardTiles.ts` | requiresModule | Projects tile |
| `AideTabContent.tsx` | requiresModule | Ticketing tab |
| `UnifiedWorkspace.tsx` | hasModule | support tab (parmi d'autres) |

### `rh` — ~15 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `rh.routes.tsx` | ModuleGuard + opts | 3 routes avec `['rh_viewer','rh_admin']` |
| `sitemapData.ts` | moduleGuard | 8 entrées (RHIndex, RHSuivi, RHCollaborateur, RHParc, RHCoffre, RHDocGen, RHPlannings, RHMeetings) |
| `dashboardTiles.ts` | requiresModule | 2 tiles (RH Suivi, Validation Plannings) |
| `OrganisationTabContent.tsx` | requiresModule | Salariés tab |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |
| `PreloadTipsCarousel.tsx` | hasModuleOption | `rh.collaborateurs` |

### `reseau_franchiseur` — ~13 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `sitemapData.ts` | moduleGuard | 12 entrées (ReseauIndex → TDRUsersPage) |

### `admin_plateforme` — ~12 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `docsExportPdf.ts` | ModuleGuard | AdminLayout |
| `sitemapData.ts` | moduleGuard | 9 entrées (AdminIndex → AdminSupport) |
| `UnifiedWorkspace.tsx` | hasModule | admin tab |

### `aide` — ~5 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `sitemapData.ts` | moduleGuard | 3 entrées (SupportHub, HelpCenter, MesDemandesSupport) |
| `AideTabContent.tsx` | requiresModule | Aide en ligne tab |
| `UnifiedWorkspace.tsx` | hasModule | support tab (parmi d'autres) |

### `stats` — ~4 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `sitemapData.ts` | moduleGuard + opt | StatsHub (`stats` + `stats_hub`) |
| `PilotageTabContent.tsx` | requiresModule | Statistiques tab |
| `UnifiedWorkspace.tsx` | hasModule | pilotage tab |
| `DataPreloadContext.tsx` | hasModuleOption | `stats.stats_hub` |

### `realisations` — ~4 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `realisations.routes.tsx` | ModuleGuard | 3 routes (List, Create, Detail) |
| `CommercialTabContent.tsx` | hasModule | realisations filter |

### `divers_apporteurs` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `OrganisationTabContent.tsx` | requiresModule | Apporteurs tab |
| `DiversTabContent.tsx` | requiresModule | Apporteurs tab |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |

### `divers_plannings` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `OrganisationTabContent.tsx` | requiresModule | Plannings tab |
| `DiversTabContent.tsx` | requiresModule | Plannings admin tab |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |

### `divers_reunions` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `OrganisationTabContent.tsx` | requiresModule | Réunions tab |
| `DiversTabContent.tsx` | requiresModule | Réunions admin tab |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |

### `divers_documents` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `DiversTabContent.tsx` | requiresModule | Documents admin tab |
| `UnifiedWorkspace.tsx` | hasModule | documents tab |
| *(Note: DocumentsTabContent utilise déjà `mediatheque.gerer`/`mediatheque.corbeille`)* |

### `parc` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `OrganisationTabContent.tsx` | requiresModule | Parc tab |
| `DiversTabContent.tsx` | requiresModule | Parc tab |
| `UnifiedWorkspace.tsx` | hasModule | organisation tab (parmi d'autres) |

### `prospection` — ~3 occurrences

| Fichier | Type | Détail |
|---------|------|--------|
| `DiversTabContent.tsx` | requiresModule | Commercial tab |
| `UnifiedWorkspace.tsx` | hasModule | commercial tab |
| `CommercialTabContent.tsx` | hasModuleOption | `prospection.*` (dynamic options) |

---

## 2. Mapping legacy → nouvelle clé cible

### Mappings 1:1 (sans ambiguïté)

| Clé legacy | Nouvelle clé cible | Validé par COMPAT_MAP |
|------------|--------------------|-----------------------|
| `realisations` | `commercial.realisations` | ✅ |
| `divers_apporteurs` | `organisation.apporteurs` | ✅ |
| `divers_plannings` | `organisation.plannings` | ✅ |
| `divers_reunions` | `organisation.reunions` | ✅ |
| `parc` | `organisation.parc` | ✅ |
| `aide` | `support.aide_en_ligne` | ✅ |
| `ticketing` | `support.ticketing` | ✅ |

### Mappings avec options (1:N via options)

| Clé legacy | Nouvelles clés cibles | Logique |
|------------|----------------------|---------|
| `guides` (module) | `support.guides` | Module parent → 1:1 ✅ |
| `guides.edition` | — | Option interne, pas de migration de clé |
| `guides.faq` | — | Option interne, pas de migration de clé |
| `guides.formations` | — | Option interne, pas de migration de clé |
| `stats` | `pilotage.statistiques` | Module parent → 1:1 ✅ |
| `stats.stats_hub` | `pilotage.statistiques` (option) | Option interne |
| `stats.exports` | `pilotage.statistiques.exports` | ✅ COMPAT_MAP |
| `rh` (module) | `organisation.salaries` | Module parent ✅ |
| `rh.rh_viewer` / `rh.rh_admin` | — | Options internes de `rh`, pas de changement de clé |
| `rh.collaborateurs` | — | Option interne |
| `rh.coffre` | — | Option interne |
| `divers_documents` | `mediatheque.consulter` / `.gerer` / `.corbeille` | Via options ✅ |

### ⚠️ Mappings multi-cibles (ARBITRAGE REQUIS)

| Clé legacy | Nouvelles clés possibles | Problème |
|------------|-------------------------|----------|
| `agence` (sans option) | `pilotage.performance`, `pilotage.devis_acceptes`, `pilotage.incoherences`, `pilotage.actions_a_mener` | **1 clé legacy → 4+ écrans fonctionnels.** Chaque guard `agence` sans option doit être arbitré individuellement selon l'écran protégé. |
| `agence` + opt `indicateurs` | `pilotage.performance` | Probable 1:1 |
| `agence` + opt `actions_a_mener` | `pilotage.actions_a_mener` | 1:1 ✅ |
| `agence` + opt `diffusion` | `pilotage.diffusion` (manque COMPAT) | ⚠️ Pas dans COMPAT_MAP, à ajouter |
| `agence` + opt `mes_apporteurs` | — | Pas de nouvelle clé définie |
| `agence` + opt `carte_rdv` | — | Pas de nouvelle clé définie |
| `agence` + opt `veille_apporteurs` | — | Pas de nouvelle clé définie |
| `agence` + opt `stats_hub` | — | Chevauchement avec `stats.stats_hub` |
| `agence` (Documents légaux) | `organisation.documents_legaux` | Clé pure Phase 4, pas de legacy |
| `admin_plateforme` | `admin.gestion`, `admin.ia`, `admin.contenu`, `admin.ops`, `admin.plateforme` | **1 clé legacy → 5 sous-clés admin.** Tous les écrans admin utilisent la même clé aujourd'hui. L'éclatement nécessite de décider quels écrans admin vont sous quelle sous-clé. |
| `reseau_franchiseur` | `admin.franchiseur` | 1:1 mais 12 écrans sous la même clé — OK si le module reste monolithique |
| `prospection` | `commercial.suivi_client`, `commercial.comparateur`, `commercial.veille`, `commercial.prospects` | **Mapping dépendant des options.** Chaque sous-module commercial est contrôlé par une option de `prospection`. |

---

## 3. Classement par risque de migration

### 🟢 Risque FAIBLE

| Clé legacy | Occurrences | Raison |
|------------|-------------|--------|
| `divers_apporteurs` | 3 | 1:1, pas de route ModuleGuard, usage tabs uniquement |
| `divers_plannings` | 3 | 1:1, pas de route ModuleGuard, usage tabs uniquement |
| `divers_reunions` | 3 | 1:1, pas de route ModuleGuard, usage tabs uniquement |
| `parc` | 3 | 1:1, pas de route ModuleGuard, usage tabs uniquement |
| `realisations` | 4 | 1:1, 3 routes ModuleGuard simples |
| `aide` | 5 | 1:1, pas de route ModuleGuard, usage tabs + sitemapData |

### 🟡 Risque MOYEN

| Clé legacy | Occurrences | Raison |
|------------|-------------|--------|
| `guides` | 25 | 1:1 pour le module parent, mais fort volume (5 routes + 10 sitemapData + options `edition`/`faq`/`formations`). Les options ne changent pas de clé — seul `guides` → `support.guides` est concerné. |
| `stats` | 4 | 1:1 pour le module parent, mais chevauchement `stats_hub` entre `stats` et `agence` |
| `rh` | 15 | 1:1 module parent (`organisation.salaries`), mais 3 routes avec options `rh_viewer`/`rh_admin` et 8 sitemapData |
| `divers_documents` | 3 | Mapping via options vers `mediatheque.*` — déjà 2 nouvelles clés en place |
| `reseau_franchiseur` | 13 | 1:1 vers `admin.franchiseur`, volume élevé mais mapping simple |

### 🟠 Risque ÉLEVÉ

| Clé legacy | Occurrences | Raison |
|------------|-------------|--------|
| `agence` | ~35 | **Clé la plus utilisée.** 1 clé legacy couvre 4+ écrans cibles. Certains guards ont des options, d'autres non. Usage croisé pilotage/organisation/divers. Arbitrage écran par écran nécessaire. |
| `admin_plateforme` | ~12 | 1 clé legacy → 5 sous-clés admin. Éclatement non trivial. |
| `prospection` | ~3 | Mapping dépendant des options dynamiques dans `CommercialTabContent`. |

### 🔴 Risque CRITIQUE

| Clé legacy | Occurrences | Raison |
|------------|-------------|--------|
| `ticketing` | ~16 | **Module en production active.** `required_plan = 'NONE'`, accès par `user_modules` override. 6 routes ModuleGuard + 7 sitemapData. Toute erreur = perte d'accès immédiate pour les utilisateurs ticketing. COMPAT_MAP existe mais le Chemin B (ModuleGuard) doit être vérifié. |

---

## 4. Ordre recommandé de migration

### Vague 1 — Clés simples 1:1, faible risque

**Périmètre** : `divers_apporteurs`, `divers_plannings`, `divers_reunions`, `parc`, `realisations`, `aide`

| Clé legacy | → Nouvelle clé | Fichiers impactés | Guards |
|------------|---------------|-------------------|--------|
| `divers_apporteurs` | `organisation.apporteurs` | OrganisationTabContent, DiversTabContent, UnifiedWorkspace | 3 |
| `divers_plannings` | `organisation.plannings` | OrganisationTabContent, DiversTabContent, UnifiedWorkspace | 3 |
| `divers_reunions` | `organisation.reunions` | OrganisationTabContent, DiversTabContent, UnifiedWorkspace | 3 |
| `parc` | `organisation.parc` | OrganisationTabContent, DiversTabContent, UnifiedWorkspace | 3 |
| `realisations` | `commercial.realisations` | realisations.routes.tsx, CommercialTabContent | 4 |
| `aide` | `support.aide_en_ligne` | sitemapData, AideTabContent, UnifiedWorkspace | 5 |
| **Total V1** | | **~10 fichiers** | **~21** |

### Vague 2 — Clés avec options, risque moyen

**Périmètre** : `guides`, `stats`, `rh`, `divers_documents`, `reseau_franchiseur`

| Clé legacy | → Nouvelle clé | Fichiers impactés | Guards |
|------------|---------------|-------------------|--------|
| `guides` | `support.guides` | academy.routes, sitemapData, dashboardTiles, AideTabContent | ~25 |
| `stats` | `pilotage.statistiques` | sitemapData, PilotageTabContent, UnifiedWorkspace, DataPreloadContext | ~4 |
| `rh` | `organisation.salaries` | rh.routes, sitemapData, dashboardTiles, OrganisationTabContent | ~15 |
| `divers_documents` | `mediatheque.*` | DiversTabContent, UnifiedWorkspace | ~3 |
| `reseau_franchiseur` | `admin.franchiseur` | sitemapData (12 entrées) | ~13 |
| **Total V2** | | **~15 fichiers** | **~60** |

### Vague 3 — Clés multi-cibles, arbitrage requis

**Périmètre** : `agence`, `admin_plateforme`, `prospection`

| Clé legacy | → Nouvelle(s) clé(s) | Fichiers impactés | Guards |
|------------|---------------------|-------------------|--------|
| `agence` | `pilotage.*` (×4+), usage croisé org/divers | sitemapData, dashboardTiles, Pilotage*, Organisation*, Divers*, UnifiedWorkspace, IndicateursLayout, PilotageIndex | ~35 |
| `admin_plateforme` | `admin.*` (×5) | sitemapData, UnifiedWorkspace, docsExportPdf | ~12 |
| `prospection` | `commercial.*` (×4 via options) | DiversTabContent, UnifiedWorkspace, CommercialTabContent | ~3 |
| **Total V3** | | **~15 fichiers** | **~50** |

**Prérequis V3** : Arbitrage métier finalisé pour chaque guard `agence` sans option.

### Vague 4 — Ticketing (DERNIER)

**Périmètre** : `ticketing` → `support.ticketing`

| Clé legacy | → Nouvelle clé | Fichiers impactés | Guards |
|------------|---------------|-------------------|--------|
| `ticketing` | `support.ticketing` | projects.routes (6), sitemapData (7), dashboardTiles (1), AideTabContent (1), UnifiedWorkspace (1) | ~16 |

**Prérequis V4** :
1. Unification Chemin A / Chemin B confirmée
2. `ModuleGuard moduleKey="support.ticketing"` résout via COMPAT_MAP → `ticketing` legacy
3. Test en impersonation avec utilisateur réel ticketing
4. Migration atomique des 16 occurrences
5. Monitoring post-déploiement

---

## 5. Cas bloquants / arbitrages

### 🔶 Arbitrage 1 — `agence` sans option

La clé `agence` sans option est utilisée dans ~15 guards pour des écrans différents :

| Écran / Guard | Nouvelle clé proposée | Certitude |
|---------------|----------------------|-----------|
| `PilotageIndex` (index) | `pilotage.performance` ? | ⚠️ Index couvre tout le pilotage |
| `AgencyPerformance` | `pilotage.performance` | ✅ |
| `AgencyAnomalies` | `pilotage.incoherences` | ✅ |
| `AcceptedQuotesPage` | `pilotage.devis_acceptes` | ✅ |
| `AgencyDevisDetail` | `pilotage.devis_acceptes` | ✅ |
| `Espace Technicien` (tile) | ❓ | Pas de nouvelle clé définie |
| `Documents légaux` (OrganisationTab) | `organisation.documents_legaux` | ⚠️ Clé pure Phase 4, pas de legacy |
| `Administratif` (DiversTab) | ❓ | Quelle sous-clé admin ? |
| `Performance` (DiversTab) | `pilotage.performance` | ✅ Doublon avec Pilotage |
| `Devis acceptés` (DiversTab) | `pilotage.devis_acceptes` | ✅ Doublon avec Pilotage |
| `Incohérences` (DiversTab) | `pilotage.incoherences` | ✅ Doublon avec Pilotage |

**Décision requise** : PilotageIndex garde-t-il un guard parent `pilotage.*` ou faut-il un guard spécifique par sous-page ?

### 🔶 Arbitrage 2 — Options `agence` sans correspondance Phase 4

| Option legacy | Nouvelle clé | Statut |
|---------------|-------------|--------|
| `agence.indicateurs` | `pilotage.performance` ? | ⚠️ À confirmer |
| `agence.diffusion` | `pilotage.diffusion` | ⚠️ **Absent du COMPAT_MAP** — à ajouter |
| `agence.mes_apporteurs` | — | ❌ Pas de nouvelle clé définie |
| `agence.carte_rdv` | — | ❌ Pas de nouvelle clé définie |
| `agence.veille_apporteurs` | — | ❌ Pas de nouvelle clé définie |
| `agence.stats_hub` | — | ⚠️ Chevauchement avec `stats.stats_hub` |

### 🔶 Arbitrage 3 — `admin_plateforme` éclatement

Tous les écrans admin utilisent la même clé `admin_plateforme`. L'éclatement vers 5 sous-clés nécessite de décider :

| Écran admin | Sous-clé proposée | Certitude |
|-------------|-------------------|-----------|
| AdminIndex | `admin.gestion` | ⚠️ Index couvre tout |
| AdminSitemap | `admin.plateforme` ? | ❓ |
| ModulesManagement | `admin.gestion` | ✅ |
| FlowBuilder | `admin.ia` ? `admin.contenu` ? | ❓ |
| TemplateManagement | `admin.contenu` | ✅ |
| ApporteurManagement | `admin.gestion` | ✅ |
| ApporteurOrganizationsAdmin | `admin.gestion` | ✅ |
| RapportActiviteBuilder | `admin.contenu` ? | ❓ |
| AdminSupport | `admin.ops` | ✅ |

**Décision requise** : Certains écrans admin (FlowBuilder, RapportActiviteBuilder, AdminSitemap) n'ont pas de mapping évident.

### 🔶 Arbitrage 4 — `prospection` avec options dynamiques

`CommercialTabContent` utilise `hasModuleOption('prospection', option)` de manière dynamique. La migration vers `commercial.*` nécessite de remplacer :

```
hasModuleOption('prospection', 'dashboard') → hasModule('commercial.suivi_client')
hasModuleOption('prospection', 'comparateur') → hasModule('commercial.comparateur')
hasModuleOption('prospection', 'veille') → hasModule('commercial.veille')
hasModuleOption('prospection', 'prospects') → hasModule('commercial.prospects')
```

**Décision requise** : Ce changement de pattern (`hasModuleOption` → `hasModule`) est-il acceptable dans CommercialTabContent ?

### 🔶 Arbitrage 5 — `organisation.documents_legaux`

Clé pure Phase 4 sans legacy. Actuellement gardée par `agence` dans OrganisationTabContent.
- Si on migre `agence` → `pilotage.*`, cet écran perd son guard.
- Il faut soit créer une entrée `organisation.documents_legaux` dans le module_registry, soit garder un fallback.

---

## 6. Premier lot exécutable (V1)

### Fichiers migrables immédiatement, sans arbitrage

Les occurrences suivantes peuvent être migrées dès maintenant. Toutes sont des mappings 1:1 validés par le COMPAT_MAP, sans dépendance à des options ambiguës, et **ticketing exclu**.

| # | Fichier | Ligne(s) | Clé actuelle | → Nouvelle clé | Type |
|---|---------|----------|-------------|----------------|------|
| 1 | `OrganisationTabContent.tsx` | 26 | `divers_apporteurs` | `organisation.apporteurs` | requiresModule |
| 2 | `OrganisationTabContent.tsx` | 27 | `divers_plannings` | `organisation.plannings` | requiresModule |
| 3 | `OrganisationTabContent.tsx` | 28 | `divers_reunions` | `organisation.reunions` | requiresModule |
| 4 | `OrganisationTabContent.tsx` | 29 | `parc` | `organisation.parc` | requiresModule |
| 5 | `DiversTabContent.tsx` | 65 | `divers_apporteurs` | `organisation.apporteurs` | requiresModule |
| 6 | `DiversTabContent.tsx` | 67 | `parc` | `organisation.parc` | requiresModule |
| 7 | `DiversTabContent.tsx` | 242 | `divers_reunions` | `organisation.reunions` | requiresModule |
| 8 | `DiversTabContent.tsx` | 243 | `divers_plannings` | `organisation.plannings` | requiresModule |
| 9 | `DiversTabContent.tsx` | 244 | `divers_documents` | `mediatheque.consulter` | requiresModule |
| 10 | `realisations.routes.tsx` | 22 | `realisations` | `commercial.realisations` | ModuleGuard |
| 11 | `realisations.routes.tsx` | 34 | `realisations` | `commercial.realisations` | ModuleGuard |
| 12 | `realisations.routes.tsx` | 46 | `realisations` | `commercial.realisations` | ModuleGuard |
| 13 | `CommercialTabContent.tsx` | 78 | `realisations` | `commercial.realisations` | hasModule |
| 14 | `AideTabContent.tsx` | 23 | `aide` | `support.aide_en_ligne` | requiresModule |
| 15 | `sitemapData.ts` | 558 | `aide` | `support.aide_en_ligne` | moduleGuard |
| 16 | `sitemapData.ts` | 568 | `aide` | `support.aide_en_ligne` | moduleGuard |
| 17 | `sitemapData.ts` | 578 | `aide` | `support.aide_en_ligne` | moduleGuard |

**Total V1 immédiat : 17 occurrences dans 6 fichiers**

### Exclues de V1 (même si faible risque)

| Fichier | Raison d'exclusion |
|---------|-------------------|
| `UnifiedWorkspace.tsx` | Guards multi-clés dans une logique OR — migration atomique avec toutes les clés d'un tab |
| `sitemapData.ts` (hors `aide`) | Volume élevé, préférer migration par batch cohérent en V2/V3 |

---

## Résumé exécutif

| Vague | Clés | Guards | Risque | Prérequis |
|-------|------|--------|--------|-----------|
| **V1** | divers_*, parc, realisations, aide | ~21 | 🟢 Faible | Aucun |
| **V2** | guides, stats, rh, divers_documents, reseau_franchiseur | ~60 | 🟡 Moyen | Aucun |
| **V3** | agence, admin_plateforme, prospection | ~50 | 🟠 Élevé | Arbitrages finalisés |
| **V4** | ticketing | ~16 | 🔴 Critique | Unification chemins + test impersonation |
| **Total** | 15 clés legacy | **~147** | | |

> ⚠️ Les ~18 guards restants (moteur interne `hasAccess`, `enabledModules[]`, `hasAccessToScope`) ne sont pas des guards applicatifs à migrer — ce sont des mécanismes internes qui consomment les clés.
