# 🏗️ AUDIT ARCHITECTURE — 7 Mars 2026

**Auditeur** : Architecte SaaS Senior (IA)  
**Version analysée** : V0.9.1 — Permissions Unifiées  
**Scope** : Organisation code, découpage modules, dépendances, patterns, scalabilité

---

## 📊 SCORE ARCHITECTURE GLOBAL : 6.2 / 10

| Critère | Note | Poids | Commentaire |
|---------|------|-------|-------------|
| Découpage modules | 7/10 | 20% | Bonne isolation des domaines principaux |
| Séparation UI/logique | 5/10 | 20% | Logique métier dans composants et pages |
| Cohérence patterns | 6/10 | 15% | Patterns React Query bien utilisés, mais incohérences |
| Structure dossiers | 6/10 | 15% | Hybride feature-first/type-first non unifié |
| Couplage inter-modules | 7/10 | 15% | Bon, peu de dépendances circulaires |
| Maintenabilité | 5/10 | 15% | Fichiers trop gros, duplication massive |

---

## 1. CARTOGRAPHIE DU PROJET

### 1.1 Volumes

```
src/
├── 27 dossiers racine
├── ~500 fichiers .ts/.tsx
├── ~85,000 lignes de code estimées
├── 7 contextes React
├── ~80 hooks custom
├── ~60 pages
├── ~200 composants
├── 60+ Edge Functions
└── 70+ tables Supabase
```

### 1.2 Architecture Modules — Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                      MODULES DOMAINE                             │
│  (Chacun avec components/, hooks/, pages/, types/)               │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ apogee-      │ │ apogee-      │ │  apporteur/  │             │
│  │ connect/     │ │ tickets/     │ │              │             │
│  │ (Indicateurs)│ │ (Ticketing)  │ │ (Portail)    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ franchiseur/ │ │ statia/      │ │ prospection/ │             │
│  │ (Réseau)     │ │ (Métriques)  │ │ (CRM)        │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐                               │
│  │ planning-v2/ │ │ commercial/  │                               │
│  │ (Plannings)  │ │ (Legacy?)    │                               │
│  └──────────────┘ └──────────────┘                               │
├──────────────────────────────────────────────────────────────────┤
│                      SHARED CORE                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ permissions/ │ │ contexts/    │ │ hooks/       │             │
│  │ (Auth V3)    │ │ (7 contexts) │ │ (~80 hooks)  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ lib/         │ │ types/       │ │ config/      │             │
│  │ (Utilitaires)│ │ (11 types)   │ │ (Config)     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
├──────────────────────────────────────────────────────────────────┤
│                      UI LAYER                                    │
│  ┌──────────────┐ ┌──────────────┐                               │
│  │ components/  │ │ pages/       │                               │
│  │ (~35 dirs)   │ │ (~55 pages)  │                               │
│  └──────────────┘ └──────────────┘                               │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Graphe de Dépendances Inter-Modules

```
                    ┌─────────────┐
                    │ AuthContext  │◄──── 166 fichiers importent
                    │  (572L)     │      useAuth()
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ apogee-     │ │ franchiseur │ │ apogee-     │
    │ connect     │ │             │ │ tickets     │
    └──────┬──────┘ └─────────────┘ └──────┬──────┘
           │                               │
    ┌──────▼──────┐                 ┌──────▼──────┐
    │ statia      │                 │ support/    │
    │ (calculs)   │                 │ (chat)      │
    └──────┬──────┘                 └─────────────┘
           │
    ┌──────▼──────┐
    │ components/ │
    │ dashboard/  │
    │ diffusion/  │
    └─────────────┘

    commercial/ ←→ prospection/ : AUCUN lien (code dupliqué?)
    franchiseur/ ←→ apogee-connect/ : AUCUN import croisé
    statia → franchiseur : via hooks spécialisés (OK)
```

---

## 2. ANALYSE DÉTAILLÉE

### 2.1 Fichiers > 400 lignes (VOLUMINEUX)

