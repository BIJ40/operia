# ⚡ AUDIT PERFORMANCE — 7 Mars 2026

**Auditeur** : Expert Optimisation React / Supabase (IA)  
**Version** : V0.9.1  
**Scope** : Re-renders, hooks, memoization, API, cache, pagination, bundle, calculs client

---

## 📊 PERFORMANCE SCORE : 6.5 / 10

| Critère | Note | Poids | Commentaire |
|---------|------|-------|-------------|
| Re-renders React | 5/10 | 20% | AuthContext monolithique → cascade de re-renders |
| Hooks & Memoization | 6/10 | 15% | useCallback bien utilisé dans AuthContext, 0 React.memo |
| Appels API | 7/10 | 20% | Bonne déduplication apogeeProxy, mais doubles fetches Supabase |
| Cache | 8/10 | 15% | Cache mémoire 2h apogeeProxy + React Query 10min staleTime |
| Pagination | 3/10 | 10% | Quasi absente — tous les `.select('*')` sans `.range()` |
| Bundle | 6/10 | 10% | Lazy loading OK, mais recharts non tree-shakée + xlsx/fabric lourds |
| Calculs client | 6/10 | 10% | Calculs stats massifs côté client (StatIA) |

---

## 1. ANALYSE RE-RENDERS REACT

### 1.1 AuthContext — God Context (572 lignes)

**Problème critique** : `AuthContext.Provider` recrée son objet `value` à chaque render car il est construit inline (ligne 523-560). Toute mise à jour d'un des ~15 `useState` du provider provoque un re-render de **188 composants** qui appellent `useAuth()`.

```tsx
// src/contexts/AuthContext.tsx — ligne 522-560
// PROBLÈME: Nouvel objet value créé à chaque render
<AuthContext.Provider value={{ 
  isAuthenticated: !!user,
  isAuthLoading,      // ← change → tout re-render
  firstName,           // ← change → tout re-render
  // ...30+ propriétés
}}>
```

**Impact** : Un simple changement de `isAuthLoading` (true→false) provoque le re-render de l'ensemble de l'arbre UI.

**Gain estimé** : -40% de re-renders au démarrage, -60% lors des refreshes de token.

### 1.2 Zéro `React.memo` dans tout le projet

Aucun composant n'utilise `React.memo`. Pour un projet avec 188 fichiers utilisant `useAuth()`, c'est un manque significatif.

**Composants candidats prioritaires** :
- Tous les widgets dashboard (`CAMensuelChartWidget`, `RecentTicketsWidget`, etc.)
- Les listes virtualisées de la sidebar
- Les composants de graphiques (32 fichiers importent recharts)

### 1.3 Contextes imbriqués sans isolation

```
App.tsx structure:
  QueryClientProvider
    TooltipProvider
      BrowserRouter
        AuthProvider           ← 188 consumers
          ImpersonationProvider
            DataPreloadProvider ← consomme useAuth() → re-render cascade
              EditorProvider
                ApporteurEditorProvider
                  GlobalErrorBoundary
                    AppContent
```

Chaque contexte consomme le contexte parent. Un re-render d'`AuthProvider` cascade à travers 5 providers imbriqués.

---

## 2. ANALYSE HOOKS & MEMOIZATION

### 2.1 `accessContext` recréé à chaque render

```tsx
// AuthContext.tsx — ligne 160-164
const accessContext: PermissionContext = {
  globalRole: globalRole ?? 'base_user',
  enabledModules: enabledModules ?? {},
  agencyId,
};
```

Cet objet n'est **pas memoized** (`useMemo`). Il est utilisé comme dépendance de `hasModuleGuard` et `hasModuleOptionGuard` (lignes 173, 177), qui se recréent donc à chaque render.

**Solution** : `useMemo` sur `accessContext`.

### 2.2 `hasModuleGuard` dépend de `accessContext` (non memoized)

```tsx
const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
  return hasAccess({ ...accessContext, moduleId: moduleKey });
}, [accessContext]); // ← accessContext change à chaque render
```

Le `useCallback` est inutile ici car `accessContext` n'est pas memoized → la fonction est recréée à chaque render.

### 2.3 `loadUserData` fait 3 appels séquentiels

