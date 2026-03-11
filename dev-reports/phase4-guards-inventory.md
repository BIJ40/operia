# Phase 4 — Guards Inventory (Audit complet)

Date: 2026-03-11

## Objectif

Inventaire exhaustif de toutes les utilisations de permissions (guards, checks de modules) dans le code applicatif, hors `node_modules`, `devtools/`, et tests unitaires.

---

## Inventaire complet

### A. ModuleGuard (routes)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/routes/projects.routes.tsx` | 32 | ModuleGuard | `ticketing` | ApogeeTicketsKanban |
| `src/routes/projects.routes.tsx` | 33 | ModuleGuard | `ticketing` | ApogeeTicketsHistory |
| `src/routes/projects.routes.tsx` | 34 | ModuleGuard | `ticketing` | ApogeeTicketsList |
| `src/routes/projects.routes.tsx` | 35 | ModuleGuard | `ticketing` | ApogeeTicketsIncomplete |
| `src/routes/projects.routes.tsx` | 36 | ModuleGuard | `ticketing` | ApogeeTicketsReview |
| `src/routes/projects.routes.tsx` | 37 | ModuleGuard | `ticketing` | ApogeeTicketsAdmin |
| `src/routes/academy.routes.tsx` | 32 | ModuleGuard | `guides` | Category |
| `src/routes/academy.routes.tsx` | 36 | ModuleGuard | `guides` | ApporteurSubcategories |
| `src/routes/academy.routes.tsx` | 37 | ModuleGuard | `guides` | CategoryApporteur |
| `src/routes/academy.routes.tsx` | 41 | ModuleGuard | `guides` | CategoryHcServices |
| `src/routes/academy.routes.tsx` | 48 | ModuleGuard | `guides` | CategoryHelpConfort |
| `src/routes/realisations.routes.tsx` | 22 | ModuleGuard | `realisations` | RealisationsPage |
| `src/routes/realisations.routes.tsx` | 34 | ModuleGuard | `realisations` | RealisationCreatePage |
| `src/routes/realisations.routes.tsx` | 46 | ModuleGuard | `realisations` | RealisationDetailPage |
| `src/routes/rh.routes.tsx` | 51 | ModuleGuard | `rh` + options `['rh_viewer','rh_admin']` | PlanningHebdo |
| `src/routes/rh.routes.tsx` | 70 | ModuleGuard | `rh` + options `['rh_viewer','rh_admin']` | DocGenPage |
| `src/routes/rh.routes.tsx` | 82 | ModuleGuard | `rh` + options `['rh_viewer','rh_admin']` | RHMeetingsPage |
| `src/lib/docsExportPdf.ts` | 601 | ModuleGuard | `admin_plateforme` | AdminLayout |

