# 🔬 AUDIT INTÉGRAL MAXIMAL — 7 Mars 2026

**Équipe d'audit** : Architecte, Sécurité, DB, Performance, React, DevOps, Product, Maintenabilité  
**Version** : V0.9.1 — Permissions Unifiées  
**Scope** : 10 dimensions, analyse exhaustive  
**Projet** : HelpConfort SaaS (Operia V2)

---

## 📊 SYNTHÈSE GLOBALE

| # | Dimension | Score | Criticité dominante |
|---|-----------|-------|---------------------|
| 1 | Architecture | **6.2/10** | Structure hybride, couplage AuthContext |
| 2 | Code Quality | **5.8/10** | Fichiers géants, zéro React.memo, duplication |
| 3 | Sécurité | **7.1/10** | RLS `USING(true)`, Edge Functions sans auth |
| 4 | Base de données | **6.8/10** | 65+ FK sans index, 397 migrations |
| 5 | Performance | **6.5/10** | AuthContext non mémoïsé, 794× `.select('*')` |
| 6 | Permissions | **7.5/10** | Solide mais opaque, pas de diagnostic |
| 7 | UX / Produit | **6.5/10** | "Outils" fourre-tout, technicien sans planning |
| 8 | Scalabilité | **5.5/10** | Pas de pagination, limites 1000 rows |
| 9 | DevOps | **5.0/10** | Pas de monitoring, pas de CI/CD visible |
| 10 | Maintenabilité | **5.5/10** | Documentation partielle, dette technique élevée |

### **SCORE GLOBAL PROJET : 6.2 / 10**

---

# 1 — AUDIT ARCHITECTURE (6.2/10)

## 1.1 Organisation des dossiers

```
src/
├── 27 dossiers racine         ← TROP : hybride feature-first + type-first
├── ~500 fichiers .ts/.tsx
├── ~85,000 lignes estimées
├── 7 contextes React
├── ~80 hooks custom
├── ~60 pages
├── ~200 composants
├── 60+ Edge Functions
└── 70+ tables Supabase
```

### Structure hybride non unifié

| Pattern Feature-First | Pattern Type-First |
|---|---|
| `src/apogee-tickets/` (components + hooks + pages) | `src/hooks/` (80+ hooks mélangés) |
| `src/apporteur/` (contexts + hooks + pages) | `src/components/` (200+ composants) |
| `src/franchiseur/` | `src/pages/` (60+ pages) |
| `src/prospection/` | `src/types/` |

**Problème** : Les nouveaux modules utilisent feature-first (`apogee-tickets/`, `apporteur/`) mais l'ancien code reste en type-first (`src/hooks/`, `src/components/`). Pas de convention unique.

## 1.2 10 Problèmes critiques

| # | Problème | Fichier(s) | Cause | Solution |
|---|----------|------------|-------|----------|
| 1 | **AuthContext "God Provider"** — 572 lignes, 30+ propriétés exposées, 113 composants consommateurs | `src/contexts/AuthContext.tsx` | Tout centralisé dans 1 contexte | Découper en AuthContext + ProfileContext + PermissionsContext |
| 2 | **Aucun React.memo** dans tout le projet (0 occurrence, sauf changelog) | Tous les composants | Non appliqué | Ajouter React.memo sur les 20 composants les plus rendus |
| 3 | **Value objet AuthContext non mémoïsé** — nouvel objet créé à chaque render | `src/contexts/AuthContext.tsx:522-560` | Pas de `useMemo` sur la value | Wrapper la value avec `useMemo` |
| 4 | **794 occurrences de `.select('*')`** dans 89 fichiers | `src/hooks/*.ts`, `src/franchiseur/hooks/*.ts` | Copié-collé systématique | Spécifier les colonnes nécessaires |
| 5 | **Profil + RPC séquentiels au login** — `loadUserData` fait 3 appels en cascade | `src/contexts/AuthContext.tsx:186-326` | `await profile` puis `await rpc` puis `await getUser` | `Promise.all([profile, rpc])` |
| 6 | **Hooks dans `src/hooks/` non catégorisés** — 80+ fichiers à plat | `src/hooks/` | Pas de sous-dossiers par domaine | Regrouper par domaine (support/, media/, admin/) |
| 7 | **Duplication logique support** — HcServicesSection n'utilise pas `createSanitizedHtml` | `src/components/hc-services-guide/HcServicesSection.tsx:104` | `dangerouslySetInnerHTML={{ __html: section.content }}` sans sanitization | Utiliser `createSanitizedHtml` partout |
| 8 | **Module `interventions_rt` orphelin** — seul dans `src/modules/` | `src/modules/interventions_rt/` | Migration incomplète vers feature-first | Décider : soit tout dans modules/, soit fusionner avec le bon domaine |
| 9 | **27 dossiers racine dans `src/`** — fragmentation excessive | `src/` | Ajout ad-hoc de dossiers au fil du temps | Consolider en 10-15 dossiers max |
| 10 | **Pas de barrel exports cohérents** — imports croisés profonds | Multiples | Import `@/components/admin/helpi/HelpiQuestionsTab` au lieu de `@/admin` | Créer des index.ts par module |

## 1.3 10 Problèmes majeurs