```tsx
// AuthContext.tsx — ligne 186-326
const loadUserData = useCallback(async (userId: string) => {
  // 1. profiles query
  const { data: profile } = await supabase.from('profiles').select(...)
  // 2. RPC call (séquentiel, pas en parallèle avec 1!)
  const { data: effectiveModules } = await supabase.rpc(...)
  // ... logique ...
  // 3. getUser() call (après les 2 premiers!)
  const { data: userData } = await supabase.auth.getUser();
}, []);
```

Les requêtes profil + modules + getUser devraient être en `Promise.all`.

**Gain estimé** : -200-400ms au login (3 requêtes séquentielles → 1 parallèle).

---

## 3. ANALYSE APPELS API

### 3.1 Doubles fetches Supabase — 197 fichiers avec `useQuery`

Le projet contient **197 fichiers** utilisant `useQuery`. Plusieurs hooks fetchent les mêmes données :

| Données | Hooks qui les fetchent | Duplication |
|---------|----------------------|-------------|
| `apogee_agencies` | `useAgencies`, `useAgencyList`, `AgencySelector`, `AdminAgencies` | 4x |
| `collaborators` | `useCollaborators`, `useRHSuivi`, `useRHCollaborator` | 3x |
| `profiles` | `useAccessRightsUsers`, `useSearchProfiles`, `AdminNotificationSender` | 3x |
| `maintenance-settings` | `useMaintenanceMode` (2 hooks dans le même fichier!) | 2x |
| API Apogée projets | `usePlanningV2Data`, `usePlanningData`, `DataPreloadContext` | 3x |

### 3.2 `useMaintenanceMode` — Double query identique

```typescript
// src/hooks/useMaintenanceMode.ts
// Hook 1: useMaintenanceMode — queryKey: ['maintenance-settings']
// Hook 2: useMaintenanceSettings — queryKey: ['maintenance-settings'] (MÊME KEY!)
```

Les deux hooks font la même requête mais sont appelés séparément dans l'app.

### 3.3 DataPreloadContext + hooks individuels = double fetch

`DataPreloadContext` précharge 6 endpoints Apogée au démarrage. Mais `usePlanningV2Data` et `usePlanningData` refetchent les mêmes données avec des `queryKey` différentes :

```
DataPreloadContext → apogeeProxy.getProjects() → cache mémoire ✓
usePlanningV2Data → apogeeProxy.getProjects() → CACHE HIT ✓ (même apogeeProxy)
```

Le cache mémoire d'`apogeeProxy` sauve la situation, mais les hooks React Query créent tout de même des entrées de cache dupliquées.

### 3.4 `.select('*')` massif — 99 fichiers, 849 occurrences

**849 occurrences** de `.select('*')` dans 99 fichiers. Cela signifie que la quasi-totalité des requêtes Supabase récupère **toutes les colonnes** au lieu de sélectionner uniquement celles nécessaires.

Tables les plus impactées :
- `collaborators` : 30+ colonnes fetchées quand souvent seuls `id, first_name, last_name` sont utilisés
- `apogee_tickets` : 35+ colonnes fetchées pour des listes qui n'affichent que 5 champs
- `blocks` : contenu HTML complet fetché même pour les listes de navigation

**Gain estimé** : -30-50% taille payload sur les listes.

---

## 4. ANALYSE CACHE

### 4.1 Architecture cache — Bien conçue

```
┌─────────────────────────────────────────────────────┐
│  Couche 1: React Query (staleTime: 10min)           │
│  ├── 197 hooks avec queryKey unique                 │
│  └── gcTime: 30 min → nettoyage automatique         │
├─────────────────────────────────────────────────────┤
│  Couche 2: apogeeProxy memory cache (TTL: 2h)      │
│  ├── Déduplication in-flight requests ✅             │
│  ├── Semaphore 15 concurrent max ✅                  │
│  └── Cache key: endpoint:agency:filters             │
├─────────────────────────────────────────────────────┤
│  Couche 3: sessionStorage (DataPreloadContext)      │
│  ├── Méta de session uniquement                     │
│  └── Version-tagged (v1) avec invalidation          │
├─────────────────────────────────────────────────────┤
│  Couche 4: Service Worker (Workbox)                 │
│  ├── CacheFirst: images, fonts                      │
│  ├── NetworkFirst: API, Edge Functions              │
│  └── StaleWhileRevalidate: app shell                │
└─────────────────────────────────────────────────────┘
```