### B. moduleGuard (sitemapData config)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/config/sitemapData.ts` | 116 | moduleGuard | `guides` | AcademyIndex |
| `src/config/sitemapData.ts` | 126 | moduleGuard | `guides` | ApogeeGuideIndex |
| `src/config/sitemapData.ts` | 136 | moduleGuard | `guides` | Category (dynamic) |
| `src/config/sitemapData.ts` | 147 | moduleGuard | `guides` | ApporteurIndex |
| `src/config/sitemapData.ts` | 157 | moduleGuard | `guides` | ApporteurSubcategories |
| `src/config/sitemapData.ts` | 168 | moduleGuard | `guides` | CategoryApporteur |
| `src/config/sitemapData.ts` | 179 | moduleGuard | `guides` | HcServicesIndex |
| `src/config/sitemapData.ts` | 189 | moduleGuard | `guides` | CategoryHcServices |
| `src/config/sitemapData.ts` | 220 | moduleGuard | `guides` | HcBaseIndex |
| `src/config/sitemapData.ts` | 230 | moduleGuard | `guides` | CategoryHelpConfort |
| `src/config/sitemapData.ts` | 243 | moduleGuard | `agence` | PilotageIndex |
| `src/config/sitemapData.ts` | 254 | moduleGuard | `stats` + opt `stats_hub` | StatsHub |
| `src/config/sitemapData.ts` | 264 | moduleGuard | `agence` + opt `indicateurs` | IndicateursLayout |
| `src/config/sitemapData.ts` | 275 | moduleGuard | `agence` + opt `veille_apporteurs` | VeilleApporteurs |
| `src/config/sitemapData.ts` | 285 | moduleGuard | `agence` + opt `actions_a_mener` | ActionsAMener |
| `src/config/sitemapData.ts` | 295 | moduleGuard | `agence` + opt `actions_a_mener` | CategoryActionsAMener |
| `src/config/sitemapData.ts` | 307 | moduleGuard | `agence` + opt `diffusion` | DiffusionPage |
| `src/config/sitemapData.ts` | 317 | moduleGuard | `agence` | AgencyPerformance |
| `src/config/sitemapData.ts` | 327 | moduleGuard | `agence` | AgencyAnomalies |
| `src/config/sitemapData.ts` | 338 | moduleGuard | `agence` + opt `mes_apporteurs` | ApporteursMap |
| `src/config/sitemapData.ts` | 349 | moduleGuard | `agence` + opt `carte_rdv` | MapRdvLayout |
| `src/config/sitemapData.ts` | 359 | moduleGuard | `agence` | AcceptedQuotesPage |
| `src/config/sitemapData.ts` | 369 | moduleGuard | `agence` | AgencyDevisDetail |
| `src/config/sitemapData.ts` | 456 | moduleGuard | `rh` | RHIndex |
| `src/config/sitemapData.ts` | 467 | moduleGuard | `rh` + options `['rh_viewer','rh_admin']` | RHSuivi |
| `src/config/sitemapData.ts` | 478 | moduleGuard | `rh` + options `['rh_viewer','rh_admin']` | RHCollaborateur |
| `src/config/sitemapData.ts` | 490 | moduleGuard | `rh` | RHParc |
| `src/config/sitemapData.ts` | 502 | moduleGuard | `rh` | RHCoffre |
| `src/config/sitemapData.ts` | 513 | moduleGuard | `rh` | RHDocGen |
| `src/config/sitemapData.ts` | 524 | moduleGuard | `rh` | RHPlannings |
| `src/config/sitemapData.ts` | 535 | moduleGuard | `rh` | RHMeetings |
| `src/config/sitemapData.ts` | 558 | moduleGuard | `aide` | SupportHub |
| `src/config/sitemapData.ts` | 568 | moduleGuard | `aide` | HelpCenter |
| `src/config/sitemapData.ts` | 578 | moduleGuard | `aide` | MesDemandesSupport |
| `src/config/sitemapData.ts` | 600 | moduleGuard | `reseau_franchiseur` | ReseauIndex |
| `src/config/sitemapData.ts` | 610 | moduleGuard | `reseau_franchiseur` | FranchiseurHome |
| `src/config/sitemapData.ts` | 620 | moduleGuard | `reseau_franchiseur` | FranchiseurAgencies |
| `src/config/sitemapData.ts` | 630 | moduleGuard | `reseau_franchiseur` | FranchiseurAgencyProfile |
| `src/config/sitemapData.ts` | 641 | moduleGuard | `reseau_franchiseur` | FranchiseurAnimateurs |
| `src/config/sitemapData.ts` | 651 | moduleGuard | `reseau_franchiseur` | AnimatorProfile |
| `src/config/sitemapData.ts` | 662 | moduleGuard | `reseau_franchiseur` | FranchiseurStats |
| `src/config/sitemapData.ts` | 672 | moduleGuard | `reseau_franchiseur` | FranchiseurComparison |
| `src/config/sitemapData.ts` | 682 | moduleGuard | `reseau_franchiseur` | ComparatifAgencesPage |
| `src/config/sitemapData.ts` | 692 | moduleGuard | `reseau_franchiseur` | ReseauGraphiquesPage |
| `src/config/sitemapData.ts` | 702 | moduleGuard | `reseau_franchiseur` | FranchiseurRoyalties |
| `src/config/sitemapData.ts` | 712 | moduleGuard | `reseau_franchiseur` | TDRUsersPage |
| `src/config/sitemapData.ts` | 724 | moduleGuard | `ticketing` | ProjectsIndex |
| `src/config/sitemapData.ts` | 734 | moduleGuard | `ticketing` | ApogeeTicketsKanban |
| `src/config/sitemapData.ts` | 744 | moduleGuard | `ticketing` | ApogeeTicketsHistory |
| `src/config/sitemapData.ts` | 754 | moduleGuard | `ticketing` | ApogeeTicketsList |
| `src/config/sitemapData.ts` | 764 | moduleGuard | `ticketing` | ApogeeTicketsIncomplete |
| `src/config/sitemapData.ts` | 774 | moduleGuard | `ticketing` | ApogeeTicketsReview |
| `src/config/sitemapData.ts` | 784 | moduleGuard | `ticketing` | ApogeeTicketsAdmin |
| `src/config/sitemapData.ts` | 797 | moduleGuard | `admin_plateforme` | AdminIndex |
| `src/config/sitemapData.ts` | 807 | moduleGuard | `admin_plateforme` | AdminSitemap |
| `src/config/sitemapData.ts` | 826 | moduleGuard | `admin_plateforme` | ModulesManagement |
| `src/config/sitemapData.ts` | 836 | moduleGuard | `admin_plateforme` | FlowBuilder |
| `src/config/sitemapData.ts` | 846 | moduleGuard | `admin_plateforme` | TemplateManagement |
| `src/config/sitemapData.ts` | 856 | moduleGuard | `admin_plateforme` | ApporteurManagement |
| `src/config/sitemapData.ts` | 866 | moduleGuard | `admin_plateforme` | ApporteurOrganizationsAdmin |
| `src/config/sitemapData.ts` | 876 | moduleGuard | `admin_plateforme` | RapportActiviteBuilder |
| `src/config/sitemapData.ts` | 895 | moduleGuard | `admin_plateforme` | AdminSupport |