| # | Problème | Fichier(s) | Solution |
|---|----------|------------|----------|
| 1 | `src/data/sitemapData.ts` — logique navigation + permissions mélangées | `src/data/sitemapData.ts` | Séparer config navigation / guards permissions |
| 2 | Edge Functions sans shared client factory — chaque fonction crée son propre client | `supabase/functions/*/index.ts` | Utiliser `_shared/supabaseClient.ts` partout |
| 3 | `DataPreloadContext` — 200+ lignes, préchargement conditionnel complexe | `src/contexts/DataPreloadContext.tsx` | Déléguer aux hooks React Query (staleTime) |
| 4 | `ImpersonationContext` duplique la logique `loadUserData` d'AuthContext | `src/contexts/ImpersonationContext.tsx` | Extraire loadUserData en service partagé |
| 5 | Routes admin.routes.tsx — 41 redirections hardcodées | `src/routes/admin.routes.tsx` | Catch-all redirect `/admin/*` → `/?tab=admin` |
| 6 | `src/config/` mélange configuration et logique (roleMatrix.ts contient des fonctions) | `src/config/roleMatrix.ts` | Séparer config pure / fonctions utilitaires |
| 7 | `src/lib/` fourre-tout — 30+ fichiers sans organisation | `src/lib/` | Organiser par domaine (auth/, cache/, query/) |
| 8 | Types inline dans les hooks au lieu de fichiers types dédiés | `src/hooks/*.ts` | Extraire vers `src/types/` par domaine |
| 9 | Logique métier "Pro agency" hardcodée dans AuthContext | `src/contexts/AuthContext.tsx:257-282` | Extraire en fonction utilitaire `resolvePlanModules()` |
| 10 | Composants `src/components/` — 40+ sous-dossiers sans hiérarchie claire | `src/components/` | Regrouper par feature, pas par type UI |

## 1.4 10 Améliorations structurelles

| # | Amélioration | Impact | Effort |
|---|-------------|--------|--------|
| 1 | Adopter feature-first uniformément : `src/features/{domaine}/` | Cohérence, DX | 3j |
| 2 | Créer un service layer (`src/services/`) pour la logique métier | Séparation concerns | 2j |
| 3 | Extraire AuthContext en 3 contextes spécialisés | -70% re-renders | 1j |
| 4 | Barrel exports par domaine (`@/features/support`, `@/features/rh`) | DX, refactoring | 1j |
| 5 | Shared Edge Function client factory | Cohérence, maintenance | 1j |
| 6 | Convention de nommage forcée (ESLint naming-convention) | Qualité code | 2h |
| 7 | Path aliases consolidés (`@/` → 5-6 alias max) | Lisibilité imports | 1h |
| 8 | Storybook pour les composants UI partagés | Documentation vivante | 3j |
| 9 | Architecture Decision Records (ADR) dans `docs/adr/` | Traçabilité décisions | 1j |
| 10 | Dependency graph visualization (madge) | Détection cycles | 1h |

---

# 2 — AUDIT CODE QUALITY (5.8/10)

## 2.1 Métriques

| Métrique | Valeur | Seuil acceptable | Verdict |
|----------|--------|-------------------|---------|
| React.memo usage | **0** | 20+ composants | 🔴 CRITIQUE |
| useMemo dans contextes | **1 fichier** (DataPreload) | Tous les contextes | 🔴 CRITIQUE |
| `.select('*')` | **794 occurrences** / 89 fichiers | < 50 | 🔴 CRITIQUE |
| AuthContext consumers | **113 fichiers** (585 appels) | < 30 par contexte | 🔴 CRITIQUE |
| localStorage usage | **276 occurrences** / 27 fichiers | Centralisé en service | 🟠 MAJEUR |
| dangerouslySetInnerHTML | **95 occurrences** / 11 fichiers | Toujours via sanitizer | 🟠 MAJEUR |
| Edge Functions | **60+** | < 30 (grouper) | 🟠 MAJEUR |
| Migrations | **397 fichiers** | < 50 (squash) | 🟠 MAJEUR |

## 2.2 20 Fichiers problématiques

| # | Fichier | Lignes | Problème | Module |
|---|---------|--------|----------|--------|
| 1 | `src/contexts/AuthContext.tsx` | 572 | God Provider, 30+ props, non mémoïsé | auth |
| 2 | `src/pages/UnifiedWorkspace.tsx` | 619 | Mega composant avec 10+ tabs | workspace |
| 3 | `src/integrations/supabase/types.ts` | 5000+ | Auto-généré, non-éditable mais consulté souvent | supabase |
| 4 | `src/data/sitemapData.ts` | ~400 | Config + logique mélangées | navigation |
| 5 | `src/config/changelog.ts` | 990+ | Données statiques massives dans le bundle | config |
| 6 | `src/pages/CategoryActionsAMener.tsx` | ~350 | Page avec logique CRUD inline | guides |
| 7 | `src/components/guides/apogee/InternalGuideCategoryPanel.tsx` | ~370 | Composant monolithique | guides |
| 8 | `src/hooks/use-user-management.ts` | ~300 | Hook géant, multiples responsabilités | users |
| 9 | `src/contexts/DataPreloadContext.tsx` | 200+ | Préchargement conditionnel complexe | preload |
| 10 | `src/contexts/ImpersonationContext.tsx` | ~200 | Duplique loadUserData | auth |
| 11 | `src/components/rh/` | dir | 20+ composants non catégorisés | rh |
| 12 | `src/apogee-tickets/` | dir | Bon isolement mais hooks internes > 200 lignes | ticketing |
| 13 | `src/lib/cache-manager.ts` | ~330 | Logique complexe localStorage + IndexedDB | cache |
| 14 | `src/components/admin/` | dir | 15+ sous-dossiers, pas de barrel exports | admin |
| 15 | `src/hooks/useCollaborators.ts` | ~200 | Queries + mutations mélangées | rh |
| 16 | `src/franchiseur/` | dir | Hooks avec `.select('*')` systématique | franchiseur |
| 17 | `src/planning-v2/` | dir | Module entier non intégré dans feature-first | planning |
| 18 | `src/commercial/` | dir | Module orphelin, non référencé dans routes | commercial |
| 19 | `src/statia/` | dir | Calculs lourds côté client sans memoization | stats |
| 20 | `scripts/check-architecture.sh` | 232 | Script bash monolithique | scripts |