**✅ Points forts** :
- React Query `staleTime: 10min` + `refetchOnWindowFocus: false` (pas de refetch inutile au tab switch)
- `apogeeProxy` déduplication des requêtes concurrentes identiques
- Semaphore limitant à 15 requêtes simultanées vers Apogée
- Service Worker avec stratégie adaptée par type de ressource

**⚠️ Points d'attention** :
- Pas de cache persistant pour les données Apogée (perte au refresh)
- `networkDataService.ts` a son propre cache `Map` (5min) en plus de `apogeeProxy` (2h) → **double couche de cache non synchronisée**

### 4.2 Cache franchiseur — Double couche incohérente

```typescript
// networkDataService.ts — cache propre (5 min)
const dataCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000;

// apogeeProxy.ts — cache propre (2h)
const memoryCache = new Map<string, CacheEntry>();
let CACHE_TTL_MS = 2 * 60 * 60 * 1000;
```

`NetworkDataService.loadMultiAgencyData()` vérifie son propre cache (5min) puis appelle `apogeeProxy.getAllData()` qui vérifie le sien (2h). Résultat : les données sont dupliquées en mémoire.

---

## 5. ANALYSE PAGINATION

### 5.1 Absence quasi-totale

| Hook / Composant | Table | Pagination | Risque |
|-------------------|-------|-----------|--------|
| `useCollaborators` | `collaborators` | ❌ Aucune | OK (<100 par agence) |
| `useActivityLog` | `activity_log` | ❌ `.limit(50)` hardcodé | ⚠️ Perte de données |
| `useFaqData` | `faq_categories + questions` | ❌ Aucune | OK (petit volume) |
| `useRHSuivi` | `collaborators` | ❌ Aucune | OK (<100) |
| `useApporteurListMetrics` | `metrics_apporteur_daily` | ❌ Aucune | 🔴 Peut dépasser 1000 rows |
| `useApporteurAlerts` | `metrics_apporteur_daily` | ❌ Aucune | 🔴 Double query sans limit |
| API Apogée | Externe | ❌ Tout en mémoire | 🔴 Des milliers de projets/factures |

### 5.2 Limite 1000 rows Supabase

Supabase retourne **max 1000 rows par défaut**. Aucun hook ne gère cette limite :
- `metrics_apporteur_daily` : 1 row/jour/apporteur. Avec 10 apporteurs sur 1 an = 3650 rows → **truncated silently**
- `activity_log` : milliers d'entrées potentielles → `limit(50)` protège mais perd l'historique

**Gain estimé** : Fiabilité des données pour les agences avec gros volumes.

---

## 6. ANALYSE BUNDLE

### 6.1 Dépendances lourdes

| Package | Taille estimée (gzip) | Usage | Action |
|---------|----------------------|-------|--------|
| `recharts` | ~180 KB | 32 composants | Tree-shake ou lazy load |
| `fabric` | ~300 KB | 1 éditeur canvas | ✅ Déjà lazy loadé (probable) |
| `xlsx` | ~200 KB | Export Excel | Dynamic import recommandé |
| `pdfjs-dist` | ~400 KB | Viewer PDF | ✅ Exclu de optimizeDeps |
| `@tiptap/*` (10 packages) | ~150 KB | Rich text editor | Lazy load le composant |
| `mapbox-gl` | ~200 KB | 1 carte RDV | ✅ Probablement lazy |
| `reactflow` | ~100 KB | 1 page roadmap | Lazy load |
| `jspdf` | ~100 KB | Export PDF | Dynamic import |
| `framer-motion` | ~100 KB | Animations | Garder (bien utilisé) |
| `dompurify` | ~15 KB | Sanitization | Garder (critique sécurité) |

**Total dépendances lourdes** : ~1.7 MB (gzip) dont ~800 KB pourraient être lazy-loadées.

### 6.2 Lazy loading existant — Bien fait

```tsx
// App.tsx — Bon usage de lazy()
const UnifiedWorkspace = lazy(() => import("./pages/UnifiedWorkspace"));
const Dashboard = lazy(() => import("./pages/DashboardStatic"));
const Profile = lazy(() => import("./pages/Profile"));
// ...
```