| Fichier | Lignes | Module | Problème |
|---------|--------|--------|----------|
| `statia/definitions/advanced2.ts` | **2006** | StatIA | Fichier monstre, ~40 métriques entassées |
| `statia/definitions/advanced.ts` | **1114** | StatIA | Idem, métriques avancées |
| `components/RichTextEditor.tsx` | **986** | UI | Monolithe éditeur WYSIWYG |
| `pages/UnifiedWorkspace.tsx` | **619** | Core | Page-routeur avec UI + logique tabs |
| `contexts/AuthContext.tsx` | **572** | Auth | God Context, trop de responsabilités |
| `pages/DashboardStatic.tsx` | **523** | Core | Logique métier mélangée à l'UI |
| `contexts/EditorContext.tsx` | **499** | Guides | CRUD + cache + sync Supabase |
| `pages/CategoryPage.tsx` | **413** | Guides | UI + DnD + CRUD inline |
| `pages/CategoryActionsAMener.tsx` | **408** | Guides | Quasi-clone de CategoryPage |
| `pages/CategoryHcServices.tsx` | **403** | Guides | Quasi-clone de CategoryPage |
| `lib/cache-manager.ts` | **367** | Core | Cache localStorage complexe |
| `contexts/ApporteurEditorContext.tsx` | **343** | Guides | Clone de EditorContext |
| `contexts/HcServicesEditorContext.tsx` | **318** | Guides | Clone de EditorContext |
| `pages/CategoryApporteur.tsx` | **330** | Guides | Clone de CategoryPage |

### 2.2 Duplication Identifiée

#### A. Triple Contexte Guide (impact ~1160 lignes dupliquées)
```
EditorContext.tsx        (499L) → table `blocks`
ApporteurEditorContext   (343L) → table `apporteur_blocks`
HcServicesEditorContext  (318L) → table `hc_services_blocks`
```
**Duplication** : ~80% du code est identique (CRUD, cache, sync, reorder).  
**Solution** : `GenericBlocksContext<T>(tableName)` avec paramétrage.

#### B. Quadruple Page Category (impact ~1554 lignes dupliquées)
```
CategoryPage.tsx              (413L) → Guide Apogée
CategoryActionsAMener.tsx     (408L) → Actions à mener  
CategoryHcServices.tsx        (403L) → HC Services
CategoryApporteur.tsx         (330L) → Apporteurs
```
**Duplication** : UI quasi-identique (Accordion + DnD + CRUD).  
**Solution** : `GenericCategoryPage<T>(context, routes)`.

#### C. Commercial vs Prospection
```
src/commercial/   → pages/, hooks/, components/ (CRM ancien?)
src/prospection/  → pages/, hooks/, components/, engine/ (CRM nouveau)
```
**Problème** : Aucun import croisé, probablement deux implémentations du même domaine.  
**Solution** : Auditer et fusionner ou supprimer `commercial/`.

### 2.3 Logique Métier dans les Composants UI

| Fichier | Type | Violation |
|---------|------|-----------|
| `pages/AdminAgencies.tsx` | Page | `supabase.from('apogee_agencies').insert/delete` directement |
| `pages/rh/RHMeetingsPage.tsx` | Page | `supabase.from('rh_meetings').insert/delete` inline |
| `pages/admin/AdminNotificationSender.tsx` | Page | `supabase.rpc('create_notification')` inline |
| `components/diffusion/slides/SlideUniversApporteurs.tsx` | Widget | Calculs StatIA inline dans le composant |
| `components/dashboard/widgets/IndicateursGlobauxWidget.tsx` | Widget | `computeStat()` + chargement données inline |
| `pages/DashboardStatic.tsx` | Page | Hero section avec logique RDV/permissions mélangée |

**Pattern attendu** : Hook dédié (useXxx) → Service → Supabase client  
**Pattern trouvé** : Composant UI → Supabase client directement

### 2.4 Structure Dossiers — Incohérences

