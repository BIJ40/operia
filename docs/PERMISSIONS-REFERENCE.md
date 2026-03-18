# PERMISSIONS SYSTEM — REFERENCE DOCUMENT

> Dernière mise à jour : 2026-03-12
> Statut : **VERROUILLÉ — fail-closed**

---

## 1. Problème racine initial

La RPC `get_user_effective_modules` utilisait `COALESCE(ptm.enabled, true)` : toute clé
présente dans `module_registry` mais **absente** de `plan_tier_modules` était **autorisée
par défaut**. Conséquence : un utilisateur STARTER accédait aux fonctionnalités PRO
(statistiques avancées, corbeille médiathèque, réalisations, réunions).

## 2. Correction structurelle appliquée

| Étape | Description |
|-------|-------------|
| RPC fail-closed | `COALESCE(ptm.enabled, false)` — tout module sans entrée explicite est **refusé** |
| INSERT plan_tier_modules | 8 clés canoniques ajoutées (6 stats + 2 médiathèque) |
| UPDATE plan_tier_modules | `commercial.realisations` et `organisation.reunions` → STARTER=false |
| Suppression ghost keys | 4 clés fantômes (`commercial.suivi_client/comparateur/veille/prospects`) supprimées |
| Suite anti-régression | 3 fichiers de tests (166+ assertions) verrouillant les invariants |

## 3. Invariants garantis

1. **Clé absente = refusée** — Aucun fallback permissif n'existe.
2. **Isolation STARTER/PRO** — Les clés PRO sont explicitement `enabled=false` pour STARTER.
3. **Bypass N5+ uniquement** — Seuls `platform_admin` et `superadmin` court-circuitent les modules.
4. **Zéro ghost key** — Toute clé dans MODULES doit avoir un consommateur runtime ou une justification structurelle.
5. **MODULE_DEFINITIONS = source de vérité** — `MODULE_MIN_ROLES` et `MODULE_LABELS` en dérivent automatiquement.

## 4. Exceptions documentées

### 4.1 `organisation.documents_legaux`