### C. requiresModule (config tabs/tiles)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/config/dashboardTiles.ts` | 41 | requiresModule | `guides` | Guide Apogée tile |
| `src/config/dashboardTiles.ts` | 52 | requiresModule | `guides` | Guide Apporteurs tile |
| `src/config/dashboardTiles.ts` | 63 | requiresModule | `guides` | Guide HC Services tile |
| `src/config/dashboardTiles.ts` | 75 | requiresModule | `agence` | Pilotage Agence tile |
| `src/config/dashboardTiles.ts` | 86 | requiresModule | `agence` | Actions à mener tile |
| `src/config/dashboardTiles.ts` | 99 | requiresModule | `rh` | RH Suivi tile |
| `src/config/dashboardTiles.ts` | 110 | requiresModule | `agence` | Diffusion tile |
| `src/config/dashboardTiles.ts` | 123 | requiresModule | `rh` | Validation Plannings tile |
| `src/config/dashboardTiles.ts` | 164 | requiresModule | `ticketing` | Projects tile |
| `src/config/dashboardTiles.ts` | 176 | requiresModule | `agence` | Espace Technicien tile |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 28 | requiresModule | `stats` | Statistiques tab |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 29 | requiresModule | `agence` | Performance tab |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 30 | requiresModule | `agence` | Actions à mener tab |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 31 | requiresModule | `agence` | Devis acceptés tab |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 32 | requiresModule | `agence` | Incohérences tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 25 | requiresModule | `rh` | Salariés tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 26 | requiresModule | `divers_apporteurs` | Apporteurs tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 27 | requiresModule | `divers_plannings` | Plannings tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 28 | requiresModule | `divers_reunions` | Réunions tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 29 | requiresModule | `parc` | Parc tab |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 30 | requiresModule | `agence` | Documents légaux tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 65 | requiresModule | `divers_apporteurs` | Apporteurs tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 66 | requiresModule | `agence` | Administratif tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 67 | requiresModule | `parc` | Parc tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 68 | requiresModule | `agence` | Performance tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 69 | requiresModule | `prospection` | Commercial tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 70 | requiresModule | `agence` | Devis acceptés tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 71 | requiresModule | `agence` | Incohérences tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 242 | requiresModule | `divers_reunions` | Réunions admin tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 243 | requiresModule | `divers_plannings` | Plannings admin tab |
| `src/components/unified/tabs/DiversTabContent.tsx` | 244 | requiresModule | `divers_documents` | Documents admin tab |
| `src/components/unified/tabs/AideTabContent.tsx` | 23 | requiresModule | `aide` | Aide en ligne tab |
| `src/components/unified/tabs/AideTabContent.tsx` | 24 | requiresModule | `guides` | Guides tab |
| `src/components/unified/tabs/AideTabContent.tsx` | 26 | requiresModule | `ticketing` | Ticketing tab |

