# Architecture Globale OPERIA

> **Date** : 29 mars 2026
> **Version** : V2.1 — Mise à jour post-Patch V1

---

## 1. Vue d'ensemble

OPERIA est une plateforme SaaS de gestion pour réseaux de franchises dans le secteur des services à domicile (HelpConfort / Apogée). Elle centralise le pilotage d'agence, la gestion commerciale, l'organisation interne, le support et l'administration réseau.

```
┌──────────────────────────────────────────────────────────────┐
│                     Utilisateurs finaux                       │
│  N0-N1 (terrain) · N2 (dirigeants) · N3-N4 (réseau) · N5-N6 │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────────────┐
│                   Frontend SPA (CDN)                          │
│  React 18 · Vite 5 · TypeScript strict · Tailwind · shadcn   │
│  PWA · react-router-dom v7 · TanStack Query v5               │
├──────────────────────────────────────────────────────────────┤
│                   Supabase Platform                           │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│  │  Auth    │ │  PostgreSQL  │ │   Edge Functions (100+) │  │
│  │ (GoTrue) │ │  15 + RLS    │ │   (Deno Deploy)         │  │
│  └──────────┘ └──────────────┘ └─────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────────────┐   │
│  │ Storage  │ │ Realtime │ │    CRON Jobs (pg_cron)     │   │
│  │  (S3)    │ │  (WS)    │ │                            │   │
│  └──────────┘ └──────────┘ └────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  Services externes                                           │
│  Apogée API · Resend · AllMySMS · Mapbox · OpenAI · Stripe   │
│  Gotenberg · Sentry                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React, Vite, TypeScript strict | 18.3, 5.x, 5.8+ |
| **UI** | Tailwind CSS, shadcn/ui, Radix UI | 3.x |
| **State** | TanStack Query (react-query) | v5 |
| **Routing** | react-router-dom | v7 |
| **Charts** | Recharts | v3 |
| **Maps** | Mapbox GL | 2.15 |
| **Rich text** | TipTap | v3 |
| **Drag & drop** | @dnd-kit | v6/v10 |
| **PDF** | jsPDF + html2canvas | — |
| **Excel** | xlsx (SheetJS) | 0.18 |
| **Animations** | Framer Motion | v12 |
| **Backend** | Supabase (PostgreSQL 15, GoTrue, Deno Edge) | — |
| **Monitoring** | Sentry SDK (@sentry/react) | v10 |
| **Email** | Resend (via Edge Function) | — |
| **SMS** | AllMySMS (via Edge Function) | — |
| **CI/CD** | Lovable (build Vite auto) → CDN | — |
| **Self-host** | Docker + Nginx (optionnel) | — |

---

## 3. Flux de données principal

### Apogée → Supabase → UI

```
┌───────────────┐     CRON 3x/jour      ┌─────────────────────┐
│  Apogée API   │ ──────────────────────▶│  apogee-full-sync   │
│  (ERP externe) │                       │  (Edge Function)    │
└───────────────┘                        └─────────┬───────────┘
                                                   │
                                         ┌─────────▼───────────┐
                                         │  Shadow Mirror       │
                                         │  users_mirror        │
                                         │  projects_mirror*    │
                                         │  factures_mirror*    │
                                         └─────────┬───────────┘
                                                   │
                              ┌─────────────────────┤
                              │                     │
                    ┌─────────▼──────┐    ┌─────────▼──────────┐
                    │   StatIA       │    │  Performance Engine │
                    │   (métriques)  │    │  (terrain)          │
                    └─────────┬──────┘    └─────────┬──────────┘
                              │                     │
                    ┌─────────▼─────────────────────▼──────────┐
                    │              Frontend SPA                 │
                    │  Dashboards · KPI · Cartes · Rapports     │
                    └──────────────────────────────────────────┘
