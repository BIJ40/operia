

# Plan : Restructuration navigation en 7 domaines

## Résumé

Regrouper les 10 onglets actuels en **7 domaines** (+ Accueil) : Pilotage, Commercial, Organisation, Documents, Ticketing, Aide, Admin. Aucune modification en base de données. Les `moduleKey` techniques restent identiques. Réversible via l'historique.

## Structure cible

```text
Accueil | Pilotage | Commercial | Organisation | Documents | Ticketing | Aide | Admin
```

- **Pilotage** = Stats (6 sous-onglets) + Performance + Actions à mener
- **Commercial** = Prospection (Suivi client, Comparateur, Veille, Prospects, Réalisations) + Devis acceptés + Incohérences
- **Organisation** = Collaborateurs + Apporteurs + Plannings + Réunions + Parc + Conformité (ex AgencyAdminDocuments)
- **Documents** = Médiathèque (inchangé)
- **Ticketing** = inchangé (module restreint)
- **Aide** = Support + Guides + FAQ (fusion)
- **Admin** = inchangé

## Fichiers modifiés (10)

### 1. `src/types/modules.ts`
- `ModuleCategory` : remplacer `stats | salaries | outils | guides` par `pilotage | commercial | organisation`
- Mettre à jour le champ `category` de chaque `MODULE_DEFINITIONS` entry :
  - `agence` → `pilotage` ; `stats` → `pilotage`
  - `rh` → `organisation` ; `parc` → `organisation`
  - `divers_apporteurs` → `organisation` ; `divers_plannings` → `organisation` ; `divers_reunions` → `organisation`
  - `divers_documents` → `documents` (inchangé)
  - `guides` → `aide`
  - `prospection` → `commercial` ; `realisations` → `commercial`
  - `planning_augmente` → `organisation`
  - ticketing, aide, reseau, admin → inchangés

### 2. `src/components/unified/workspace/types.ts`
- `UnifiedTab` : retirer `stats`, `salaries`, `outils`, `guides` ; ajouter `pilotage`, `commercial`, `organisation`
- `DEFAULT_TAB_ORDER` : nouvel ordre

### 3. `src/pages/UnifiedWorkspace.tsx` (L107-118)
- `allTabs` : 7 onglets avec `requiresOption` et `altModules` adaptés
  - `pilotage` : module `stats`, altModules `['agence']`
  - `commercial` : module `prospection`, altModules `['agence', 'realisations']`
  - `organisation` : module `rh`, altModules `['parc', 'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'agence']`
  - `aide` : module `aide`, altModules `['guides']`

### 4. `src/components/unified/workspace/WorkspaceTabBar.tsx`
- `TAB_ACCENTS` : retirer les anciens, ajouter `pilotage: 'pink'`, `commercial: 'orange'`, `organisation: 'green'`

### 5. `src/components/unified/workspace/WorkspaceTabContent.tsx`
- Retirer `TabsContent` pour `stats`, `salaries`, `outils`, `guides`
- Ajouter `TabsContent` pour `pilotage`, `commercial`, `organisation`
- L'onglet `aide` importera le nouveau `AideTabContent`

### 6. `src/components/users/UserModulesTab.tsx`
- `CATEGORY_CONFIG` : remplacer les entrées `stats`, `salaries`, `outils`, `guides` par `pilotage`, `commercial`, `organisation` avec labels, icônes et descriptions mis à jour

## Fichiers créés (3)

### 7. `src/components/unified/tabs/PilotageTabContent.tsx`
- Pill tabs : Stats, Performance, Actions
- Stats = StatsTabContent existant (avec StatsHubProvider)
- Performance = PerformanceDashboard
- Actions = ActionsAMenerTab

### 8. `src/components/unified/tabs/CommercialTabContent.tsx`
- Pill tabs : Suivi client, Devis acceptés, Incohérences
- Suivi client = ProspectionTabContent existant
- Devis acceptés = DevisAcceptesView
- Incohérences = AnomaliesDevisDossierView
- Filtrés par permissions (hasModule/hasModuleOption)

### 9. `src/components/unified/tabs/OrganisationTabContent.tsx`
- Pill tabs : Collaborateurs, Apporteurs, Plannings, Réunions, Parc, Conformité
- Réutilise les composants existants (CollaborateursTabContent inner, MesApporteursTab, PlanningHebdo, RHMeetingsPage, VehiculesTabContent, AgencyAdminDocuments)
- Filtrés par permissions
- MfaGuard maintenu sur Collaborateurs

## Fichier modifié (renommage logique)

### 10. `src/components/unified/tabs/AideTabContent.tsx` (nouveau, remplace l'import de SupportTabContent dans WorkspaceTabContent)
- Pill tabs : Support, Guides, FAQ
- Support = SupportTabContent existant
- Guides = InternalApogeeLayout
- FAQ = contenu FAQ existant

## Ce qui ne change PAS
- Les `moduleKey` techniques (`agence`, `stats`, `rh`, `prospection`...)
- Les tables DB (`user_modules`, `module_registry`, `plan_tier_modules`)
- Le moteur de permissions (`get_user_effective_modules`)
- Les composants métier internes
- `DiversTabContent.tsx` sera conservé (dead code) pour rollback facile

