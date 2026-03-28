# Architecture Operia — V2

> **Date** : 28 mars 2026  
> **Statut** : Plan V2 validé — pré-implémentation  
> **Remplace** : `docs/operia-architecture.md` (mars 2026)

---

## 1. Architecture Générale

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend SPA                        │
│     React 18 + Vite + TypeScript + Tailwind + shadcn    │
│     PWA-enabled · react-router-dom v7                    │
├─────────────────────────────────────────────────────────┤
│                  Supabase Platform                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Auth   │  │   Database   │  │  Edge Functions   │  │
│  │ (GoTrue) │  │ (PostgreSQL  │  │  (Deno Deploy)    │  │
│  │          │  │   15 + RLS)  │  │                   │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐     │
│  │ Storage  │  │ Realtime │  │ Apogée Proxy API  │     │
│  │  (S3)    │  │  (WS)    │  │ (Edge Function)   │     │
│  └──────────┘  └──────────┘  └───────────────────┘     │
├─────────────────────────────────────────────────────────┤
│  Observabilité : Sentry (@sentry/react + edge)          │
│  Facturation   : Stripe (prévu V2)                      │
└─────────────────────────────────────────────────────────┘
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18.3, Vite 5, TypeScript strict, Tailwind CSS 3, shadcn/ui |
| Backend | Supabase (PostgreSQL 15, GoTrue Auth, Deno Edge Functions) |
| State management | TanStack Query v5 (react-query) |
| Routing | react-router-dom v7 |
| Maps | Mapbox GL |
| Rich text | TipTap |
| PDF | jsPDF + html2canvas |
| Drag & drop | @dnd-kit |
| Charts | Recharts 3 |
| Monitoring | Sentry SDK |
| CI/CD | Lovable (build Vite auto) → CDN |

### Environnements

| Env | URL | Base de données | Usage |
|-----|-----|----------------|-------|
| Preview (Test) | `id-preview--*.lovable.app` | Supabase Test | Dev & tests |
| Production (Live) | `operiav2.lovable.app` | Supabase Live | Utilisateurs réels |

---

## 2. Système de Permissions — V2 (Cible)

> Voir `DOC_PERMISSIONS_V2.md` pour la documentation exhaustive.

### Résumé architectural

```
                    ┌──────────────┐
                    │module_catalog│ (source de vérité modules)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
   ┌──────────▼──┐  ┌──────▼───────┐  ┌────▼──────────────┐
   │plan_module  │  │agency_module │  │   user_access     │
   │  _grants    │  │_entitlements │  │(override/delegate)│
   └─────────────┘  └──────────────┘  └───────────────────┘
              │            │                │
              └────────────┼────────────────┘
                           │
                    ┌──────▼───────┐
                    │     RPC      │
                    │get_user_     │
                    │permissions   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Frontend    │
                    │Permissions   │
                    │ContextV2    │
                    └──────────────┘
```

### Hiérarchie des rôles (inchangée)

| Niveau | Enum | Description | Exemple |
|--------|------|-------------|---------|
| N0 | `base_user` | Utilisateur de base | Technicien terrain |
| N1 | `franchisee_user` | Utilisateur agence | Assistante, commercial |
| N2 | `franchisee_admin` | Dirigeant agence | Franchisé |
| N3 | `franchisor_user` | Utilisateur réseau | Animateur |
| N4 | `franchisor_admin` | Admin réseau | Direction réseau |
| N5 | `platform_admin` | Admin plateforme | DevOps |
| N6 | `superadmin` | Super-administrateur | CTO |

### 3 modes d'attribution des modules (V2)

| Mode | Colonne `module_distribution_rules` | Exemple |
|------|------|---------|
| **Inclus dans un plan** | `via_plan = true` | `pilotage.agence` |
| **Option agence** | `via_agency_option = true` | `commercial.suivi_client`, apporteurs |
| **Assignation utilisateur** | `via_user_assignment = true` | Ticketing |

Un module peut cumuler plusieurs modes.

---

## 3. Navigation — UnifiedWorkspace

```
URL : /?tab={module}
```

### Structure de navigation