```

**Modèle** : Bulk léger (sync planifiée) + Enrichissement à la demande (`apiGetProjectByRef` pour fiches dossiers uniquement).

### Sources de données

| Source | Tables | Sync |
|--------|--------|------|
| Apogée API | users_mirror, projets, factures, devis, interventions, créneaux | CRON planifié |
| Saisie directe | profiles, apogee_tickets, agency_financial_months | Temps réel |
| Fichiers | Storage (documents RH, EPI, cachet, réalisations) | Upload |
| Externe | Mapbox (géo), OpenAI (embeddings), Stripe (paiements) | À la demande |

---

## 4. Découpage par domaines

### Domaines métier

| Domaine | Responsabilité | Rôles cibles |
|---------|---------------|-------------|
| **Pilotage** | Dashboard agence, StatIA, performance, KPI, cartes, trésorerie, rentabilité | N2+ |
| **Commercial** | Suivi clients, comparateur, prospects, réalisations (AVAP), signature, social | N1-N2 |
| **Organisation** | Salariés/RH, plannings, réunions, parc (véhicules/EPI), médiathèque, zones, documents | N1-N2 |
| **Support** | Guides (Help! Academy), aide en ligne (Helpi), ticketing | N0-N6 |
| **Apporteurs** | Portail apporteurs, gestion prescripteurs (pack Relations) | N1-N2 |
| **Franchiseur** | Dashboard réseau, gestion agences, redevances, KPI réseau | N3-N4 |
| **Admin** | Gestion utilisateurs, agences, permissions, offres, contenu | N4-N6 |

### Domaines techniques

| Domaine | Composants clés |
|---------|----------------|
| **Permissions** | RPC `get_user_effective_modules`, guards, PermissionsContext |
| **Auth** | Supabase GoTrue, MFA (prévu), OTP apporteurs |
| **Sync** | apogee-full-sync, shadow mirror, proxy-apogee |
| **Notifications** | unified_notifications, Realtime, push, email |
| **Engines** | StatIA, Performance, Prospection, DocGen |

---

## 5. Edge Functions (100+)

### Par domaine

| Domaine | Fonctions | Exemples |
|---------|:-:|---------|
| **Apogée/Sync** | 5 | `proxy-apogee`, `apogee-full-sync`, `apogee-sync-manual` |
| **Auth/Users** | 6 | `create-user`, `delete-user`, `reset-user-password`, `update-user-email` |
| **Apporteurs** | 15 | `apporteur-auth-*`, `create-apporteur-*`, `get-apporteur-*` |
| **Suivi Client** | 12 | `suivi-api-proxy`, `suivi-stripe-checkout`, `suivi-send-*` |
| **Documents** | 8 | `documents-preview`, `documents-finalize`, `parse-docx-tokens`, `generate-hr-document` |
| **Support/IA** | 6 | `helpi-search`, `helpi-index`, `chat-guide`, `search-embeddings` |
| **Ticketing** | 3 | `notify-new-ticket`, `email-to-ticket`, `reply-ticket-email` |
| **KPI/Compute** | 4 | `compute-kpis`, `compute-metric`, `compute-apporteur-metrics`, `get-kpis` |
| **Planning** | 3 | `suggest-planning`, `optimize-week`, `apply-planning-action` |
| **Social** | 3 | `social-suggest`, `social-visual-generate`, `dispatch-social-webhook` |
| **Export** | 5 | `export-all-data`, `export-full-database`, `export-my-data`, `export-rh-documents` |
| **Trésorerie** | 3 | `treasury-connection`, `treasury-bridge-webhook`, `treasury-bridge-callback` |
| **Maintenance** | 5 | `health-check`, `maintenance-alerts-scan`, `purge-old-reports`, `media-garbage-collector` |
| **Divers** | 10+ | `send-push`, `test-sms`, `get-mapbox-token`, `qr-asset`, `unified-search` |

### Sécurité Edge Functions

- **`verify_jwt = true`** sur toutes (sauf webhooks Stripe/treasury)
- Rate limiting par agency_id sur `proxy-apogee`
- Rate limiting par user_id sur `helpi-search`
- Secret CRON validation sur fonctions planifiées

---

## 6. Patterns architecturaux

### Frontend

| Pattern | Usage | Exemple |
|---------|-------|---------|
| **Repository** | Abstraction accès données | `src/repositories/` |
| **Hooks composables** | Logique réutilisable | `useStatia`, `useEffectiveModules` |
| **Guards** | Protection routes/composants | `RoleGuard`, `ModuleGuard`, `FeatureGuard`, `PlanGuard` |
| **Context providers** | État global | `AuthContext`, `PermissionsContext` |
| **Adapter** | Normalisation données API | Apogée proxy → modèle interne |
| **Engine** | Calculs métier complexes | StatIA, Performance |
| **Tab-based workspace** | Navigation unifiée | `UnifiedWorkspace` avec `?tab=` |

### Backend (Edge Functions)

| Pattern | Usage |
|---------|-------|
| **Proxy sécurisé** | `proxy-apogee` masque les clés API et PII |
| **Service role** | Fonctions admin utilisent `supabaseAdmin` |
| **CRON + idempotent** | Sync planifiée, chaque run est rejouable |
| **Webhook handler** | Stripe, treasury — vérification signature |

### Séparation des responsabilités

```
UI (React components)
  └── Hooks (logique métier frontend)
       └── Services / Repositories (accès données)
            └── Supabase Client (SDK)
                 └── PostgreSQL + RLS (sécurité données)
                      └── Edge Functions (logique serveur)
                           └── APIs externes (Apogée, Stripe…)
```

---

## 7. Environnements

| Env | URL | DB | Usage |
|-----|-----|:--:|-------|
| Preview | `id-preview--*.lovable.app` | Supabase Test | Dev & tests |
| Production | `operiav2.lovable.app` | Supabase Live | Utilisateurs réels |
| Self-hosted | Custom domain | Supabase configurable | Docker + Nginx |

---

## 8. Observabilité

| Outil | Usage |
|-------|-------|
| **Sentry** | Erreurs frontend + Edge Functions |
| **Logger structuré** | Logs contextuels (user, agency, module) |
| **`activity_log`** | Journal d'audit métier |
| **`apogee_sync_logs`** | Historique syncs ERP |
| **`apogee_sync_runs`** | Runs de sync avec métriques |
| **Health checks SQL** | 7 catégories de vérifications |

---

## 9. Évolutions planifiées

| Chantier | Statut | Impact |
|----------|--------|--------|
| Permissions V2 (DB-first) | Planifié | 9 nouvelles tables, RPC unique |
| Catalogue commercial SaaS | Planifié | Facturation Stripe modules/plans |
| Presets poste N1 en DB | Planifié | `job_profile_presets` |
| Shadow Mirror complet | En cours | projects, factures → miroir |
| MFA | Prévu | TOTP via Supabase Auth |
| CI/CD GitHub Actions | Non commencé | Tests auto avant déploiement |