Les pages principales sont lazy-loadées. Manque : les modules domaines (routes) qui importent directement recharts/xlsx dans leurs composants.

### 6.3 Pas de code splitting par route module

Les route modules (`AcademyRoutes`, `FranchiseurRoutes`, etc.) sont importés directement dans `App.tsx` ligne 50-60, pas via `lazy()`. Cela signifie que **toutes les définitions de routes** sont chargées au démarrage.

---

## 7. ANALYSE CALCULS CLIENT

### 7.1 StatIA — Calculs massifs côté client

Le moteur StatIA effectue des calculs complexes directement dans le navigateur :

```typescript
// useFranchiseurStatsStatia.ts
const technicienStats = aggregateTechUniversStatsMultiAgency(
  agenciesDataForStats,  // potentiellement 40+ agences × 1000+ factures
  { start: dateRange.from, end: dateRange.to }
);
```

Pour un réseau de 40 agences avec 1000 factures chacune, cela traite **40 000 factures** côté client.

**Gain estimé** : Migration vers Edge Function → -5-10s de freeze UI.

### 7.2 N+1 queries pattern — `computeTechDayLoad`

```typescript
// usePlanningV2Data.ts — ligne 85-108
for (const tech of normalized.technicians) {
  const load = computeTechDayLoad(tech.id, dk, normalized.appointments, ...);
  const techAppts = normalized.appointments.filter(
    (a) => a.technicianIds.includes(tech.id) && dateKey(a.start) === dk
  );
  load.travelMinutes = computeTechDayTravel(techAppts);
}
```

Pour N techniciens, cela filtre le tableau d'appointments N fois (O(N×M) au lieu de O(N+M) avec un Map de pré-filtrage).

### 7.3 `normalizeApogeeData` — Transformation non incrémentale

Chaque changement de `rawData` dans `usePlanningV2Data` recalcule la normalisation complète. Pas de normalisation incrémentale ni de persistance.

---

## 8. 🏆 20 OPTIMISATIONS PRIORITAIRES

### P1 — Impact Critique (gain >50% sur le problème ciblé)

| # | Optimisation | Fichier | Gain estimé | Effort |
|---|-------------|---------|-------------|--------|
| 1 | **Splitter AuthContext** en 3 contextes (Auth, Profile, Permissions) | `AuthContext.tsx` | -60% re-renders | 4h |
| 2 | **Memoize `value` du Provider** avec `useMemo` | `AuthContext.tsx` | -40% re-renders immédiats | 15min |
| 3 | **Paralléliser `loadUserData`** (profiles + RPC + getUser) | `AuthContext.tsx` l.186 | -300ms au login | 15min |
| 4 | **Memoize `accessContext`** avec `useMemo` | `AuthContext.tsx` l.160 | -50% re-renders cascade | 5min |
| 5 | **Dynamic import `xlsx`** | Composants export | -200KB bundle initial | 30min |

### P2 — Impact Élevé

| # | Optimisation | Fichier | Gain estimé | Effort |
|---|-------------|---------|-------------|--------|
| 6 | **Pré-indexer appointments par techId** dans `usePlanningV2Data` | `usePlanningV2Data.ts` l.85 | -80% CPU calcul charges | 20min |
| 7 | **Supprimer double cache `networkDataService`** → utiliser uniquement `apogeeProxy` | `networkDataService.ts` | -50% RAM, cohérence cache | 1h |
| 8 | **Ajouter `.range()` sur `metrics_apporteur_daily`** | `useApporteurListMetrics.ts` | Fiabilité données | 15min |
| 9 | **Remplacer `.select('*')` par colonnes explicites** (top 10 hooks les plus appelés) | 10 fichiers | -30% payload | 1h |
| 10 | **Lazy load recharts par page** | 32 composants | -180KB bundle initial | 2h |

### P3 — Impact Modéré

| # | Optimisation | Fichier | Gain estimé | Effort |
|---|-------------|---------|-------------|--------|
| 11 | **`React.memo` sur widgets dashboard** | 10 widgets | -30% re-renders dashboard | 1h |
| 12 | **Dédupliquer query `maintenance-settings`** | `useMaintenanceMode.ts` | -1 requête/page | 10min |
| 13 | **Lazy load route modules** (AcademyRoutes, etc.) | `App.tsx` l.50-60 | -50KB parse initial | 30min |
| 14 | **Ajouter `.limit()` à `useActivityLog`** avec pagination infinie | `useActivityLog.ts` | Fiabilité + perf | 30min |
| 15 | **Dynamic import `jspdf` + `html2canvas`** | Export composants | -200KB bundle | 20min |

