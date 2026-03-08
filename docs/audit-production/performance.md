# AXE 6 — Performance

> Audit production-grade Operia — 2026-03-08

---

## 1. Requêtes Supabase

### 1.1 QueryClient configuration
```typescript
staleTime: 10 minutes
gcTime: 30 minutes
refetchOnWindowFocus: false
refetchOnReconnect: false
refetchOnMount: false
retry: 2× avec backoff exponentiel (max 10s)
```

**Verdict**: Configuration agressive en cache (10min stale) — réduit les requêtes mais peut afficher des données périmées. Bon compromis pour un SaaS interne.

### 1.2 Risques N+1

| Pattern | Fichier | Risque |
|---|---|---|
| `listUsers()` dans create-user | create-user/index.ts | 🔴 Liste TOUS les users pour vérifier doublon email — O(n) |
| Polling profil (10×300ms) | create-user/index.ts | 🟡 10 requêtes séquentielles |
| `Promise.all` auth init | AuthContext.tsx | ✅ 2 requêtes parallèles — OK |
| Export all data (boucle tables) | export-all-data | 🟡 Requêtes séquentielles par table |
| Activity log + pagination | useActivityLogPaginated.ts | ✅ Paginé — OK |

### 1.3 `listUsers()` — Problème critique

```typescript
const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
if (existingUser?.users?.some(u => u.email === email)) {
```

- **Problème**: `listUsers()` retourne max 1000 users par défaut
- Si >1000 users → doublon email non détecté → erreur GoTrue à la création (erreur gérée, mais UX médiocre)
- **Solution**: Utiliser `listUsers({ filter: email })` ou vérifier directement via `getUserByEmail()`

## 2. Edge Functions latence

### 2.1 Fonctions lourdes identifiées

| Fonction | Opérations | Latence estimée |
|---|---|---|
| `create-user` | Auth + profil polling + modules insert + email | 3-8s |
| `export-all-data` | Boucle sur toutes les tables | 10-60s selon volume |
| `generate-monthly-report` | Fetch Apogee + calculs + HTML + PDF | 15-45s |
| `suggest-planning` | Fetch Apogee + algorithme IA | 10-30s |
| `generate-embeddings` | Appel OpenAI API | 5-15s |
| `proxy-apogee` | Fetch ERP externe | 1-5s |

### 2.2 Timeouts Edge Functions
- Supabase Edge Functions timeout par défaut: **~60s**
- `generate-monthly-report` et `suggest-planning` peuvent dépasser → risque de timeout
- Pas de monitoring de latence côté serveur (seulement `withSentry` timing)

## 3. Appels multiples inutiles

### 3.1 Semaphore Apogee (client-side)
Le semaphore dans `apogeeProxy.ts` limite à 2 appels concurrents → bon pattern pour éviter la surcharge.

### 3.2 Rechargement profil
`loadUserData` est appelé à chaque `SIGNED_IN` event. Si l'utilisateur change d'onglet et revient, `refetchOnWindowFocus: false` empêche les requêtes inutiles ✅.

### 3.3 Modules effectifs
L'appel RPC `get_user_effective_modules` est fait une seule fois au login, pas à chaque navigation ✅.

## 4. Bundle size

### 4.1 Dépendances mal placées
Les packages suivants sont dans `dependencies` mais devraient être dans `devDependencies`:
- `vitest` (~5MB)
- `jsdom` (~3MB)  
- `glob` (~1MB)
- `tar` (~500KB)
- `tsx` (~2MB)
- `@playwright/test` (~50MB)
- `@testing-library/*` (~2MB)
- `serialize-javascript`, `react-is`

**Impact**: Tree-shaking devrait les exclure du bundle, mais augmente le temps `npm install` et la taille du `node_modules`.

### 4.2 Dépendances lourdes en production
- `fabric` (7.2.0) — ~500KB — utilisé pour l'éditeur canvas
- `pdfjs-dist` (~2MB) — rendu PDF
- `mapbox-gl` (~1.5MB) — cartes
- `xlsx` (~800KB) — export Excel
- `reactflow` (~400KB) — graphes

**Total estimé bundle après tree-shaking**: 2-4MB (à vérifier avec `vite build --report`)

## 5. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Remplacer `listUsers()` par une recherche ciblée dans create-user |
| 🟠 Important | Déplacer les devDeps mal placées (vitest, jsdom, playwright, etc.) |
| 🟠 Important | Ajouter un timeout explicite sur les Edge Functions longues |
| 🟡 Confort | Ajouter un cache serveur pour proxy-apogee (Redis ou DB cache) |
| 🟡 Confort | Lazy-load mapbox-gl, fabric, pdfjs-dist |