## 2.3 Refactorisations recommandées

| Priorité | Refactorisation | Fichier(s) | Gain |
|----------|----------------|------------|------|
| 🔴 P0 | Mémoïser `AuthContext.Provider value` avec `useMemo` | `AuthContext.tsx:522` | -40% re-renders app-wide |
| 🔴 P0 | Ajouter `React.memo` sur 20 composants feuilles les plus fréquents | `*Widget.tsx`, `*Card.tsx` | -30% renders |
| 🔴 P0 | Paralléliser `loadUserData` (Promise.all) | `AuthContext.tsx:186` | -300ms login |
| 🔴 P1 | Remplacer `.select('*')` par colonnes explicites (top 20 hooks) | 20 fichiers hooks | -60% payload réseau |
| 🔴 P1 | Découper AuthContext en 3 contextes | `AuthContext.tsx` | Isolation re-renders |
| 🟠 P2 | Extraire `changelog.ts` en lazy-loaded JSON | `config/changelog.ts` | -50KB bundle initial |
| 🟠 P2 | Centraliser localStorage dans un service unique | 27 fichiers | Maintenabilité |
| 🟡 P3 | Squash migrations (397 → ~30) | `supabase/migrations/` | DX, CI speed |

---

# 3 — AUDIT SÉCURITÉ (7.1/10)

## 3.1 Authentification

| Aspect | Statut | Détail |
|--------|--------|--------|
| Auth principale | ✅ Supabase Auth | JWT, auto-refresh, persist session |
| Auth apporteur | ✅ OTP custom | SHA-256, rate limit 5/15min, sessions séparées |
| Compte désactivé | ✅ Déconnexion forcée | `is_active=false` → signOut côté client |
| Must change password | ✅ WelcomeWizardGate | Bloque navigation |
| Token refresh tab-switch | ✅ Protégé | `currentUserIdRef` évite re-render |

## 3.2 Failles critiques

| # | Faille | Fichier | Cause | Exploitabilité | Solution |
|---|--------|---------|-------|----------------|----------|
| 1 | **XSS — `dangerouslySetInnerHTML` sans sanitization** | `src/components/hc-services-guide/HcServicesSection.tsx:104,175` | `{{ __html: section.content }}` directement | 🔴 Si un admin injecte du script dans le contenu guide | Utiliser `createSanitizedHtml()` comme partout ailleurs |
| 2 | **RLS policies `USING(true)`** — accès universel en lecture | ~11 tables (cf. audit DB) | Policies trop permissives | 🟠 Données visibles par tous les users authentifiés | Restreindre par `agency_id` ou `user_id` |
| 3 | **20+ Edge Functions avec `verify_jwt: false`** | `supabase/functions/*/index.ts` | Certaines n'ont pas d'auth interne | 🟠 Appel direct possible sans JWT | Ajouter vérification auth interne |
| 4 | **Session apporteur durée 7 jours** non révocable côté client | `apporteur_sessions` | TTL trop long pour un portail externe | 🟡 Session volée = accès 7j | Réduire à 24h, ajouter fingerprint device |

## 3.3 Failles exploitables (théoriques)

| # | Vecteur | Impact | Probabilité | Fichier |
|---|---------|--------|-------------|---------|
| 1 | Injection XSS via contenu guide HcServices | Vol de session admin | Faible (nécessite accès éditeur) | `HcServicesSection.tsx` |
| 2 | Lecture données cross-agency via `USING(true)` | Fuite données inter-agences | Moyenne (user authentifié) | Policies RLS |
| 3 | Appel Edge Function sans JWT | Exécution non autorisée | Faible (fonctions low-risk) | `verify_jwt: false` |
| 4 | Élévation de privilèges via `global_role` client-side | N/A — validé côté serveur | Nulle | `AuthContext.tsx` |

## 3.4 Corrections recommandées

| Priorité | Correction | Fichier | Effort |
|----------|-----------|---------|--------|
| 🔴 P0 | Sanitizer `HcServicesSection.tsx` avec `createSanitizedHtml` | `HcServicesSection.tsx:104,175` | 5min |
| 🔴 P0 | Auditer et restreindre les 11 tables RLS `USING(true)` | Supabase Dashboard | 2h |
| 🔴 P1 | Ajouter auth interne aux Edge Functions `verify_jwt: false` critiques | 20 edge functions | 4h |
| 🟠 P2 | Réduire TTL session apporteur à 24h | `apporteur-auth-verify-code` | 15min |
| 🟠 P2 | Ajouter rate limiting sur `create-user`, `reset-user-password` | Edge functions | 1h |
| 🟡 P3 | Content Security Policy headers | `index.html` / Vite config | 30min |

---

# 4 — AUDIT BASE DE DONNÉES (6.8/10)

## 4.1 Volumes

| Métrique | Valeur |
|----------|--------|
| Tables | 70+ |
| Migrations | **397 fichiers** (3.3/jour en moyenne) |
| Foreign Keys sans index | **65+** |
| RLS activé | 100% tables |
| Tables sans policy | ~11 |
| RPC Functions | 50+ |
| Triggers | 20+ |

## 4.2 Tables problématiques