| Section | Onglets principaux |
|---------|-------------------|
| Accueil | Dashboard agence |
| Commercial | Suivi client, Comparateur, Prospects, Réalisations, Signature, Social |
| Organisation | Salariés, Plannings, Réunions, Documents légaux, Zones, Apporteurs |
| Pilotage | Statistiques (StatIA), Performance, Actions, Résultat, Trésorerie, Maps |
| Médiathèque | Consulter, Documents, FAQ, Exports |
| Support | Guides (Help! Academy), Aide en ligne, Ticketing |
| Franchiseur | Dashboard réseau, Agences, Redevances, KPI (interface de rôle N3+) |
| Admin | Utilisateurs, Agences, Permissions, Offres (interface de rôle N4+) |

### Règle d'accessibilité à 3 états

1. **Masqué** : module non déployé (`is_deployed = false`)
2. **Grisé (disabled)** : module déployé mais plan/rôle insuffisant
3. **Cliquable** : module déployé ET accessible

---

## 4. Données — Sources et Synchronisation

### Apogée Connect (ERP externe)

Synchronisation bidirectionnelle via Edge Function `apogee-full-sync` :

| Données | Direction | Fréquence |
|---------|-----------|-----------|
| Users | Apogée → Supabase | Sync complète planifiée |
| Clients | Apogée → Supabase | Sync complète planifiée |
| Projects | Apogée → Supabase | Sync complète planifiée |
| Factures | Apogée → Supabase | Sync complète planifiée |
| Interventions | Apogée → Supabase | Sync complète planifiée |
| Devis | Apogée → Supabase | Sync complète planifiée |

### Tables miroir (pilote)

| Module | Table miroir | Statut |
|--------|-------------|--------|
| `users` | `users_mirror` | Pilote DAX — fallback actif |
| `projects` | `projects_mirror` | Prêt — en attente activation |
| `factures` | `factures_mirror` | Prêt — en attente activation |

### Bases de données internes

| Domaine | Tables principales |
|---------|-------------------|
| Profils & Auth | `profiles`, `auth.users` |
| Agences | `apogee_agencies`, `agency_plan`, `agency_module_entitlements` |
| Permissions | `module_catalog`, `plan_module_grants`, `user_access` |
| Ticketing | `apogee_tickets`, `apogee_ticket_*` |
| Finance | `agency_financial_months`, `agency_royalty_*`, `agency_overhead_rules` |
| Contenu | `apogee_guides`, `priority_announcements` |
| Activité | `activity_log` |

---

## 5. Edge Functions

| Fonction | Rôle | Auth |
|----------|------|------|
| `apogee-proxy` | Proxy vers API Apogée | Service role |
| `apogee-full-sync` | Sync complète ERP | Service role |
| `send-email` | Envoi emails via Resend | Service role |
| `sms-service` | Envoi SMS via AllMySMS | Service role |
| `migrate-export` | Export données migration | Secret header |
| `ai-search` | Recherche IA dans guides | Service role |
| `support-ticket-notify` | Notifications tickets | Service role |
| `stripe-webhook` | Webhooks Stripe (prévu V2) | Stripe signature |

---

## 6. Sécurité

### Principes fondamentaux

- **RLS sur toutes les tables** — aucune table sans politique
- **Fail-closed** — module absent = refusé
- **Bypass N5+ uniquement** — seuls platform_admin et superadmin contournent les modules
- **Rôles stockés en table séparée** — jamais sur `profiles` (anti-escalade)
- **Chiffrement** — données sensibles chiffrées (clé `SENSITIVE_DATA_ENCRYPTION_KEY`)
- **verify_jwt = true** — toutes les Edge Functions (sauf webhooks Stripe)

### Rate limiting

- `apogee-proxy` : rate limiting par agency_id
- `ai-search` : rate limiting par user_id + cache TTL

---

## 7. Observabilité

| Outil | Usage |
|-------|-------|
| Sentry | Erreurs frontend + Edge Functions |
| Logger structuré | Logs contextuels (user, agency, module) |
| `activity_log` | Journal d'audit métier |
| `apogee_sync_logs` | Historique syncs ERP |
| Health checks SQL | 7 catégories de vérifications |

---

## 8. Évolutions planifiées (V2)

| Chantier | Statut | Impact |
|----------|--------|--------|
| Refonte permissions V2 (DB-first) | Planifié | 9 nouvelles tables, RPC unique |
| Catalogue commercial SaaS | Planifié | Facturation Stripe modules/plans |
| Presets poste N1 en DB | Planifié | `job_profile_presets` |
| Migration tables miroir | En attente | projects, factures → miroir |
| CI/CD GitHub Actions | Non commencé | Tests auto avant déploiement |
| MFA | Non commencé | TOTP via Supabase Auth |