### P4 — Quick Wins

| # | Optimisation | Fichier | Gain estimé | Effort |
|---|-------------|---------|-------------|--------|
| 16 | **`useCallback` stable pour `login`** (actuellement recréé) | `AuthContext.tsx` l.455 | Micro-optim | 5min |
| 17 | **Dédupliquer fetch `apogee_agencies`** en une query partagée | 4 hooks | -3 requêtes | 20min |
| 18 | **`virtualized` list pour collaborateurs** | RH pages | -50% DOM nodes si >50 | 1h |
| 19 | **Throttle `updateStep` dans DataPreloadContext** (déjà fait ✅) | `DataPreloadContext.tsx` | N/A | N/A |
| 20 | **Migrer calculs StatIA lourds vers Edge Function** | `useFranchiseurStatsStatia.ts` | -5-10s freeze UI | 4h |

---

## 9. SIMULATION SCALABILITÉ PERFORMANCE

### 9.1 — 10 agences (Situation actuelle)

| Métrique | Valeur estimée | Acceptable |
|----------|---------------|------------|
| Login → Dashboard | ~2-3s | ✅ |
| DataPreload (6 endpoints) | ~3-5s | ✅ |
| RAM onglet navigateur | ~100-200 MB | ✅ |
| Re-renders au démarrage | ~300-500 | ⚠️ Excessif mais non perceptible |
| Bundle initial (gzip) | ~800 KB | ✅ |

### 9.2 — 100 agences (Franchiseur multi-sites)

| Métrique | Valeur estimée | Acceptable |
|----------|---------------|------------|
| Chargement franchiseur stats | ~30-60s | 🔴 |
| RAM (100 agences × 6 datasets) | ~1-2 GB | 🔴 Crash mobile |
| Cache mémoire `apogeeProxy` | ~500 MB | 🔴 |
| Double cache `networkDataService` | ~1 GB supplémentaire | 🔴 |
| Calcul StatIA client | ~15-30s freeze | 🔴 |

### 9.3 — 1000 agences

Non viable avec l'architecture actuelle. Nécessite :
- Calculs côté serveur (Edge Functions ou Supabase RPC)
- Pagination API Apogée
- Cache persistant (IndexedDB via Dexie, déjà en dépendance)
- Streaming/agrégation côté serveur

---

## 10. PATTERNS N+1 DÉTECTÉS

### N+1 #1 : `computeTechDayLoad` dans `usePlanningV2Data`

```
Pour chaque technicien (N) :
  → filter ALL appointments (M) pour ce tech + date
  → filter ALL appointments AGAIN pour computeTravel
= O(N × 2M) au lieu de O(N + M) avec pré-groupement
```

**Fix** :
```typescript
// Pré-grouper les appointments par techId:dateKey
const apptsByTechDay = new Map<string, PlanningAppointment[]>();
for (const a of normalized.appointments) {
  const dk = dateKey(a.start);
  for (const techId of a.technicianIds) {
    const key = `${techId}:${dk}`;
    if (!apptsByTechDay.has(key)) apptsByTechDay.set(key, []);
    apptsByTechDay.get(key)!.push(a);
  }
}
```

### N+1 #2 : `pEventToIntervention` double loop dans `usePlanningData`

```typescript
// Lignes 90-107 — DEUX boucles identiques sur interventions.visites
const pEventToIntervention = new Map<number, RawIntervention>();
for (const interv of interventions) {
  for (const v of interv.data?.visites ?? []) { ... }
}
const pEventToVisite = new Map<number, { type?: string }>();
for (const interv of interventions) {
  for (const v of interv.data?.visites ?? []) { ... } // MÊME BOUCLE!
}
```

**Fix** : Fusionner en une seule boucle.

### N+1 #3 : `enrichedData.map` dans `useFranchiseurStatsStatia`

```typescript
// Ligne 61 — .find() dans un map = O(N × M)
const enrichedData = agencyDataResults.map(result => ({
  agencyLabel: agencies?.find(a => a.slug === result.agencyId)?.label
}));
```

