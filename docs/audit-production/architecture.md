# AXE 1 — Architecture Globale

> Audit production-grade Operia — 2026-03-08

---

## 1. Vue d'ensemble

```
┌────────────────────────────────────────────────────────────┐
│                     FRONTEND (SPA)                          │
│  React 18 + Vite + TypeScript + Tailwind + shadcn/ui       │
│  PWA (vite-plugin-pwa) — Code-splitting (lazy routes)      │
│  Hébergé sur Lovable (CDN statique)                        │
├────────────────────────────────────────────────────────────┤
│                   SUPABASE PLATFORM                         │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐│
│  │  Auth     │ │  Database │ │ Edge Functions│ │ Storage  ││
│  │ (GoTrue)  │ │ (PG + RLS)│ │ (Deno, 70+)  │ │ (S3)     ││
│  └──────────┘ └───────────┘ └──────────────┘ └──────────┘│
├────────────────────────────────────────────────────────────┤
│  SERVICES EXTERNES                                          │
│  • Sentry (observabilité)                                   │
│  • Resend (emails transactionnels)                          │
│  • Mapbox (cartes)                                          │
│  • Apogee API (ERP métier HC)                               │
│  • Gotenberg (PDF HTML→PDF) — optionnel                     │
└────────────────────────────────────────────────────────────┘
```

## 2. Dépendances critiques

| Dépendance | Criticité | Substituable | Impact si DOWN |
|---|---|---|---|
| **Supabase Auth (GoTrue)** | 🔴 CRITIQUE | Non (court terme) | Aucun login, app inutilisable |
| **Supabase Database (PostgreSQL)** | 🔴 CRITIQUE | Non | Aucune donnée, app inutilisable |
| **Supabase Edge Functions (Deno)** | 🟠 HAUTE | Non | Création users, exports, emails, crypto, planning IA cassés |
| **Supabase Storage** | 🟡 MOYENNE | Non | Upload/download fichiers cassés, pas de perte de données existantes |
| **Lovable (hébergement SPA)** | 🟠 HAUTE | Oui (Vercel/Netlify) | SPA inaccessible |
| **Resend** | 🟡 MOYENNE | Oui | Emails de bienvenue/reset non envoyés (non bloquant) |
| **Apogee API** | 🟡 MOYENNE | Non | Données ERP indisponibles (KPIs, plannings, dossiers) |
| **Sentry** | 🟢 FAIBLE | Oui | Perte d'observabilité erreurs |
| **Mapbox** | 🟢 FAIBLE | Oui | Cartes indisponibles (feature secondaire) |

## 3. Single Points of Failure

### 3.1 Supabase = SPOF total
- **Auth + DB + Edge + Storage** = tout sur une seule plateforme
- Si Supabase subit une panne globale → Operia est 100% DOWN
- Pas de cache offline significatif (Dexie déclaré mais pas de stratégie offline-first)
- Pas de CDN/proxy devant les Edge Functions

### 3.2 Lovable = SPOF hosting
- Le SPA est hébergé uniquement sur Lovable
- Pas de fallback CDN
- Si Lovable tombe → app inaccessible (même si Supabase fonctionne)

### 3.3 Apogee API = SPOF métier
- Proxy `proxy-apogee` = point unique d'accès à l'ERP
- Pas de cache côté serveur pour les données Apogee
- Un semaphore client-side limite les appels concurrents mais pas de circuit breaker

## 4. Zones sans fallback

| Zone | Fallback existant | Recommandation |
|---|---|---|
| Auth session expirée | Token refresh auto (Supabase SDK) | ✅ OK |
| Edge Function timeout | Aucun | ⚠️ Ajouter retry + timeout côté client |
| Rate limit DB indisponible | Fallback in-memory | ✅ OK |
| Apogee API down | Aucun | ⚠️ Ajouter circuit breaker |
| Storage signing failure | Aucun | ⚠️ Toast d'erreur mais pas de retry |
| Supabase 503 | Retry x2 avec backoff (QueryClient) | ✅ OK partiel |

## 5. Analyse par couche

### 5.1 Frontend
- **Bundle**: ~95 dépendances en `dependencies` (lourd, inclut des devDeps mal placés: `vitest`, `jsdom`, `glob`, `tar`, `tsx`, `@playwright/test`)
- **Code splitting**: Routes lazy-loaded ✅
- **State management**: TanStack Query avec cache agressif (10min stale, 30min GC) — bon
- **Error boundary**: GlobalErrorBoundary avec Sentry ✅
- **CSP**: Via meta tag (moins robuste que header serveur)

### 5.2 Supabase Database
- **70+ tables** avec RLS activé
- **Triggers complexes**: sync profiles↔collaborators, activity log auto, création dossiers media auto
- **RPC functions**: Permissions (SECURITY DEFINER), modules effectifs, recherche
- **Pas d'index monitoring** visible
- **Pas de connection pooling** configuré

### 5.3 Edge Functions
- **70+ fonctions** déployées
- **Wrapper `withSentry`** standardisé mais non utilisé partout (certaines fonctions utilisent `serve()` directement)
- **CORS**: Deux implémentations parallèles (`_shared/cors.ts` strict + `withSentry.ts` basique)
- **13 fonctions avec `verify_jwt = false`** — risque si auth manuelle mal implémentée

### 5.4 Authentification
- GoTrue avec session persistée en localStorage
- Auto-refresh token activé
- Pas de MFA
- Sessions OTP apporteurs avec système séparé (custom, pas GoTrue)

## 6. Réponses aux questions critiques

### Que se passe-t-il si Supabase tombe ?
**Impact**: Panne totale. Aucun login, aucune donnée, aucune action possible.  
**Mitigation actuelle**: Aucune. Pas de mode offline, pas de cache de secours.  
**Temps de reprise**: Dépend entièrement de Supabase (SLA ~99.9%).

### Que se passe-t-il si une Edge Function tombe ?
**Impact variable**:
- `create-user` → impossible de créer des comptes
- `sensitive-data` → impossible de lire/écrire des données RGPD
- `proxy-apogee` → pas d'accès aux données ERP
- `health-check` → perte de monitoring seulement

**Mitigation**: Le frontend affiche un toast d'erreur. QueryClient fait 2 retries.

### Quelles fonctionnalités deviennent indisponibles ?
Si Supabase DB est down: **TOUT**.  
Si seulement les Edge Functions sont down:
- Création/suppression/modification utilisateurs
- Export de données
- Emails transactionnels
- Chiffrement/déchiffrement données sensibles
- Planning IA (suggest/optimize)
- Rapports mensuels
- Recherche unifiée/embeddings

Le frontend peut encore afficher des données en cache TanStack Query pendant ~10 minutes.