| Problème | Détail |
|----------|--------|
| **Hybride feature-first / type-first** | `src/apogee-tickets/` (feature) vs `src/components/support/` (type) |
| **`src/lib/` fourre-tout** | 32 fichiers mélangés : RAG, cache, DB, sanitize, formatters |
| **`src/hooks/` plat** | ~80 hooks à la racine, aucun sous-dossier par domaine (sauf `access-rights/`, `rh/`, `admin-tickets/`) |
| **`src/modules/` quasi-vide** | Contient uniquement `interventions_rt/` (orphelin) |
| **`src/services/` anémique** | 3 fichiers seulement alors que la logique métier devrait y être |
| **`src/utils/` vs `src/lib/`** | Deux dossiers pour les utilitaires, rôles flous |
| **`src/shared/` vs `src/components/shared/`** | Duplication de concept |

---

## 3. 🔴 10 PROBLÈMES CRITIQUES

### C1. God Context — AuthContext.tsx (572 lignes)
**Fichier** : `src/contexts/AuthContext.tsx`  
**Module** : Core  
**Raison** : Concentre auth, profil, permissions, modules, rôles, session. 166 fichiers en dépendent. Un changement = cascade de re-renders.  
**Solution** : Séparer en `AuthContext` (auth pure), `ProfileContext` (profil), `PermissionsContext` (modules/rôles). Utiliser composition.

### C2. Fichier monstre — advanced2.ts (2006 lignes)
**Fichier** : `src/statia/definitions/advanced2.ts`  
**Module** : StatIA  
**Raison** : 40+ définitions de métriques dans un seul fichier. Impossible à maintenir, merge conflicts constants.  
**Solution** : Un fichier par catégorie de métriques (existe déjà pour `ca.ts`, `sav.ts` — appliquer le même pattern).

### C3. Triple duplication — EditorContexts (1160 lignes)
**Fichier** : `src/contexts/EditorContext.tsx` + 2 clones  
**Module** : Guides  
**Raison** : 3 contextes quasi-identiques avec ~80% de code en commun. Maintenance triple.  
**Solution** : `createBlocksContext(tableName, config)` factory function.

### C4. Quadruple duplication — CategoryPages (1554 lignes)
**Fichier** : `src/pages/Category*.tsx` (4 fichiers)  
**Module** : Guides  
**Raison** : 4 pages avec la même logique Accordion/DnD/CRUD. Bug fixé sur l'un = oublié sur les 3 autres.  
**Solution** : `GenericCategoryPage` composant paramétrable.

### C5. Absence de couche Service
**Fichier** : `src/services/` (3 fichiers seulement)  
**Module** : Global  
**Raison** : La logique métier est dispersée dans les pages, composants, et hooks. Pas de couche d'abstraction entre l'UI et Supabase.  
**Solution** : Créer des services par domaine : `agencyService.ts`, `rhService.ts`, `ticketService.ts`.

### C6. RichTextEditor monolithique (986 lignes)
**Fichier** : `src/components/RichTextEditor.tsx`  
**Module** : UI  
**Raison** : 986 lignes mélangeant config TipTap, toolbar, menus, extensions, upload, mentions. Impossible à tester unitairement.  
**Solution** : Extraire `EditorToolbar`, `EditorMenuBubble`, `EditorConfig`, `useEditorExtensions()`.

### C7. UnifiedWorkspace trop chargé (619 lignes)
**Fichier** : `src/pages/UnifiedWorkspace.tsx`  
**Module** : Core  
**Raison** : Contient la logique de routing par tab, DnD tabs, résolution permissions, et rendu de 15+ modules. Single point of failure.  
**Solution** : Extraire `useWorkspaceTabs()`, `TabBar`, `TabRouter`. Lazy-load les contenus.

### C8. Modules `commercial/` et `prospection/` non connectés
**Fichier** : `src/commercial/` et `src/prospection/`  
**Module** : CRM  
**Raison** : Deux dossiers traitant du même domaine (CRM/prospects) sans aucun lien. Confusion sur lequel est actif.  
**Solution** : Auditer `commercial/`. S'il est legacy → le supprimer. Sinon fusionner.