### D. hasModule() (composants applicatifs)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/pages/UnifiedWorkspace.tsx` | 109 | hasModule | `stats` | UnifiedWorkspace (pilotage tab) |
| `src/pages/UnifiedWorkspace.tsx` | 110 | hasModule | `prospection` | UnifiedWorkspace (commercial tab) |
| `src/pages/UnifiedWorkspace.tsx` | 111 | hasModule | `rh`, `parc`, `divers_apporteurs`, `divers_plannings`, `divers_reunions`, `agence` | UnifiedWorkspace (organisation tab) |
| `src/pages/UnifiedWorkspace.tsx` | 112 | hasModule | `divers_documents` | UnifiedWorkspace (documents tab) |
| `src/pages/UnifiedWorkspace.tsx` | 113 | hasModule | `aide`, `guides`, `ticketing` | UnifiedWorkspace (support tab) |
| `src/pages/UnifiedWorkspace.tsx` | 114 | hasModule | `admin_plateforme` | UnifiedWorkspace (admin tab) |
| `src/pages/UnifiedWorkspace.tsx` | 126-131 | hasModule | (dynamic) | UnifiedWorkspace isTabAccessible |
| `src/components/unified/tabs/PilotageTabContent.tsx` | 49 | hasModule | (dynamic via requiresModule) | PilotageTabContent filter |
| `src/components/unified/tabs/OrganisationTabContent.tsx` | 47 | hasModule | (dynamic via requiresModule) | OrganisationTabContent filter |
| `src/components/unified/tabs/CommercialTabContent.tsx` | 78 | hasModule | `realisations` | CommercialTabContent filter |
| `src/components/unified/tabs/DiversTabContent.tsx` | 253 | hasModule | (dynamic via requiresModule) | AdministratifSection filter |
| `src/components/unified/tabs/DiversTabContent.tsx` | 315 | hasModule | (dynamic via requiresModule) | DiversTabContent filter |
| `src/components/unified/tabs/AideTabContent.tsx` | 58 | hasModule | (dynamic via requiresModule) | GuidesSection filter |
| `src/components/unified/tabs/AideTabContent.tsx` | 94 | hasModule | (dynamic via requiresModule) | SupportHubTabContent filter |
| `src/components/unified/tabs/DocumentsTabContent.tsx` | 18 | hasModule | `mediatheque.gerer` ⭐ | DocumentsTabContent |
| `src/components/unified/tabs/DocumentsTabContent.tsx` | 19 | hasModule | `mediatheque.corbeille` ⭐ | DocumentsTabContent |
| `src/apogee-connect/pages/IndicateursLayout.tsx` | 28 | hasModule | `agence` | IndicateursLayout |

### E. hasModuleOption() (composants applicatifs)

