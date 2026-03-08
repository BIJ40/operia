# Architecture Operia

> Document de référence technique — LOT 2 Industrialisation  
> Dernière mise à jour : 2026-03-08

---

## 1. Architecture Générale

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│    React 18 + Vite + TypeScript + Tailwind       │
│    PWA-enabled (vite-plugin-pwa)                 │
├─────────────────────────────────────────────────┤
│               Supabase Platform                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Auth     │  │ Database │  │ Edge Functions│  │
│  │ (GoTrue) │  │ (Postgres│  │ (Deno Deploy) │  │
│  │          │  │  + RLS)  │  │              │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌──────────┐                     │
│  │ Storage  │  │ Realtime │                     │
│  │ (S3)     │  │ (WS)     │                     │
│  └──────────┘  └──────────┘                     │
├─────────────────────────────────────────────────┤
│  Observabilité: Sentry (frontend + edge)         │
└─────────────────────────────────────────────────┘
```

### Stack technique
- **Frontend** : React 18.3, Vite, TypeScript strict, Tailwind CSS, shadcn/ui
- **Backend** : Supabase (PostgreSQL 15, GoTrue Auth, Deno Edge Functions)
- **Observabilité** : Sentry SDK (@sentry/react), logger structuré custom
- **Routing** : react-router-dom v7
- **State** : TanStack Query (react-query v5)
- **Maps** : Mapbox GL
- **Rich text** : TipTap
- **PDF** : jsPDF + html2canvas

---

## 2. Système de Permissions

### 2.1 Hiérarchie des rôles

| Niveau | Enum             | Description         | Exemple           |
|--------|------------------|---------------------|--------------------|
| N0     | `base_user`      | Utilisateur de base | Technicien         |
| N1     | `franchisee_user`| Utilisateur agence  | Assistante         |
| N2     | `franchisee_admin`| Admin agence       | Gérant             |
| N3     | `franchisor_user`| Utilisateur réseau  | Animateur          |
| N4     | `franchisor_admin`| Admin réseau       | Dir. Réseau        |
| N5     | `platform_admin` | Admin plateforme    | Super Admin        |
| N6     | `superadmin`     | Super administrateur| Dev/Ops            |

### 2.2 Bypass

`platform_admin` (N5) et `superadmin` (N6) **bypassent tous les contrôles de modules**.

### 2.3 Source de vérité

- **Rôles** : `ROLE_HIERARCHY` dans `src/permissions/constants.ts`
- **Modules** : `MODULE_DEFINITIONS` dans `src/types/modules.ts`
- **Moteur** : `src/permissions/permissionsEngine.ts` (v3.0)
- **Backend** : `supabase/functions/_shared/permissionsEngine.ts` (copie synchronisée)
- **Tests de verrouillage** : `src/permissions/__tests__/permissions-lockdown.test.ts`

### 2.4 Modules

Chaque onglet du workspace = 1 module. Les modules ont :
- `minRole` : rôle minimum pour y accéder
- `options` : sous-fonctionnalités activables par plan/utilisateur
- `defaultForRoles` : rôles qui obtiennent le module par défaut

Les modules sont gérés à 2 niveaux :
1. **Plan** (Basique/Pro) : quels modules sont inclus
2. **Override utilisateur** : activation/désactivation par utilisateur

---

## 3. Edge Functions

### 3.1 Standards

- Wrapper `withSentry` pour CORS, timing, error capture
- Rate limiting via `_shared/rateLimit.ts` (persistent DB + fallback in-memory)
- Auth validation manuelle quand `verify_jwt = false`
- CORS whitelist : `operiav2.lovable.app` + preview URL

### 3.2 Functions critiques

| Fonction | Rôle | Sécurité |
|----------|------|----------|
| `create-user` | Création compte | Rate limit, anti-escalade privilèges |
| `sensitive-data` | Chiffrement AES-256-GCM | Auth obligatoire, audit log |
| `export-all-data` | Export complet | Admin only, pagination |
| `reset-user-password` | Reset MDP | Rate limit, auth |
| `media-get-signed-url` | URLs signées | Auth, CORS strict |
| `health-check` | Monitoring | Latence DB/Auth/Storage |

### 3.3 Shared modules (`_shared/`)

- `withSentry.ts` — Wrapper principal
- `rateLimit.ts` — Rate limiting (préféré)
- `rateLimiter.ts` — Rate limiting legacy
- `auth.ts` — Validation auth
- `cors.ts` — Headers CORS
- `permissionsEngine.ts` — Vérification permissions côté serveur
- `roles.ts` — Constantes rôles
- `validation.ts` — Validation inputs

---

## 4. Base de Données

### 4.1 Tables critiques

| Table | Rôle | RLS |
|-------|------|-----|
| `profiles` | Profils utilisateurs | Oui |
| `collaborators` | Fiches collaborateurs agence | Oui |
| `apogee_agencies` | Agences du réseau | Oui |
| `apogee_tickets` | Tickets support/dev | Oui |
| `apogee_ticket_user_roles` | Rôles ticket (viewer/admin) | Oui |
| `rate_limits` | Anti brute-force | Oui |
| `activity_log` | Audit trail | Oui |
| `collaborator_sensitive_data` | Données chiffrées | Oui |

### 4.2 Triggers sensibles

- Sync `profiles ↔ collaborators` (email, nom)
- Auto-création profile sur `auth.users` insert
- Activity log sur modifications critiques

### 4.3 RPC critiques

- `has_role(user_id, role)` — Vérification rôle (SECURITY DEFINER)
- Fonctions de recherche full-text (pg_trgm)

---

## 5. Sécurité

### 5.1 En place

- CSP strict (pas de `unsafe-eval`)
- Chiffrement AES-256-GCM pour données sensibles
- Rate limiting sur endpoints critiques
- CORS whitelist sur Edge Functions
- RLS sur toutes les tables
- Audit logging
- OTP 90 jours max
- Sanitization HTML (DOMPurify)

### 5.2 Observabilité

- **Frontend** : `src/lib/observability/` (logger structuré)
- **Edge Functions** : `withSentry` wrapper
- **Client monitoring** : `src/lib/edge-monitor.ts`
- **DB health** : `supabase/health-checks.sql`
- **Security audit** : `src/lib/observability/security-headers-check.ts`

---

## 6. Organisation du Code

```
src/
├── components/          # Composants UI (shadcn + custom)
├── hooks/               # Custom hooks React
├── integrations/        # Client Supabase (auto-généré)
├── lib/                 # Utilitaires
│   ├── observability/   # Logger structuré, security checks
│   ├── edge-monitor.ts  # Monitoring appels edge functions
│   ├── logger.ts        # Logger legacy (catégorisé)
│   ├── sanitize.ts      # Sanitization HTML
│   └── sentry.ts        # Config Sentry
├── pages/               # Pages/routes
├── permissions/         # Moteur de permissions v3.0
│   ├── constants.ts     # Constantes (rôles, bypass, modules)
│   ├── permissionsEngine.ts # Logique principale
│   └── __tests__/       # Tests de verrouillage
├── types/               # Types TypeScript
│   ├── globalRoles.ts   # Enum rôles
│   └── modules.ts       # MODULE_DEFINITIONS
└── test/                # Setup tests unitaires

supabase/
├── functions/           # 60+ Edge Functions
│   ├── _shared/         # Modules partagés
│   └── tests/           # Tests d'intégration Deno
├── migrations/          # Migrations SQL
├── health-checks.sql    # Requêtes diagnostic DB
└── config.toml          # Configuration Supabase

tests/
└── e2e/                 # Tests Playwright
    ├── auth.spec.ts
    ├── permissions.spec.ts
    ├── tickets.spec.ts
    ├── admin-users.spec.ts
    └── backup.spec.ts
```

---

## 7. Dette technique identifiée

| Zone | Risque | Priorité |
|------|--------|----------|
| Logger legacy (`src/lib/logger.ts`) | Doublon avec nouveau logger structuré | Faible — migration progressive |
| `rateLimiter.ts` vs `rateLimit.ts` | Deux modules de rate limiting | Faible — legacy documenté |
| Sync profiles↔collaborators | Trigger fragile si incohérence | Moyen — health checks ajoutés |
| Edge Functions sans tests | Certaines fonctions non testées | Moyen — 4 fonctions critiques couvertes |
| CSP meta tag | Moins robuste que header serveur | Faible — suffisant pour SPA |