### C9. Cache localStorage sans limite de taille
**Fichier** : `src/lib/cache-manager.ts` (367L)  
**Module** : Core  
**Raison** : Le cache localStorage peut exploser (QuotaExceededError). Pas de stratégie d'éviction basée sur la taille totale. Risque avec 100+ organisations.  
**Solution** : Migrer vers IndexedDB (Dexie est déjà installé) pour les données volumineuses. Garder localStorage pour les préférences uniquement.

### C10. Hooks plats non organisés (~80 hooks)
**Fichier** : `src/hooks/` (80+ fichiers)  
**Module** : Global  
**Raison** : Tous les hooks sont à la racine sauf 4 sous-dossiers. Trouver un hook = chercher dans 80 fichiers.  
**Solution** : Organiser par domaine : `hooks/rh/`, `hooks/media/`, `hooks/admin/`, `hooks/support/`, `hooks/apporteur/`.

---

## 4. 🟠 10 PROBLÈMES MODÉRÉS

### M1. DashboardStatic.tsx — Page-composant (523L)
**Fichier** : `src/pages/DashboardStatic.tsx`  
**Raison** : Logique de permissions, widgets conditionnels, et layout mélangés.  
**Solution** : Extraire chaque widget section en composant autonome.

### M2. `src/lib/` fourre-tout (32 fichiers)
**Fichier** : `src/lib/`  
**Raison** : Mélange RAG, DB, cache, sanitize, formatters, sentry, mentions.  
**Solution** : Reorganiser en `lib/rag/`, `lib/auth/`, `lib/formatting/`.

### M3. Pas de barrel exports cohérents
**Fichier** : Plusieurs modules  
**Raison** : Certains modules ont `index.ts` (permissions, apogee-tickets), d'autres non (lib, hooks).  
**Solution** : Ajouter `index.ts` pour chaque module public.

### M4. `DataPreloadContext` charge tout en mémoire
**Fichier** : `src/contexts/DataPreloadContext.tsx`  
**Raison** : Précharge les données Apogée pour toutes les agences. Avec 100+ agences, mémoire significative.  
**Solution** : Charger à la demande par agence active uniquement.

### M5. Formatters dupliqués
**Fichier** : `src/apogee-connect/utils/formatters.ts` et `src/lib/formatters.ts`  
**Raison** : Deux fichiers de formatters avec overlap (`formatEuros`, `formatPercent`).  
**Solution** : Unifier dans `src/shared/utils/formatters.ts`.

### M6. `ImpersonationContext` — Code UI dans le contexte
**Fichier** : `src/contexts/ImpersonationContext.tsx`  
**Raison** : Contient `ROLE_AGENCE_OPTIONS` et `FRANCHISEUR_ROLE_OPTIONS` (données UI).  
**Solution** : Déplacer les options vers `config/roleOptions.ts`.

### M7. Types non centralisés
**Fichier** : `src/types/` (11 fichiers) vs types inline dans les hooks  
**Raison** : Beaucoup de types sont définis dans les hooks au lieu de `src/types/`.  
**Solution** : Centraliser dans `src/types/` avec barrel export.

### M8. `src/modules/interventions_rt/` orphelin
**Fichier** : `src/modules/interventions_rt/`  
**Raison** : Seul module dans `src/modules/`. Pattern non adopté par les autres.  
**Solution** : Migrer vers `src/` racine ou supprimer si non utilisé.

### M9. Support HeatPriority dupliqué
**Fichier** : `src/components/support/HeatPriorityBadge.tsx` ET `src/apogee-tickets/components/HeatPriorityBadge.tsx`  
**Raison** : Deux composants identiques dans deux modules.  
**Solution** : Unifier dans `src/components/shared/HeatPriorityBadge.tsx`.