| file | line | type | key (module.option) | component |
|------|------|------|-----|-----------|
| `src/pages/PilotageIndex.tsx` | 114 | hasModuleOption | `agence.stats_hub` | PilotageIndex |
| `src/pages/PilotageIndex.tsx` | 115 | hasModuleOption | `agence.mes_apporteurs` | PilotageIndex |
| `src/pages/CategoryPage.tsx` | 74 | hasModuleOption | `guides.edition` | CategoryPage |
| `src/pages/ApporteurGuide.tsx` | 314 | hasModuleOption | `guides.edition` | ApporteurGuide |
| `src/pages/HcServicesGuide.tsx` | 253 | hasModuleOption | `guides.edition` | HcServicesGuide |
| `src/pages/ApogeeGuide.tsx` | 48 | hasModuleOption | `guides.edition` | ApogeeGuide |
| `src/pages/CategoryActionsAMener.tsx` | 143 | hasModuleOption | `guides.edition` | CategoryActionsAMener |
| `src/pages/CategoryHcServices.tsx` | 48 | hasModuleOption | `guides.edition` | CategoryHcServices |
| `src/pages/AcademyIndex.tsx` | 47 | hasModuleOption | `guides.faq` | AcademyIndex |
| `src/pages/UnifiedWorkspace.tsx` | 124 | hasModuleOption | (dynamic) | UnifiedWorkspace |
| `src/contexts/EditorContext.tsx` | 45 | hasModuleOption | `guides.edition` | EditorContext |
| `src/contexts/ApporteurEditorContext.tsx` | 34 | hasModuleOption | `guides.edition` | ApporteurEditorContext |
| `src/contexts/HcServicesEditorContext.tsx` | ~86 | hasModuleOption | `guides.edition` | HcServicesEditorContext |
| `src/contexts/DataPreloadContext.tsx` | 197 | hasModuleOption | `stats.stats_hub` | DataPreloadContext |
| `src/components/unified/tabs/CommercialTabContent.tsx` | 80 | hasModuleOption | `prospection.*` (dynamic) | CommercialTabContent |
| `src/components/preload/PreloadTipsCarousel.tsx` | 59 | hasModuleOption | `stats.stats_hub`, `agence.stats_hub` | PreloadTipsCarousel |
| `src/components/preload/PreloadTipsCarousel.tsx` | 63 | hasModuleOption | `rh.collaborateurs` | PreloadTipsCarousel |
| `src/components/preload/PreloadTipsCarousel.tsx` | 67 | hasModuleOption | `guides.formations` | PreloadTipsCarousel |

### F. hasAccess() (moteur interne)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/components/auth/ModuleGuard.tsx` | 83 | hasAccess | (dynamic moduleKey) | ModuleGuard |
| `src/components/auth/ModuleGuard.tsx` | 89 | hasAccess | (dynamic moduleKey) | ModuleGuard |
| `src/components/auth/ModuleGuard.tsx` | 96 | hasAccess | (dynamic moduleKey) | ModuleGuard |
| `src/contexts/AuthContext.tsx` | 115 | hasAccess | (dynamic moduleKey) | hasModuleGuard |
| `src/contexts/AuthContext.tsx` | 123 | hasAccess | (dynamic moduleKey) | hasModuleOptionGuard |
| `src/permissions/permissionsEngine.ts` | 80 | hasAccess | (engine definition) | permissionsEngine |

### G. hasAccessToScope() (scope-based guards)

| file | line | type | key (scope) | component |
|------|------|------|-----|-----------|
| `src/apogee-connect/pages/IndicateursLayout.tsx` | 28 | hasAccessToScope | `mes_indicateurs` | IndicateursLayout |
| `src/pages/CategoryPage.tsx` | 87 | hasAccessToScope | (dynamic config.scopeCheck) | CategoryPage |
| `src/pages/HelpConfort.tsx` | 295 | hasAccessToScope | `helpconfort` | HelpConfort |
| `src/pages/CategoryApporteur.tsx` | 55 | hasAccessToScope | `apporteurs` | CategoryApporteur |
| `src/pages/ApporteurGuide.tsx` | 333 | hasAccessToScope | `apporteurs` | ApporteurGuide |
| `src/components/landing/AuthenticatedGrid.tsx` | 239 | hasAccessToScope | `mes_indicateurs` | AuthenticatedGrid |
| `src/components/landing/AuthenticatedGrid.tsx` | 276 | hasAccessToScope | `helpconfort` (dynamic) | AuthenticatedGrid |