| # | Table | Problème | Impact | Solution |
|---|-------|----------|--------|----------|
| 1 | `apogee_tickets` | **35+ colonnes** — God Table | Queries lentes, maintenance difficile | Extraire metadata, roadmap, qualification en tables liées |
| 2 | `profiles` | `enabled_modules` JSONB duplique `user_modules` table | Source de vérité ambiguë | Supprimer `enabled_modules` de profiles |
| 3 | `sensitive_data_access_log` vs `sensitive_data_access_logs` | **Tables dupliquées** (singulier/pluriel) | Confusion, données éparpillées | Fusionner en une seule table |
| 4 | `metrics_apporteur_daily` | Pas de partition, croissance illimitée | Queries de plus en plus lentes | Partitionner par mois |
| 5 | `support_tickets` + `apogee_tickets` | Double système de tickets | Confusion utilisateur et développeur | Unifier en un seul système |
| 6 | `agency_commercial_profile` | `date_creation` en type `text` au lieu de `date` | Impossible de comparer/trier | Migrer en `date` |
| 7 | `chatbot_queries` | Sans pagination dans le hook (`.limit(100)` hardcodé) | Perte données au-delà de 100 | Pagination cursor-based |
| 8 | `collaborators` | Sync bidirectionnelle avec `profiles` via triggers | Boucles infinies potentielles (guard `pg_trigger_depth`) | Simplifier : source unique |
| 9 | `media_folders` | Arbre récursif sans index sur `parent_id` | Traversée lente | Ajouter index |
| 10 | `feature_flags` | Pas de cache client, requêté à chaque page | N requêtes inutiles | staleTime: Infinity |

## 4.3 Index à créer (Top 10)

```sql
-- 🔴 CRITIQUE : FK sans index sur tables à fort trafic
CREATE INDEX CONCURRENTLY idx_tickets_created_by ON apogee_tickets(created_by_user_id);
CREATE INDEX CONCURRENTLY idx_tickets_kanban_status ON apogee_tickets(kanban_status);
CREATE INDEX CONCURRENTLY idx_tickets_module ON apogee_tickets(module);
CREATE INDEX CONCURRENTLY idx_faq_items_category ON faq_items(category_id);
CREATE INDEX CONCURRENTLY idx_media_folders_parent ON media_folders(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_media_links_asset ON media_links(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_collaborators_agency ON collaborators(agency_id);
CREATE INDEX CONCURRENTLY idx_collaborators_user ON collaborators(user_id);
CREATE INDEX CONCURRENTLY idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX CONCURRENTLY idx_activity_log_agency ON activity_log(agency_id, created_at DESC);
```

## 4.4 Optimisations SQL

| # | Optimisation | Gain estimé | Effort |
|---|-------------|-------------|--------|
| 1 | Créer les 10 index FK manquants | -50% temps JOINs | 30min |
| 2 | Squash migrations 397 → ~30 | CI -80% plus rapide | 2h |
| 3 | Partitionner `metrics_apporteur_daily` par mois | Scalabilité ∞ | 1h |
| 4 | Archiver `activity_log` > 90j | Volume DB -40% | 1h |
| 5 | Supprimer table dupliquée `sensitive_data_access_log(s)` | Clarté | 15min |
| 6 | Convertir colonnes `text` → `date` | Intégrité données | 30min |
| 7 | Ajouter `LIMIT` aux RPC qui retournent des listes | Sécurité scalabilité | 1h |
| 8 | Index composite `(agency_id, created_at)` sur tables à forte requête | -30% queries | 30min |

---

# 5 — AUDIT PERFORMANCE (6.5/10)

## 5.1 Re-renders React

| Problème | Impact | Fichier | Solution |
|----------|--------|---------|----------|
| AuthContext value non mémoïsé | Chaque changement d'état → re-render 113 composants | `AuthContext.tsx:522-560` | `useMemo` sur la value |
| 0 `React.memo` dans tout le projet | Chaque re-render parent → cascade enfants | Tous composants | Ajouter sur composants feuilles |
| `accessContext` recalculé à chaque render | Nouveau objet → useCallback deps changent | `AuthContext.tsx:160-164` | `useMemo` sur accessContext |
| `DataPreloadContext` — seul contexte avec `useMemo` | Autres contextes pas optimisés | `DataPreloadContext.tsx` | Appliquer le même pattern partout |

## 5.2 Appels API

| Problème | Occurrences | Impact | Solution |
|----------|-------------|--------|----------|
| `.select('*')` | 794 dans 89 fichiers | Payload surdimensionné | Colonnes explicites |
| Pas de `.range()` côté client | 0 occurrence client (seulement export) | Limite 1000 rows silencieuse | Ajouter pagination |
| `loadUserData` séquentiel | 3 appels en cascade | +300ms login | `Promise.all` |
| `getUser()` après `loadUserData` | Appel supplémentaire pour Sentry | +100ms login | Passer le user déjà disponible |
| Pas de `staleTime` sur feature_flags | Requête à chaque navigation | Bande passante gaspillée | `staleTime: Infinity` |

## 5.3 20 Optimisations prioritaires