### M10. `src/public-guide/` — Sous-module isolé
**Fichier** : `src/public-guide/`  
**Raison** : Module pour guides publics sans documentation ni barrel export.  
**Solution** : Documenter ou intégrer dans le module guides principal.

---

## 5. 🔄 10 REFACTORISATIONS PRIORITAIRES

| # | Action | Fichiers | Effort | Impact |
|---|--------|----------|--------|--------|
| R1 | **Unifier les 3 EditorContexts** en factory | `contexts/Editor*.tsx`, `HcServices*.tsx` | 2j | -800L, maintenance ÷3 |
| R2 | **Créer GenericCategoryPage** | `pages/Category*.tsx` (4 fichiers) | 1j | -1100L, bugs ÷4 |
| R3 | **Éclater advanced2.ts** en fichiers par catégorie | `statia/definitions/advanced2.ts` | 0.5j | -2006L → 7×300L |
| R4 | **Décomposer RichTextEditor** en sous-composants | `components/RichTextEditor.tsx` | 1j | Testabilité + maintien |
| R5 | **Séparer AuthContext** en 3 contextes | `contexts/AuthContext.tsx` | 2j | Re-renders ÷3 |
| R6 | **Organiser hooks par domaine** | `hooks/` (80 fichiers) | 0.5j | DX améliorée |
| R7 | **Créer couche services** | `services/` (3 → 10+ fichiers) | 3j | Séparation UI/logique |
| R8 | **Fusionner commercial/ + prospection/** | `commercial/`, `prospection/` | 1j | Clarté domaine CRM |
| R9 | **Migrer cache vers IndexedDB** | `lib/cache-manager.ts` | 1j | Scalabilité storage |
| R10 | **Unifier formatters** | `apogee-connect/utils/formatters.ts`, `lib/formatters.ts` | 0.5j | DRY |

---

## 6. SIMULATION SCALABILITÉ

### 6.1 Scénario : 10 organisations (ACTUEL)

| Aspect | Statut | Risque |
|--------|--------|--------|
| Performance frontend | ✅ OK | Bas |
| Cache localStorage | ✅ OK | ~500KB par agence |
| API Apogée | ✅ OK | Appels séquentiels par agence |
| RLS Supabase | ✅ OK | Scoping agence fonctionnel |
| Edge Functions | ✅ OK | Cold starts acceptables |
| **Verdict** | **Fonctionnel** | |

### 6.2 Scénario : 100 organisations

| Aspect | Statut | Risque |
|--------|--------|--------|
| Performance frontend | ⚠️ | AuthContext re-renders en cascade (166 consommateurs) |
| Cache localStorage | 🔴 | 100 agences × 500KB = 50MB → QuotaExceeded |
| API Apogée | ⚠️ | DataPreloadContext charge tout → mémoire |
| RLS Supabase | ✅ OK | Policies bien scopées (post-audit sécurité) |
| Edge Functions | ⚠️ | CRON `compute-apporteur-metrics` pour 100 agences = timeout |
| Admin module_registry | ⚠️ | Arbre de modules identique pour tous → pas de customisation par orga |
| **Verdict** | **Risques modérés** | Refactoring R5, R9 nécessaires |

### 6.3 Scénario : 1000 organisations

| Aspect | Statut | Risque |
|--------|--------|--------|
| Performance frontend | 🔴 | AuthContext God Object = goulot d'étranglement |
| Cache localStorage | 🔴 | Impossible en localStorage |
| API Apogée | 🔴 | 1000 agences × requêtes simultanées = DDoS sur Apogée |
| RLS Supabase | ⚠️ | Fonction `get_user_agency_id()` appelée dans chaque policy → perf |
| Edge Functions | 🔴 | CRONs ne scalent pas pour 1000 agences |
| Base de données | ⚠️ | Tables non partitionnées (apogee_tickets croîtra linéairement) |
| Facturation | 🔴 | Pas de multi-tenancy DB-level (shared schema) |
| Recherche unifiée | 🔴 | Embeddings non scopés par agence |
| **Verdict** | **Refonte nécessaire** | Multi-tenancy, partitioning, queue system |

### 6.4 Goulots d'Étranglement Identifiés

```
┌─────────────────────────────────────────────────────────┐
│  GOULOTS PAR NOMBRE D'ORGANISATIONS                     │
│                                                         │
│  10 orgs   ──────────────────── OK                      │
│  100 orgs  ────────── Cache localStorage ──── BLOQUANT  │
│  100 orgs  ────────── AuthContext re-renders ── LENT    │
│  100 orgs  ────────── CRON metrics ─────────── TIMEOUT  │
│  1000 orgs ────────── Shared schema ────────── REFONTE  │
│  1000 orgs ────────── API Apogée rate limit ── BLOQUANT │
│  1000 orgs ────────── Edge Fn concurrence ──── BLOQUANT │
└─────────────────────────────────────────────────────────┘
```

---

## 7. POINTS POSITIFS

| Aspect | Détail |
|--------|--------|
| ✅ **Modules domaine bien isolés** | apogee-tickets, franchiseur, statia, apporteur — chacun auto-contenu |
| ✅ **Pas de dépendances circulaires** | Aucun cycle détecté entre modules domaine |
| ✅ **Permissions centralisées V3** | `@/permissions` barrel export, source unique `user_modules` |
| ✅ **StatIA bien architecturé** | Séparation definitions/engine/hooks/api |
| ✅ **Lazy loading** | `App.tsx` utilise `React.lazy()` pour toutes les pages |
| ✅ **React Query** | Utilisation cohérente de TanStack Query pour le data fetching |
| ✅ **RLS solide** | Post-audit sécurité, toutes les tables sont scopées |
| ✅ **Type safety** | TypeScript strict sur les types Supabase auto-générés |
| ✅ **Error boundaries** | GlobalErrorBoundary + LocalErrorBoundary en place |
| ✅ **Edge Functions** | Architecture CORS/auth/rate-limit bien mutualisée dans `_shared/` |

---

## 8. ROADMAP REFACTORING RECOMMANDÉE

### Sprint 1 (Quick wins — 3 jours)
- [ ] R3 : Éclater `advanced2.ts` (0.5j)
- [ ] R6 : Organiser hooks par domaine (0.5j)
- [ ] R10 : Unifier formatters (0.5j)
- [ ] R8 : Auditer et fusionner commercial/prospection (1j)

### Sprint 2 (Duplication — 3 jours)
- [ ] R1 : GenericBlocksContext factory (2j)
- [ ] R2 : GenericCategoryPage (1j)

### Sprint 3 (Architecture — 5 jours)
- [ ] R5 : Séparer AuthContext (2j)
- [ ] R4 : Décomposer RichTextEditor (1j)
- [ ] R7 : Créer couche services (2j)

### Sprint 4 (Scalabilité — 3 jours)
- [ ] R9 : Migrer cache vers IndexedDB (1j)
- [ ] Optimiser DataPreloadContext (lazy loading par agence) (1j)
- [ ] Index DB sur colonnes fréquemment filtrées (1j)

---

## 9. MÉTRIQUES DE SUIVI

| Métrique | Valeur actuelle | Cible post-refactoring |
|----------|----------------|----------------------|
| Fichiers > 400L | 14 | ≤ 3 |
| Lignes dupliquées estimées | ~3,000 | < 500 |
| Fichiers dans `src/hooks/` racine | ~60 | < 15 (reste dans sous-dossiers) |
| Fichiers dans `src/services/` | 3 | > 10 |
| Contextes React | 7 | 5 (après fusion guides) |
| Imports de AuthContext | 166 | < 50 (après split) |
| Score Architecture | 6.2/10 | 8.0/10 |

---

*Audit Architecture HelpConfort — V0.9.1 — 7 Mars 2026*  
*Prochaine révision recommandée : Post-Sprint 3*