### H. enabledModules[] (accès directs)

| file | line | type | key | component |
|------|------|------|-----|-----------|
| `src/permissions/permissionsEngine.ts` | 288 | enabledModules[] | (AGENCY_REQUIRED loop) | permissionsEngine (interne) |
| `src/types/modules.ts` | 495 | enabledModules[] | (generic) | isModuleEnabled helper |
| `src/types/modules.ts` | 512 | enabledModules[] | (generic) | isModuleOptionEnabled helper |
| `src/components/users/UserModulesTab.tsx` | 146 | enabledModules[] | (generic) | UserModulesTab (admin) |
| `src/components/users/UserModulesTab.tsx` | 154 | enabledModules[] | (generic) | UserModulesTab (admin) |
| `src/config/roleMatrix.ts` | 450 | enabledModules[] | (generic) | roleMatrix check |

---

## Résumé

### Comptage total

| Type | Occurrences |
|------|-------------|
| ModuleGuard (routes) | 18 |
| moduleGuard (sitemapData) | 59 |
| requiresModule (config tabs/tiles) | 34 |
| hasModule() (composants) | 17 |
| hasModuleOption() (composants) | 18 |
| hasAccess() (moteur) | 6 |
| hasAccessToScope() (scope) | 7 |
| enabledModules[] (accès directs) | 6 |
| **TOTAL** | **165** |

### Classification legacy vs nouvelles clés

| Catégorie | Count |
|-----------|-------|
| Guards utilisant des clés **legacy** | **163** |
| Guards utilisant des clés **nouvelles** (Phase 4) | **2** |

### Clés legacy détectées (15 clés uniques)

| Clé legacy | Occurrences (estimé) | Sections |
|------------|---------------------|----------|
| `agence` | ~35 | pilotage, organisation, divers, sitemapData |
| `guides` | ~25 | academy, support, sitemapData, edition checks |
| `ticketing` | ~16 | projects, support, sitemapData |
| `rh` | ~15 | rh routes, organisation, sitemapData |
| `admin_plateforme` | ~12 | admin, sitemapData |
| `reseau_franchiseur` | ~13 | réseau, sitemapData |
| `aide` | ~5 | support, sitemapData |
| `stats` | ~4 | pilotage, sitemapData |
| `realisations` | ~4 | commercial, routes |
| `divers_apporteurs` | ~3 | organisation, divers |
| `divers_plannings` | ~3 | organisation, divers |
| `divers_reunions` | ~3 | organisation, divers |
| `divers_documents` | ~3 | organisation, divers, workspace |
| `parc` | ~3 | organisation, divers |
| `prospection` | ~3 | commercial, divers |

### Clés nouvelles (Phase 4) détectées (2 clés)

| Clé nouvelle | Fichier | Ligne |
|-------------|---------|-------|
| `mediatheque.gerer` | `DocumentsTabContent.tsx` | 18 |
| `mediatheque.corbeille` | `DocumentsTabContent.tsx` | 19 |

### Conclusion

- **98.8% des guards utilisent encore des clés legacy** — la migration Phase 4 n'a pas encore commencé sur les guards applicatifs.
- Le **COMPAT_MAP** (Phase 3) assure la rétro-compatibilité pour les 2 clés nouvelles qui existent.
- Les fichiers à plus fort impact pour une migration sont : `sitemapData.ts` (59 guards), `UnifiedWorkspace.tsx` (7+ clés), et les routes (`projects`, `academy`, `rh`, `realisations`).
- **Aucune migration n'est bloquée** : le COMPAT_MAP garantit que les nouvelles clés résolvent via les anciennes.