| # | Optimisation | Fichier | Gain | Effort |
|---|-------------|---------|------|--------|
| 1 | `useMemo` sur AuthContext value | `AuthContext.tsx:522` | -40% re-renders | 15min |
| 2 | `Promise.all` dans `loadUserData` | `AuthContext.tsx:186` | -300ms login | 15min |
| 3 | `React.memo` sur 20 composants Widget/Card | `*Widget.tsx` | -30% renders | 1h |
| 4 | `.select('col1,col2')` sur top 10 hooks | `useApporteurs.ts` etc. | -60% payload | 1h |
| 5 | `staleTime: 5min` sur queries référentielles | `useFeatureFlags.ts` | -90% requêtes | 15min |
| 6 | Lazy load `recharts` | `StatIA`, `Dashboard` | -200KB initial bundle | 30min |
| 7 | Lazy load `xlsx` | `useRHExport.ts` | -200KB initial bundle | 15min |
| 8 | Lazy load `jspdf` + `html2canvas` | `generate-*.ts` | -150KB initial bundle | 15min |
| 9 | `useMemo` sur `accessContext` | `AuthContext.tsx:160` | -50% useCallback invalidations | 5min |
| 10 | Supprimer `getUser()` redondant dans loadUserData | `AuthContext.tsx:303` | -100ms login | 5min |
| 11 | Virtualisation listes longues (`react-window` installé, non utilisé) | Tables admin | -80% DOM nodes | 2h |
| 12 | Pagination `.range()` sur metrics_apporteur_daily | `useApporteurAlerts.ts` | Évite timeout 1000 rows | 30min |
| 13 | Extraire `changelog.ts` en fichier JSON chargé dynamiquement | `config/changelog.ts` | -50KB bundle | 15min |
| 14 | `useCallback` sur fonctions passées en props | Composants formulaires | -20% re-renders enfants | 1h |
| 15 | Debounce recherche tickets | `usePersistedFilters.ts` | -80% requêtes | 15min |
| 16 | Code splitting par route (déjà `React.lazy` sur pages) | Vérifier couverture | -30% initial load | 30min |
| 17 | Prefetch données tab adjacent | `UnifiedWorkspace.tsx` | UX fluidité | 1h |
| 18 | Image optimization (srcset, WebP) | Assets statiques | -40% images | 1h |
| 19 | Service Worker cache API responses | `vite-plugin-pwa` | Offline first | 2h |
| 20 | `Map` au lieu de `.find()` dans boucles N×M | `usePlanningV2Data` | O(N) au lieu O(N×M) | 30min |

---

# 6 — AUDIT PERMISSIONS (7.5/10)

## 6.1 Architecture

```
7 rôles hiérarchiques (N0-N6)
× 16 modules (avec options granulaires)
× Cascade 3 niveaux : Plan → Rôle → Override user
= ~50 permissions effectives par utilisateur
```

**Points forts :**
- ✅ `SECURITY DEFINER` sur toutes les RPC de permissions
- ✅ `has_min_global_role()`, `has_module_v2()`, `has_module_option_v2()` côté DB
- ✅ N5+ bypass complet (superadmin)
- ✅ Permissions vérifiées côté serveur (Edge Functions + RLS)
- ✅ Pas d'escalade triviale (globalRole lu en DB, pas localStorage)

**Problèmes :**

| # | Problème | Impact | Fichier | Solution |
|---|----------|--------|---------|----------|
| 1 | **Pas de diagnostic permissions** — "Pourquoi X ne voit pas Y ?" | Support chronophage | N/A | Créer un outil admin `explainAccess(userId, module)` |
| 2 | **7 niveaux de vérification** pour un simple check module | Opacité, debugging difficile | Permission cascade | Documenter la chaîne + logging dev |
| 3 | **Logique Pro hardcodée** dans AuthContext (stats_hub forcé) | Couplage plan/code | `AuthContext.tsx:257-282` | Externaliser dans `resolvePlanModules()` |
| 4 | **`hasAccessToScope` = toujours true** — stub vide | Code mort confus | `AuthContext.tsx:513` | Supprimer ou implémenter |
| 5 | **Nommage `divers_*` obsolète** dans modules | Confusion code/UI | `types/modules.ts` | Renommer en noms métiers |

---

# 7 — AUDIT UX / PRODUIT (6.5/10)

## 7.1 Problèmes critiques

| # | Problème | Impact | Persona |
|---|----------|--------|---------|
| 1 | **"Outils" = fourre-tout** de 6 modules sans lien | Navigation confuse | N2 (dirigeant) |
| 2 | **Technicien (N1) sans planning** | Fonctionnalité bloquée | N1 (technicien) |
| 3 | **75% Guides désactivés** mais onglets grisés visibles | Frustration | Tous |
| 4 | **Onglet TEST visible en production** | Crédibilité produit | Tous |
| 5 | **Franchiseur isolé** — pas d'accès guides/aide/ticketing | Fonctionnalités manquantes | N3-N4 |
| 6 | **Pas de notifications in-app** | Engagement faible | Tous |
| 7 | **Pas de recherche globale** (Command+K) | Productivité | Tous |
| 8 | **Pas d'empty states** avec CTA | Onboarding impossible | Nouveaux users |
| 9 | **Double système support** (support_tickets + apogee_tickets) | Confusion | Support |
| 10 | **Profil en faux dropdown** au lieu d'onglet standard | Anti-pattern UX | Tous |

## 7.2 Satisfaction par persona

| Persona | Score | Blocage principal |
|---------|-------|-------------------|
| Technicien (N1) | **4/10** | Pas de planning, dashboard = démo |
| Dirigeant (N2) | **7/10** | "Outils" confus |
| Animateur réseau (N3) | **6/10** | Isolé des fonctionnalités communes |
| Admin plateforme (N5+) | **8/10** | 25 vues admin = complexe |

---

# 8 — AUDIT SCALABILITÉ (5.5/10)

## 8.1 Simulation charge

| Scénario | 10 agences | 100 agences | 1000 agences |
|----------|-----------|-------------|--------------|
| Users simultanés | 50 | 500 | 5000 |
| Taille DB | 500MB | 5GB | 50GB |
| Requêtes/min | 200 | 2000 | 20000 |
| `metrics_apporteur_daily` rows | 3K | 30K | 300K |
| `activity_log` rows/mois | 5K | 50K | 500K |