**Fix** : Pré-construire un `Map<slug, label>` des agences.

---

## 11. REQUÊTES SUPABASE COÛTEUSES

| Requête | Table | Impact | Fix |
|---------|-------|--------|-----|
| `useCollaborators` → `.select('*')` | `collaborators` (30+ cols) | Payload ×3 | `.select('id,first_name,last_name,role,type')` |
| `useRHSuivi` → `.select('*')` | `collaborators` | Doublon avec `useCollaborators` | Unifier |
| `AdminAgencies` → `.select('*')` + `.select('*')` profiles | 2 tables | Tout en mémoire | Paginer |
| `use-admin-backup` → 5× `.select('*')` en parallèle | `blocks` + `apporteur_blocks` + ... | Export full tables | OK (action admin rare) |
| `useApporteurAlerts` → 2× `.select('*')` sans limit | `metrics_apporteur_daily` | >1000 rows possibles | `.range(0, 999)` |

---

## 12. RÉSUMÉ EXÉCUTIF

```
┌────────────────────────────────────────────────────────┐
│           PERFORMANCE SCORE : 6.5 / 10                  │
│                                                        │
│  🔴 PROBLÈMES CRITIQUES :                              │
│     - AuthContext monolithique → 188 consumers          │
│     - Zéro React.memo dans tout le projet              │
│     - Absence de pagination (limite 1000 Supabase)     │
│     - 849× .select('*') = payloads surdimensionnés     │
│     - Calculs StatIA bloquant le main thread           │
│                                                        │
│  🟠 PROBLÈMES MODÉRÉS :                                │
│     - loadUserData séquentiel (3 appels au lieu de 1)  │
│     - Double cache networkDataService + apogeeProxy    │
│     - N+1 patterns dans planning et stats              │
│     - recharts/xlsx/jspdf non lazy-loadés              │
│     - Route modules chargés au démarrage               │
│                                                        │
│  ✅ POINTS FORTS :                                     │
│     - React Query bien configuré (staleTime 10min)     │
│     - apogeeProxy: cache + dédup + semaphore           │
│     - Lazy loading pages (React.lazy)                  │
│     - Service Worker avec stratégies adaptées          │
│     - DataPreloadContext throttled + versioned          │
│     - refetchOnWindowFocus: false (pas de refetch tab) │
│                                                        │
│  📈 GAINS POTENTIELS (P1 uniquement) :                 │
│     - -60% re-renders (split AuthContext)              │
│     - -300ms login (paralléliser loadUserData)         │
│     - -400KB bundle (dynamic imports)                  │
│     - Fiabilité données (pagination Supabase)          │
│                                                        │
│  🎯 EFFORT TOTAL TOP 5 : ~5h                          │
│     → Score estimé après fixes P1 : 8.0/10             │
└────────────────────────────────────────────────────────┘
```

---

## 13. PLAN D'ACTION

### Sprint 1 — Quick Wins (1 jour)
- [P1.2] `useMemo` sur `value` d'AuthContext
- [P1.3] Paralléliser `loadUserData`
- [P1.4] Memoize `accessContext`
- [P4.16] `useCallback` stable pour `login`
- [P3.12] Dédupliquer `maintenance-settings`

### Sprint 2 — Core Perf (2 jours)
- [P1.1] Split AuthContext en 3 contextes
- [P2.6] Pré-indexer appointments par techId
- [P2.7] Supprimer double cache networkDataService
- [P2.9] Top 10 hooks `.select('*')` → colonnes explicites
- [P3.11] `React.memo` sur widgets dashboard

### Sprint 3 — Bundle (1 jour)
- [P1.5] Dynamic import `xlsx`
- [P2.10] Lazy load recharts par page
- [P3.13] Lazy load route modules
- [P3.15] Dynamic import `jspdf` + `html2canvas`

### Sprint 4 — Scalabilité (2 jours)
- [P2.8] Pagination `metrics_apporteur_daily`
- [P3.14] Pagination infinie `useActivityLog`
- [P4.17] Query partagée `apogee_agencies`
- [P4.20] Migration StatIA → Edge Function

---

*Audit Performance HelpConfort — V0.9.1 — 7 Mars 2026*  
*Prochaine révision recommandée : Après application Sprint 1 + 2*