- **Présente dans** : `MODULES`, `MODULE_SHORT_LABELS`, `module_registry`
- **Absente de** : `MODULE_DEFINITIONS`, `plan_tier_modules`
- **Consommée par** : `PermissionsRuntimeProof.tsx` uniquement (devtools, vérifie qu'elle est `false`)
- **Raison** : fonctionnalité non branchée en production. Volontairement hors runtime plan.
- **Règle de raccordement** : quand l'UI de gestion des documents légaux sera livrée, ajouter une `ModuleDefinition` dans `MODULE_DEFINITIONS`, puis une entrée dans `plan_tier_modules` pour chaque tier.

### 4.2 `pilotage.statistiques` (clé conteneur)

- **Présente dans** : `MODULES`, `SHARED_MODULE_KEYS`, `SHARED_MODULE_MIN_ROLES`, `module_registry`, `plan_tier_modules`
- **Absente de** : `MODULE_DEFINITIONS` (volontaire)
- **Rôle** : clé conteneur structurelle qui gate la **visibilité de l'onglet "Statistiques"** dans `PilotageTabContent.tsx`
- **Relation avec les sous-clés** :
  - `pilotage.statistiques.general` → STARTER ✅ / PRO ✅
  - `pilotage.statistiques.apporteurs` → STARTER ❌ / PRO ✅
  - `pilotage.statistiques.techniciens` → STARTER ❌ / PRO ✅
  - `pilotage.statistiques.univers` → STARTER ❌ / PRO ✅
  - `pilotage.statistiques.sav` → STARTER ❌ / PRO ✅
  - `pilotage.statistiques.previsionnel` → STARTER ❌ / PRO ✅
- **Architecture volontaire** : le conteneur contrôle la visibilité globale, les sous-clés contrôlent chaque sous-onglet. Testée par `fail-closed-regression.test.ts`.
- **Règle future** : toute nouvelle sous-clé stats doit être ajoutée dans `MODULES`, dans `module_registry`, et dans `plan_tier_modules` avec le bon mapping STARTER/PRO. Elle n'a **pas** besoin d'aller dans `MODULE_DEFINITIONS` si elle n'a pas d'options.

---

## 5. Inventaire officiel des clés

### Légende

| Catégorie | Description |
|-----------|-------------|
| **RC** | Runtime Canonique — permission métier vérifiée par `hasModule()` |
| **ST** | Structurelle — conteneur ou clé de navigation, pas de permission autonome |
| **OPT** | Option / sous-clé UI — vérifiée par `hasModuleOption()` |
| **ND** | Non déployée — `deployed=false`, masquée des plans |
| **INT** | Interne — exclu de l'UI de gestion des plans |
| **EXC** | Exclue — volontairement hors `plan_tier_modules` |

| Clé | Cat. | Sources | Consommée runtime | Fichier(s) consommateur(s) | Statut |
|-----|------|---------|-------------------|---------------------------|--------|
| `ticketing` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | PilotageTabContent, UnifiedWorkspace, PermissionsRuntimeProof | Conservée |
| `prospection` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | ProspectionTabContent | Conservée |
| `planning_augmente` | ND | MODULES, MODULE_DEFINITIONS, module_registry | ❌ deployed=false | — | Conservée (à surveiller) |
| `reseau_franchiseur` | **RI** | MODULES, MODULE_DEFINITIONS (roleInterface:true) | ✅ canAccessFranchisorInterface | franchisorAccess.ts, navigationStructure | **Interface de rôle** (§7) |
| `admin_plateforme` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | UnifiedWorkspace, navigationStructure | Conservée |
| `unified_search` | INT | MODULES, MODULE_DEFINITIONS, module_registry | ❌ interne | Exclu de PLAN_VISIBLE_MODULES | Conservée |
| `pilotage.statistiques` | ST | MODULES, SHARED_MODULE_KEYS, plan_tier_modules, module_registry | ✅ hasModule | PilotageTabContent (gate onglet Stats) | Conservée |
| `pilotage.statistiques.general` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.apporteurs` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.techniciens` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.univers` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.sav` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.previsionnel` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | StatsTabContent | Conservée |
| `pilotage.statistiques.exports` | RC | MODULES, module_registry | ⚠️ MODULES only | StatsHub (future) | À surveiller |
| `pilotage.performance` | ST | MODULES, module_registry | ✅ hasModule (indirect) | PilotageTabContent (gated via pilotage.agence) | À surveiller |
| `pilotage.actions_a_mener` | ST | MODULES, module_registry | ✅ hasModule (indirect) | PilotageTabContent (gated via pilotage.agence) | À surveiller |
| `pilotage.devis_acceptes` | ST | MODULES, module_registry | ✅ hasModule (indirect) | PilotageTabContent (gated via pilotage.agence) | À surveiller |
| `pilotage.incoherences` | ST | MODULES, module_registry | ✅ hasModule (indirect) | PilotageTabContent (gated via pilotage.agence) | À surveiller |
| `pilotage.agence` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | IndicateursLayout, PilotageTabContent, navigationStructure | Conservée |
| `commercial.realisations` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | UnifiedWorkspace, navigationStructure | Conservée |
| `organisation.salaries` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | navigationStructure, UserModulesTab | Conservée |
| `organisation.apporteurs` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | navigationStructure | Conservée |
| `organisation.plannings` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | navigationStructure | Conservée |
| `organisation.reunions` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | navigationStructure | Conservée |
| `organisation.parc` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | navigationStructure | Conservée |
| `organisation.documents_legaux` | EXC | MODULES, module_registry | ❌ devtools seul | PermissionsRuntimeProof (expects false) | Exclue (voir §4.1) |
| `mediatheque.consulter` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | DocumentsTabContent (implicit) | Conservée |
| `mediatheque.gerer` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | DocumentsTabContent, navigationStructure | Conservée |
| `mediatheque.corbeille` | RC | MODULES, plan_tier_modules, module_registry | ✅ hasModule | DocumentsTabContent | Conservée |
| `mediatheque.documents` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule | navigationStructure | Conservée |
| `support.aide_en_ligne` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | navigationStructure | Conservée |
| `support.guides` | RC | MODULES, MODULE_DEFINITIONS, plan_tier_modules, module_registry | ✅ hasModule + hasModuleOption | AcademyIndex, ApogeeGuide, etc. | Conservée |
| `support.faq` | ST | MODULES, module_registry | ✅ hasModule (indirect) | rightsTaxonomy | À surveiller |
| `support.ticketing` | ST | MODULES, module_registry | ✅ hasModule (compat) | PermissionsRuntimeProof, ticketingAccessTest | Conservée |
| `admin.gestion` | ST | MODULES, module_registry | ❌ navigation only | rightsTaxonomy | Conservée |
| `admin.franchiseur` | ST | MODULES, module_registry | ❌ navigation only | rightsTaxonomy | Conservée |
| `admin.ia` | ST | MODULES, module_registry | ❌ navigation only | — | Conservée |
| `admin.contenu` | ST | MODULES, module_registry | ❌ navigation only | — | Conservée |
| `admin.ops` | ST | MODULES, module_registry | ❌ navigation only | — | Conservée |
| `admin.plateforme` | ST | MODULES, module_registry | ❌ navigation only | — | Conservée |

### Options (vérifiées par `hasModuleOption()`)

| Path | Module parent | Fichier(s) consommateur(s) |
|------|--------------|---------------------------|
| `pilotage.agence.indicateurs` | pilotage.agence | IndicateursLayout |
| `pilotage.agence.actions_a_mener` | pilotage.agence | IndicateursLayout |
| `pilotage.agence.diffusion` | pilotage.agence | IndicateursLayout |
| `pilotage.agence.devis_acceptes` | pilotage.agence | UnifiedWorkspace |
| `organisation.salaries.rh_viewer` | organisation.salaries | navigationStructure |
| `organisation.salaries.rh_admin` | organisation.salaries | navigationStructure |
| `organisation.parc.vehicules` | organisation.parc | navigationStructure |
| `organisation.parc.epi` | organisation.parc | navigationStructure |
| `organisation.parc.equipements` | organisation.parc | navigationStructure |
| `organisation.apporteurs.consulter` | organisation.apporteurs | navigationStructure |
| `organisation.apporteurs.gerer` | organisation.apporteurs | navigationStructure |
| `mediatheque.documents.consulter` | mediatheque.documents | navigationStructure |
| `mediatheque.documents.gerer` | mediatheque.documents | navigationStructure |
| `mediatheque.documents.corbeille_vider` | mediatheque.documents | navigationStructure |
| `support.guides.apogee` | support.guides | AcademyIndex |
| `support.guides.apporteurs` | support.guides | AcademyIndex |
| `support.guides.helpconfort` | support.guides | AcademyIndex |
| `support.guides.faq` | support.guides | AcademyIndex |
| `support.guides.edition` | support.guides | ApogeeGuide, EditorContext, etc. |
| `support.aide_en_ligne.user` | support.aide_en_ligne | navigationStructure |
| `support.aide_en_ligne.agent` | support.aide_en_ligne | navigationStructure |
| `ticketing.kanban` | ticketing | navigationStructure |
| `ticketing.create` | ticketing | navigationStructure |
| `ticketing.manage` | ticketing | navigationStructure |
| `ticketing.import` | ticketing | navigationStructure |
| `prospection.dashboard` | prospection | ProspectionTabContent |
| `prospection.comparateur` | prospection | ProspectionTabContent |
| `prospection.veille` | prospection | ProspectionTabContent |
| `prospection.prospects` | prospection | ProspectionTabContent |
| `commercial.realisations.view` | commercial.realisations | — |
| `commercial.realisations.create` | commercial.realisations | — |
| `commercial.realisations.edit` | commercial.realisations | — |
| `commercial.realisations.validate` | commercial.realisations | — |
| `commercial.realisations.publish_prepare` | commercial.realisations | — |
| `commercial.realisations.export` | commercial.realisations | — |
| `reseau_franchiseur.dashboard` | reseau_franchiseur | navigationStructure |
| `reseau_franchiseur.stats` | reseau_franchiseur | navigationStructure |
| `reseau_franchiseur.agences` | reseau_franchiseur | navigationStructure |
| `reseau_franchiseur.redevances` | reseau_franchiseur | navigationStructure |
| `reseau_franchiseur.comparatifs` | reseau_franchiseur | navigationStructure |
| `admin_plateforme.users` | admin_plateforme | navigationStructure |
| `admin_plateforme.agencies` | admin_plateforme | navigationStructure |
| `admin_plateforme.permissions` | admin_plateforme | navigationStructure |
| `planning_augmente.suggest` | planning_augmente | — (non déployé) |
| `planning_augmente.optimize` | planning_augmente | — (non déployé) |
| `planning_augmente.admin` | planning_augmente | — (non déployé) |

---

## 6. Checklist nouveau module

### Quand ajouter quoi

| Situation | MODULES | MODULE_DEFINITIONS | plan_tier_modules | module_registry |
|-----------|---------|-------------------|-------------------|-----------------|
| **Nouveau module avec options** (ex: `facturation`) | ✅ | ✅ | ✅ par tier | ✅ |
| **Nouveau sous-onglet gate** (ex: `pilotage.statistiques.nouveau`) | ✅ | ❌ (sauf si options) | ✅ par tier | ✅ |
| **Clé structurelle UI** (ex: `admin.nouveau`) | ✅ | ❌ | ❌ | ✅ |
| **Nouvelle option d'un module existant** | ❌ | ✅ (dans options[]) | ❌ | ❌ |
| **Module non déployé** (R&D) | ✅ | ✅ (`deployed: false`) | ❌ | ✅ |

### Règles bloquantes (vérifiées par CI)

1. **Toute clé dans `MODULES`** doit exister dans `module_registry` (DB)
2. **Toute clé dans `MODULE_DEFINITIONS`** doit exister dans `MODULES`
3. **Toute clé `deployed=true` dans `MODULE_DEFINITIONS`** avec `adminOnly !== true` doit avoir une entrée dans `plan_tier_modules`
4. **Toute clé consommée par `hasModule()` dans le frontend** doit exister dans `MODULES`
5. **Aucun fallback permissif** (`COALESCE(..., true)` ou équivalent) n'est autorisé dans la RPC
6. **Aucune clé `deployed=false`** ne peut être activée dans `DEFAULT_MODULES_BY_ROLE`
7. **Toute option path dans `MODULE_OPTION_MIN_ROLES`** doit référencer un module valide de `MODULES`

### Procédure d'ajout

```
1. Ajouter la clé dans MODULES (src/types/modules.ts)
2. Si module avec options → ajouter dans MODULE_DEFINITIONS
3. Si module avec options → ajouter dans MODULE_OPTIONS
4. Insérer dans module_registry (migration SQL)
5. Si permission runtime → insérer dans plan_tier_modules (migration SQL)
6. Si des options ont un min_role → ajouter dans MODULE_OPTION_MIN_ROLES
7. Si edge function → ajouter dans SHARED_MODULE_KEYS + SHARED_MODULE_MIN_ROLES
8. Ajouter le guard hasModule() dans le composant UI
9. Lancer les tests : vitest run src/permissions/__tests__/
```

### Ce qui ne doit JAMAIS devenir une permission autonome

- Clés racines structurelles (`pilotage`, `commercial`, `organisation`, `admin`, `support`, `mediatheque`)
- Sous-onglets gérés par des options de module existant (ex: `prospection.comparateur` = option, pas module)
- Clés internes/devtools (ex: `unified_search`)

---

## 7. Interfaces de rôle (`roleInterface: true`)

### Définition

Une **interface de rôle** est un domaine applicatif dont l'accès est piloté **exclusivement par le rôle global**, et non par le système de modules standard (plans, overwrites, admin modules).

### Propriétés

| Aspect | Comportement |
|--------|-------------|
| Accès | Piloté par `canAccessFranchisorInterface(role)` — rôle global uniquement |
| `plan_tier_modules` | Aucune entrée — l'accès ne dépend pas du plan agence |
| `user_modules` / overwrites | Non utilisé — aucun overwrite nécessaire |
| Admin modules (Droits) | Exclu — n'apparaît pas dans la matrice standard |
| `PLAN_VISIBLE_MODULES` | Exclu (`adminOnly: true`) |
| `DEFAULT_MODULES_BY_ROLE` | Exclu (`defaultForRoles: []`) |
| `MODULE_DEFINITIONS` | Conservé pour compatibilité technique (types, options), mais `roleInterface: true` + `adminOnly: true` |
| Sections internes | Contrôlées par `canAccessFranchisorSection(role, section)` |

### Modules concernés

| Clé | Guard global | Guard sections | Règle |
|-----|-------------|----------------|-------|
| `reseau_franchiseur` | `canAccessFranchisorInterface()` / `has_franchiseur_access()` SQL | `canAccessFranchisorSection()` | N3+ interface, N4+ redevances |

### Fichiers de référence

- `src/permissions/franchisorAccess.ts` — guards centralisés
- `src/permissions/__tests__/franchisor-access.test.ts` — tests unitaires
- `src/permissions/__tests__/role-interface-doctrine.test.ts` — tests CI doctrine

### Comment ajouter une nouvelle interface de rôle

1. Ajouter `roleInterface: true` + `adminOnly: true` + `defaultForRoles: []` dans `MODULE_DEFINITIONS`
2. Créer un fichier `src/permissions/<name>Access.ts` avec les guards centralisés
3. Retirer la clé de `RIGHTS_CATEGORIES` dans `rightsTaxonomy.ts`
4. Ne PAS ajouter d'entrée dans `plan_tier_modules`
5. Ne PAS ajouter dans `DEFAULT_MODULES_BY_ROLE`
6. Ajouter des tests dans `role-interface-doctrine.test.ts`

---

## 8. Règles de contribution futures

1. **Fail-closed par défaut** : un nouveau module est bloqué tant qu'il n'a pas d'entrée `plan_tier_modules`.
2. **Pas de COALESCE(..., true)** dans la RPC ou le moteur permissions.
3. **Pas de clé frontend orpheline** : toute clé lue par `hasModule()` doit exister dans `MODULES`.
4. **Tests obligatoires** : toute modification de clé doit passer `coherence-audit.test.ts`.
5. **Documentation** : toute exception doit être documentée dans ce fichier (§4).
6. **Interfaces de rôle** : toute clé `roleInterface: true` doit respecter la doctrine §7.

1. **Fail-closed par défaut** : un nouveau module est bloqué tant qu'il n'a pas d'entrée `plan_tier_modules`.
2. **Pas de COALESCE(..., true)** dans la RPC ou le moteur permissions.
3. **Pas de clé frontend orpheline** : toute clé lue par `hasModule()` doit exister dans `MODULES`.
4. **Tests obligatoires** : toute modification de clé doit passer `coherence-audit.test.ts`.
5. **Documentation** : toute exception doit être documentée dans ce fichier (§4).

---

## 12. Doctrine de rattachement agence

> Ajouté : 2026-03-12 — **VERROUILLÉ**

### Principe

| Champ | Rôle | Usage autorisé |
|-------|------|----------------|
| `agency_id` (UUID) | **Source unique de vérité** | Filtres métier, compteurs, listes équipe, scopes, requêtes DB |
| `agence` (slug string) | Champ dérivé / informatif | Affichage, construction d'URL Apogée (`{slug}.hc-apogee.fr`), recherche textuelle |

### Règles

1. **Aucun calcul métier critique ne doit dépendre uniquement du slug `agence`.**
2. **Toute nouvelle feature rattachant un utilisateur à une agence doit utiliser `agency_id`.**
3. **Les mutations d'assignation agence doivent mettre à jour `agency_id` ET `agence` (via trigger `normalize_profile_agency`).**
4. **En cas de divergence `agence` / `agency_id`, c'est `agency_id` qui fait foi.**
5. **Les Edge Functions utilisant `profile.agence` pour construire des URLs Apogée (`https://{slug}.hc-apogee.fr`) sont des usages légitimes du slug.**
6. **Les contrôles d'accès agence côté Edge Functions doivent résoudre le slug en UUID et comparer via `agency_id`.**

### Fichiers vérifiés (2026-03-12)

| Fichier | Usage | Statut |
|---------|-------|--------|
| `AdminAgencies.tsx` | Compteur + liste équipe | ✅ Migré vers `agency_id` |
| `use-user-management.ts` | Scope + filtre query | ✅ Migré vers `agency_id` |
| `useUserFilters.ts` | Filtre agence | ✅ Migré (agency_id prioritaire) |
| `AdminNotificationSender.tsx` | Ciblage notification par agence | ✅ Migré vers `agency_id` |
| `DataPreloadContext.tsx` | Slug pour API Apogée | ✅ Usage légitime du slug |
| Edge Functions (get-kpis, commanditaires...) | Slug pour URL Apogée | ✅ Usage légitime du slug |
| `get-client-contact` | Vérification accès agence | ✅ Migré vers `agency_id` (résolution slug→UUID) |
| `_shared/auth.ts` | `assertAgencyAccess` | ✅ Migré vers `agency_id` (UUID) |

### Tests de verrouillage

- Frontend : `src/__tests__/agency-source-of-truth.test.ts` — 8 tests garantissant que `agency_id` prévaut.
- Backend : `supabase/functions/tests/agency-access-control.test.ts` — 6 tests couvrant les cas de divergence slug/UUID.