## 8.2 Verrous techniques

| # | Verrou | Seuil de rupture | Fichier/Table | Solution |
|---|--------|-------------------|---------------|----------|
| 1 | **Pas de pagination** — limite 1000 rows Supabase silencieuse | 100 agences | Toutes les queries `.select('*')` | `.range()` systématique |
| 2 | **`activity_log` sans archivage** | 6 mois (~300K rows) | `activity_log` | Politique de rétention + archivage |
| 3 | **`metrics_apporteur_daily` non partitionné** | 100 agences × 365j | `metrics_apporteur_daily` | Partition par mois |
| 4 | **Calculs statistiques côté client** (StatIA) | 50+ techniciens/agence | `src/statia/` | Pré-calculer en RPC/Edge Function |
| 5 | **AuthContext re-render cascade** | 200+ composants montés | `AuthContext.tsx` | Découper contextes |
| 6 | **Edge Functions cold start** × 60+ fonctions | Concurrence élevée | `supabase/functions/` | Grouper en moins de fonctions |
| 7 | **Pas de CDN pour assets statiques** | Trafic mondial | Images, guides | CDN Supabase Storage + cache headers |
| 8 | **Pas de connection pooling configuré** | 100+ connexions simultanées | Supabase config | PgBouncer (activé par défaut sur Supabase Pro) |
| 9 | **RPC `get_user_effective_modules`** — exécutée à chaque login + impersonation | 1000 users | `AuthContext.tsx` + `ImpersonationContext.tsx` | Cache client 5min |
| 10 | **`select('*')` sur `apogee_tickets` (35 colonnes)** | 10K+ tickets | Hooks ticketing | Colonnes explicites |

## 8.3 Limites multi-tenant

| Aspect | Statut | Risque |
|--------|--------|--------|
| Isolation données par agency_id | ✅ RLS policies | Faible (sauf tables `USING(true)`) |
| Isolation storage | ✅ Buckets par agence | Faible |
| Isolation calculs | ❌ Pas de queue/worker | Élevé à 1000 agences |
| Rate limiting | ⚠️ Uniquement sur OTP apporteur | Moyen |
| Quotas storage | ✅ `use-storage-quota.ts` | Faible |

---

# 9 — AUDIT DEVOPS (5.0/10)

## 9.1 Configuration environnement

| Aspect | Statut | Détail |
|--------|--------|--------|
| Secrets | ✅ Supabase Vault | Pas dans le code (sauf anon key publique) |
| Variables env | ✅ `VITE_SUPABASE_*` auto-peuplées | `.env` auto-géré |
| Feature flags | ✅ Table `feature_flags` | Mais pas de cache client |
| Maintenance mode | ✅ `maintenance_settings` | Toggle DB |

## 9.2 Problèmes critiques

| # | Problème | Impact | Solution |
|---|----------|--------|----------|
| 1 | **Pas de CI/CD visible** — pas de GitHub Actions, pas de tests automatisés | Régressions non détectées | Configurer GitHub Actions (lint + test + build) |
| 2 | **0 test unitaire exécutable** — vitest installé mais pas de tests trouvés | Qualité non vérifiable | Écrire tests pour permissions engine + hooks critiques |
| 3 | **Pas de monitoring applicatif** — Sentry installé mais pas de dashboards d'alerte | Incidents non détectés | Configurer alertes Sentry (error rate, performance) |
| 4 | **Pas de health check endpoint** | Impossible de monitorer uptime | Créer Edge Function `health-check` |
| 5 | **397 migrations non squashées** | Deploy lent, rollback impossible | Squash mensuel |
| 6 | **Pas de backup automatisé visible** — `use-admin-backup.ts` existe mais c'est un export manuel | Risque perte données | Supabase Point-in-Time Recovery (PITR) |
| 7 | **Edge Functions non testées** — pas de tests Deno visibles | Régressions edge functions | Ajouter `_test.ts` par fonction |
| 8 | **Pas de staging environment** | Tests en production | Créer projet Supabase staging |
| 9 | **Logs non centralisés** — `console.log` + `logAuth` custom | Debugging difficile | Structured logging + log drain |
| 10 | **DEPLOY.md = 1 ligne** (`Auto-deploy enabled`) | Aucune documentation déploiement | Documenter le processus complet |

---

# 10 — AUDIT MAINTENABILITÉ (5.5/10)

## 10.1 Documentation

| Document | Existe | À jour | Qualité |
|----------|--------|--------|---------|
| `ARCHITECTURE.md` | ✅ | ⚠️ Partiel | Structure OK mais incomplet |
| `docs/USER_SYNC_ARCHITECTURE.md` | ✅ | ✅ | Excellent |
| `docs/MODULES_DOCUMENTATION.md` | ✅ | ⚠️ | Correct |
| `.lovable/plan.md` | ✅ | ✅ | Bon plan de migration |
| API documentation | ❌ | N/A | Aucune |
| Edge Functions documentation | ❌ | N/A | Aucune (60+ fonctions non documentées) |
| Onboarding développeur | ❌ | N/A | Aucune |
| ADR (Architecture Decision Records) | ❌ | N/A | Aucune |

## 10.2 Zones fragiles

| Zone | Fragilité | Cause | Impact si modification |
|------|-----------|-------|----------------------|
| `AuthContext.tsx` | 🔴 Très fragile | God Provider, 113 consumers | Tout casse |
| Système de permissions (cascade 7 niveaux) | 🔴 Fragile | Complexité cachée | Comportement inattendu |
| Sync bidirectionnelle `profiles` ↔ `collaborators` | 🔴 Fragile | Triggers croisés avec guard `pg_trigger_depth` | Données incohérentes |
| `UnifiedWorkspace.tsx` | 🟠 Fragile | 619 lignes, 10+ tabs conditionnels | Régression UI |
| Edge Functions (60+) | 🟠 Fragile | Pas de tests, pas de shared patterns | Régressions silencieuses |
| Système de modules (`MODULE_DEFINITIONS`) | 🟡 Modéré | Bien architecturé mais migration legacy en cours | Confusion legacy/v2 |

## 10.3 Dette technique quantifiée

| Type de dette | Volume | Coût de remboursement |
|---------------|--------|----------------------|
| Fichiers > 400 lignes | ~15 fichiers | 3j refactoring |
| `.select('*')` → colonnes explicites | 794 occurrences / 89 fichiers | 2j |
| React.memo manquants | ~50 composants | 1j |
| Tests manquants | 0 tests → 50 tests critiques | 5j |
| Documentation manquante | 60+ Edge Functions, API, onboarding | 3j |
| Migrations à squasher | 397 → ~30 | 2h |
| Tables dupliquées à fusionner | 3 paires | 1j |
| **TOTAL DETTE** | | **~15 jours-homme** |

---

# 🏆 SYNTHÈSE FINALE

## Score global : 6.2 / 10

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Architecture    ████████████░░░░░░░░  6.2             │
│   Code Quality    ███████████░░░░░░░░░  5.8             │
│   Sécurité        ██████████████░░░░░░  7.1             │
│   Base de données ████████████████░░░░  6.8             │
│   Performance     █████████████░░░░░░░  6.5             │
│   Permissions     ███████████████░░░░░  7.5             │
│   UX / Produit    █████████████░░░░░░░  6.5             │
│   Scalabilité     ███████████░░░░░░░░░  5.5             │
│   DevOps          ██████████░░░░░░░░░░  5.0             │
│   Maintenabilité  ███████████░░░░░░░░░  5.5             │
│                                                         │
│   GLOBAL          ████████████░░░░░░░░  6.2 / 10        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Top 15 Risques Techniques

| # | Risque | Dimension | Sévérité |
|---|--------|-----------|----------|
| 1 | AuthContext non mémoïsé → re-renders app-wide | Performance | 🔴 Critique |
| 2 | XSS dans HcServicesSection (pas de sanitization) | Sécurité | 🔴 Critique |
| 3 | 0 tests automatisés | DevOps | 🔴 Critique |
| 4 | 65+ FK sans index | Database | 🔴 Critique |
| 5 | Pas de pagination → limite 1000 rows silencieuse | Scalabilité | 🔴 Critique |
| 6 | RLS `USING(true)` sur 11 tables | Sécurité | 🟠 Élevé |
| 7 | 794× `.select('*')` → payloads surdimensionnés | Performance | 🟠 Élevé |
| 8 | Pas de monitoring/alertes | DevOps | 🟠 Élevé |
| 9 | 397 migrations non squashées | Maintenabilité | 🟠 Élevé |
| 10 | Technicien N1 sans accès planning | Produit | 🟠 Élevé |
| 11 | Sync bidirectionnelle profiles↔collaborators fragile | Architecture | 🟠 Élevé |
| 12 | 60+ Edge Functions sans tests | DevOps | 🟠 Élevé |
| 13 | `metrics_apporteur_daily` non partitionné | Scalabilité | 🟡 Moyen |
| 14 | Onglet TEST visible en production | Produit | 🟡 Moyen |
| 15 | Double système support (2 tables tickets) | Architecture | 🟡 Moyen |

## Top 15 Améliorations à Fort Impact

| # | Amélioration | Gain | Effort | ROI |
|---|-------------|------|--------|-----|
| 1 | `useMemo` sur AuthContext value | -40% re-renders | 15min | ★★★★★ |
| 2 | Sanitizer HcServicesSection | Ferme faille XSS | 5min | ★★★★★ |
| 3 | `Promise.all` dans loadUserData | -300ms login | 15min | ★★★★★ |
| 4 | Créer 10 index FK manquants | -50% temps JOINs | 30min | ★★★★★ |
| 5 | Ajouter `React.memo` sur 20 composants | -30% renders | 1h | ★★★★☆ |
| 6 | Masquer onglet TEST + guides disabled | Crédibilité produit | 15min | ★★★★☆ |
| 7 | `.select('columns')` sur top 20 hooks | -60% payload | 2h | ★★★★☆ |
| 8 | GitHub Actions CI (lint + build) | Détection régressions | 2h | ★★★★☆ |
| 9 | 50 tests unitaires sur permissions engine | Fiabilité | 1j | ★★★☆☆ |
| 10 | Pagination `.range()` sur queries critiques | Scalabilité 1000 agences | 1j | ★★★☆☆ |
| 11 | Lazy load recharts + xlsx + jspdf | -500KB bundle initial | 1h | ★★★☆☆ |
| 12 | Découper AuthContext en 3 contextes | Isolation re-renders | 1j | ★★★☆☆ |
| 13 | Squash migrations | CI rapide, DX | 2h | ★★☆☆☆ |
| 14 | Notifications in-app (cloche + badge) | Engagement utilisateur | 2j | ★★☆☆☆ |
| 15 | Recherche globale Command+K | Productivité x2 | 2j | ★★☆☆☆ |

---

# 📋 PLAN DE REFACTORISATION PRIORISÉ

## Phase 1 — Corrections Critiques (2 jours)

| # | Action | Fichier | Temps | Impact |
|---|--------|---------|-------|--------|
| 1 | `useMemo` sur AuthContext value + accessContext | `AuthContext.tsx` | 30min | -40% re-renders |
| 2 | `createSanitizedHtml` dans HcServicesSection | `HcServicesSection.tsx` | 5min | Ferme XSS |
| 3 | `Promise.all` dans loadUserData | `AuthContext.tsx` | 15min | -300ms login |
| 4 | Créer 10 index FK critiques | Migration SQL | 30min | -50% JOINs |
| 5 | Masquer onglet TEST (N6 only) | `UnifiedWorkspace.tsx` | 5min | Crédibilité |
| 6 | Masquer guides disabled | `GuidesTabContent.tsx` | 10min | -75% frustration |
| 7 | Restreindre RLS `USING(true)` sur 5 tables critiques | Migration SQL | 2h | Sécurité données |
| 8 | `React.memo` sur 10 composants Widget | `*Widget.tsx` | 1h | -20% renders |
| 9 | `staleTime: 5min` sur feature_flags + modules | Hooks query | 15min | -90% requêtes |
| 10 | Supprimer `getUser()` redondant dans loadUserData | `AuthContext.tsx` | 5min | -100ms login |

**Score attendu après Phase 1 : 7.2/10**

## Phase 2 — Refonte Structure (5 jours)

| # | Action | Temps | Impact |
|---|--------|-------|--------|
| 1 | Découper AuthContext en AuthContext + ProfileContext + PermissionsContext | 1j | Isolation re-renders |
| 2 | GitHub Actions CI (lint + type-check + build + test) | 2h | Détection régressions |
| 3 | 50 tests unitaires (permissions, hooks critiques, utils) | 1j | Fiabilité |
| 4 | `.select('columns')` sur top 30 hooks | 3h | -60% payload |
| 5 | Pagination `.range()` sur 10 queries sans limite | 1j | Scalabilité |
| 6 | Lazy load recharts + xlsx + jspdf | 1h | -500KB bundle |
| 7 | Squash migrations 397 → ~30 | 2h | DX |
| 8 | Éclater onglet "Outils" en navigation cohérente | 1j | UX navigation |
| 9 | Documentation Edge Functions (README par fonction) | 1j | Maintenabilité |
| 10 | Unifier feature-first architecture (consolider src/) | 1j | Cohérence code |

**Score attendu après Phase 2 : 8.0/10**

## Phase 3 — Optimisation (5 jours)

| # | Action | Temps | Impact |
|---|--------|-------|--------|
| 1 | React.memo sur 40 composants restants | 2h | Renders optimaux |
| 2 | Virtualisation listes longues (react-window) | 2h | DOM minimal |
| 3 | Partitionner metrics_apporteur_daily | 1h | Scalabilité DB |
| 4 | Archivage activity_log > 90j | 1h | Volume DB -40% |
| 5 | Tests Edge Functions (Deno tests) | 2j | Fiabilité backend |
| 6 | Staging environment Supabase | 1j | Sécurité déploiement |
| 7 | Monitoring Sentry (alertes, dashboards) | 4h | Observabilité |
| 8 | Notifications in-app (cloche + badge) | 2j | Engagement |
| 9 | Recherche globale Command+K | 2j | Productivité |
| 10 | Diagnostic permissions admin | 1j | Réduction support -50% |

**Score attendu après Phase 3 : 8.8/10**

---

# 📎 ANNEXES

## A. Fichiers audités en détail

| Fichier | Lignes | Problèmes identifiés |
|---------|--------|---------------------|
| `src/contexts/AuthContext.tsx` | 572 | God Provider, non mémoïsé, 3 appels séquentiels |
| `src/pages/UnifiedWorkspace.tsx` | 619 | Mega composant, 10+ tabs conditionnels |
| `src/components/hc-services-guide/HcServicesSection.tsx` | ~200 | XSS (pas de sanitization) |
| `src/hooks/use-permissions.ts` | 56 | Wrapper inutile vers useAuth |
| `src/permissions/index.ts` | 70 | Barrel export correct ✅ |
| `src/config/changelog.ts` | 990+ | Données statiques dans le bundle |
| `src/lib/cache-manager.ts` | ~330 | localStorage + IndexedDB complexe |
| `src/apporteur/hooks/useApporteurApi.ts` | 119 | Token dev en localStorage |
| `scripts/check-architecture.sh` | 232 | Script bash monolithique |

## B. Métriques clés du codebase

```
Fichiers .ts/.tsx          : ~500
Lignes de code             : ~85,000
Contextes React            : 7
Hooks custom               : ~80
Pages                      : ~60
Composants                 : ~200
Edge Functions             : 60+
Tables Supabase            : 70+
Migrations                 : 397
RPC Functions              : 50+
React.memo usage           : 0
useMemo dans contextes     : 1/7
.select('*')               : 794 occurrences
useAuth() consumers        : 113 fichiers
dangerouslySetInnerHTML    : 95 occurrences
localStorage accès         : 276 occurrences
```

## C. Référence audits détaillés

Les audits thématiques complets sont disponibles dans :
- `docs/ARCHITECTURE_AUDIT_2026-03-07.md` (437 lignes)
- `docs/SECURITY_AUDIT_2026-03-07.md` (473 lignes)
- `docs/DATABASE_AUDIT_2026-03-07.md`
- `docs/PERFORMANCE_AUDIT_2026-03-07.md`
- `docs/PRODUCT_AUDIT_2026-03-07.md`

---

*Audit Intégral Maximal — HelpConfort SaaS V0.9.1 — 7 Mars 2026*  
*Score Global : 6.2/10 → Cible Phase 3 : 8.8/10*  
*Dette technique estimée : ~15 jours-homme*
