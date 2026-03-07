# Architecture du Projet GLOBAL / Apogée

> **Version** : 3.0  
> **Dernière mise à jour** : 7 Mars 2026  
> **App Version** : V0.9.1 — Permissions Unifiées

---

## 1. Objectif du Projet

**GLOBAL / Apogée** est une plateforme SaaS B2B destinée au réseau de franchises HelpConfort. Elle centralise :

- 📚 **Documentation métier** : Guides Apogée, Apporteurs, HelpConfort
- 🤖 **Assistant IA** : Chatbot Helpi avec RAG
- 📊 **Pilotage** : KPIs temps réel via API Apogée + StatIA
- 🎫 **Support** : Chat IA/humain + tickets avec SLA
- 🏢 **Multi-agences** : Dashboard réseau pour franchiseurs
- 👷 **RH & Parc** : Gestion collaborateurs, véhicules, EPI
- 📄 **DocGen** : Génération documents personnalisés (DOCX/PDF)
- 🏠 **Portail Apporteurs** : Espace externe pour gestionnaires/bailleurs
- 📈 **Commercial** : CRM prospects, scoring apporteurs, veille
- ⚙️ **Administration** : Gestion utilisateurs, droits, contenus, système

---

## 2. Vue d'Ensemble Technique

### 2.1 Stack

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query, React Context |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **IA** | Lovable AI Gateway (Gemini 2.5), OpenAI (embeddings) |
| **PDF** | Gotenberg (DOCX→PDF), jsPDF |
| **Email** | Resend |
| **Monitoring** | Sentry |
| **Déploiement** | Lovable Cloud |

### 2.2 Services Externes

| Service | Usage |
|---------|-------|
| API Apogée | Données CRM (clients, dossiers, factures) |
| Lovable AI | Chat IA (streaming) |
| OpenAI | Génération embeddings |
| Gotenberg | Conversion DOCX → PDF |
| Resend | Notifications email |
| Mapbox | Carte RDV |

---

## 3. Découpage par Domaines

### 3.1 Structure des Dossiers

```
src/
├── pages/                    # Pages principales
├── components/               # Composants réutilisables
│   ├── ui/                   # shadcn/ui + warm design system
│   ├── layout/               # MainLayout, Header, Sidebar
│   ├── auth/                 # Guards (RoleGuard, ModuleGuard)
│   └── admin/views/          # Écrans admin (ModulesMasterView, PlansManagerView...)
├── apogee-connect/           # Module indicateurs Apogée
├── franchiseur/              # Module réseau
├── apogee-tickets/           # Module ticketing
├── apporteur/                # Portail apporteurs externes
├── statia/                   # Moteur statistiques centralisé
├── permissions/              # Moteur permissions V3 (source unique)
├── contexts/                 # Contextes React (AuthContext, etc.)
├── hooks/                    # Custom hooks
│   └── access-rights/        # useEffectiveModules, useModuleRegistry, useModuleOverrides
├── config/                   # Configuration centralisée
│   ├── changelog.ts          # Historique versions
│   ├── moduleTree.ts         # Seed de référence (jamais lu au runtime)
│   └── version.ts            # Version courante
├── types/                    # Types TypeScript
│   ├── modules.ts            # MODULE_DEFINITIONS (source unique)
│   └── globalRoles.ts        # GlobalRole enum
└── lib/                      # Utilitaires

supabase/
├── functions/                # 60+ Edge Functions (Deno)
│   └── _shared/              # Helpers (CORS, rate limit, Sentry, auth, permissions)
└── migrations/               # Migrations SQL
```

### 3.2 Navigation Unifiée

Toute l'application utilise le composant `UnifiedWorkspace` avec des onglets :

```
/?tab={module}         → Onglet principal
/?tab=admin&adminTab=  → Admin (gestion, contenus, système)
/?tab=reseau           → Réseau franchiseur
```

| Onglet | Module Key | Rôle min. |
|--------|-----------|-----------|
| Agence | `agence` | N2 |
| Stats | `stats` | N2 |
| Salariés | `rh` | N2 |
| Outils | `divers_*`, `parc`, `prospection` | N1-N2 |
| Documents | `divers_documents` | N2 |
| Guides | `guides` | N0 |
| Ticketing | `ticketing` | N0 |
| Aide | `aide` | N0 |
| Réseau | `reseau_franchiseur` | N3 |
| Admin | `admin_plateforme` | N5 |

---

## 4. Système de Permissions V3

> **⚠️ Source de vérité unique** : `user_modules` table, lue via RPC `get_user_effective_modules`.  
> Le champ legacy `profiles.enabled_modules` JSONB a été **entièrement purgé** en V0.9.1.  
> Aucune référence à ce champ ne subsiste dans le code actif.

### 4.1 Architecture

```
ÉCRITURE:
  Admin > Gestion > Droits  →  INSERT/DELETE user_modules

LECTURE:
  Frontend:  AuthContext → RPC get_user_effective_modules()
             → hasModule() / hasModuleOption() via @/permissions
  SQL/RLS:   has_module_v2() / has_module_option_v2() → user_modules
  Edge Fn:   global_role (N5+ bypass) + has_module_v2() SQL
```

### 4.2 Cascade de résolution

```
1. module_registry      → Modules déployés (is_deployed + required_plan)
2. plan_tier_modules    → Modules du plan agence (STARTER/PRO)
3. user_modules         → Overrides individuels (onglet Droits)
4. Filtre min_role      → Côté serveur (N5+ bypass automatique)
```

### 4.3 Hiérarchie des Rôles

| Niveau | Rôle | Capacités |
|--------|------|-----------|
| N0 | `base_user` | Lecture guides |
| N1 | `franchisee_user` | + Support, favoris |
| N2 | `franchisee_admin` | + Pilotage agence, RH, Parc, Outils |
| N3 | `franchisor_user` | + Réseau (animateur) |
| N4 | `franchisor_admin` | + Redevances, Templates (directeur) |
| N5 | `platform_admin` | + Admin, bypass modules |
| N6 | `superadmin` | Accès total + déploiement modules |

### 4.4 Fonctions SQL (RLS)

```sql
-- Source unique: user_modules
has_module_v2(_user_id, _module_key)                → user_modules
has_module_option_v2(_user_id, _module, _option)     → user_modules + options JSONB

-- Guards composites (utilisent has_module_v2 + role)
has_apogee_tickets_access(_user_id)  → user_modules ('ticketing'/'apogee_tickets') + N5+
has_franchiseur_access(_user_id)     → has_module_v2('reseau_franchiseur') + N3+
has_support_access(_user_id)         → has_module_v2('aide') + N5+
is_support_agent(_user_id)           → has_module_option_v2('aide', 'agent')

-- Helpers
has_min_global_role(_user_id, _level)
is_admin(_user_id)                   → has_min_global_role(uid, 5)
get_user_agency_id(_user_id)
```

### 4.5 Gestion des modules dans l'UI

L'écran **Admin > Gestion > Droits** (`ModulesMasterView`) affiche :
- **Arbre déployé** : modules actifs avec switch Déployé, Plan min., Rôle min., Privilèges
- **Section 🚧 En cours de développement** : modules `is_deployed = false`
- Switch Déployé restreint à **N6 uniquement**
- Popovers privilèges individuels pour ajouter/retirer des accès par utilisateur

---

## 5. Flux de Données Majeurs

### 5.1 RAG Pipeline (Helpi)

```
Blocs guides → Chunking → Embeddings (OpenAI)
                               ↓
                         guide_chunks / helpi_chunks
                               ↓
Question → search-embeddings → Top-K chunks
                               ↓
                      chat-guide (Lovable AI)
                               ↓
                         Réponse IA
```

### 5.2 API Apogée

```
AgencyContext → setApiBaseUrl(agence)
                      ↓
    https://{agence}.hc-apogee.fr/api/
                      ↓
              POST + API_KEY partagée
                      ↓
              StatIA (calculs centralisés)
                      ↓
              Indicateurs + Stats
```

> ⚠️ API Apogée rejette les appels backend (CORS/IP). Tout passe par le frontend.

### 5.3 DocGen Pipeline

```
Template DOCX → parse-docx-tokens → Token extraction
                                         ↓
                                  Smart tokens auto-fill
                                         ↓
                       documents-preview → Gotenberg → PDF preview
                                         ↓
                       documents-finalize → Final DOCX/PDF
```

### 5.4 Portail Apporteurs

```
Apporteur → Auth OTP (autonome, pas Supabase Auth)
                    ↓
          get-apporteur-dossiers (via commanditaireId)
                    ↓
          Dossiers / Stats / Demandes
                    ↓
          notify-apporteur-request → Email agence
```

---

## 6. Edge Functions

60+ Edge Functions organisées par domaine :

| Domaine | Fonctions | Auth |
|---------|-----------|------|
| **IA/RAG** | chat-guide, search-embeddings, generate-embeddings, helpi-index, helpi-search | JWT |
| **Admin** | create-user, delete-user, reset-user-password, update-user-email, seed-test-users | JWT + N5+ |
| **RH** | sensitive-data, generate-hr-document, generate-rh-letter, export-rh-documents | JWT + RH |
| **Documents** | parse-docx-tokens, documents-preview, documents-finalize, parse-document | JWT |
| **Apporteurs** | apporteur-auth-*, create-apporteur-*, get-apporteur-*, invite-apporteur-user | Custom OTP/JWT |
| **Metrics** | compute-metric, compute-apporteur-metrics, get-kpis, network-kpis | JWT/CRON |
| **Planning** | suggest-planning, optimize-week, apply-planning-action | JWT |
| **Support** | notify-new-ticket, reply-ticket-email, email-to-ticket | JWT/Webhook |
| **Export** | export-all-data, export-full-database, export-my-data, generate-monthly-report | JWT |
| **Système** | unified-search, media-garbage-collector, maintenance-alerts-scan, purge-old-reports | JWT/CRON |

Shared helpers dans `supabase/functions/_shared/` :
- `cors.ts` — CORS hardened (whitelist origines)
- `rateLimit.ts` — Rate limiting par clé
- `sentry.ts` — Capture exceptions
- `auth.ts` — Extraction profil utilisateur (global_role, agency_id)

---

## 7. Base de Données

### 7.1 Tables Principales

| Domaine | Tables |
|---------|--------|
| **Auth/Profils** | `profiles`, `user_roles` |
| **Permissions** | `module_registry`, `user_modules`, `plan_tiers`, `plan_tier_modules`, `agency_subscription` |
| **Agences** | `apogee_agencies`, `agency_commercial_profile`, `agency_stamps`, `agency_admin_documents` |
| **RH** | `collaborators`, `collaborator_sensitive_data`, `employment_contracts`, `salary_history`, `document_requests`, `leave_requests`, `rh_notifications` |
| **Parc** | `fleet_vehicles`, `fleet_assignments`, `maintenance_events`, `maintenance_alerts`, `epi_stock`, `epi_assignments`, `epi_incidents` |
| **Ticketing** | `apogee_tickets`, `apogee_ticket_statuses`, `apogee_ticket_comments`, `apogee_ticket_attachments`, `apogee_ticket_history`, `apogee_ticket_tags` |
| **Support** | `support_tickets`, `support_messages`, `support_ticket_actions` |
| **Apporteurs** | `apporteurs`, `apporteur_contacts`, `apporteur_users`, `apporteur_managers`, `apporteur_sessions`, `apporteur_otp_codes`, `apporteur_intervention_requests`, `apporteur_project_links` |
| **Médiathèque** | `media_assets`, `media_links`, `media_folders`, `media_tags`, `media_system_folders` |
| **Guides** | `blocks`, `apporteur_blocks`, `guide_chunks`, `knowledge_base`, `apogee_guides` |
| **Documents** | `doc_templates`, `doc_instances` |
| **Réseau** | `agency_royalty_config`, `agency_royalty_tiers`, `agency_royalty_calculations`, `animator_visits` |
| **Audit** | `activity_log`, `sensitive_data_access_log`, `apporteur_access_logs` |

### 7.2 Patterns RLS

```sql
-- Isolation agence
USING (agency_id = get_user_agency_id(auth.uid()))

-- Accès par module (source unique: user_modules)
USING (has_apogee_tickets_access(auth.uid()))
USING (has_franchiseur_access(auth.uid()))

-- Accès admin
USING (has_min_global_role(auth.uid(), 5))

-- Accès propre
USING (user_id = auth.uid())
```

---

## 8. Sécurité

### 8.1 Mesures Implémentées

| Mesure | Statut |
|--------|--------|
| JWT verification | ✅ Toutes Edge Functions |
| CORS whitelist | ✅ Production + localhost + Lovable |
| Rate limiting | ✅ Par fonction |
| RLS policies | ✅ Toutes tables sensibles |
| Input sanitization | ✅ DOMPurify |
| Password policy | ✅ 8+ chars, mixed case, numbers, symbols |
| Données sensibles chiffrées | ✅ AES-256-GCM (Edge Function sensitive-data) |
| Audit logs | ✅ activity_log + sensitive_data_access_log |
| CRON secret validation | ✅ Jobs planifiés |
| Permissions source unique | ✅ user_modules (V0.9.1) |

### 8.2 Origines CORS Autorisées

```typescript
'https://helpconfort.services'
'http://localhost:5173'
'http://localhost:8080'
/\.lovableproject\.com$/
/\.lovable\.app$/
```

---

## 9. État Actuel & Historique

### V0.9.1 (Mars 2026) — Permissions Unifiées
✅ Purge complète `profiles.enabled_modules` JSONB  
✅ Migration 6 fonctions SQL + ~20 policies RLS vers `user_modules`  
✅ Section 🚧 "En cours de développement" dans écran Droits  
✅ Déploiement modules restreint N6

### V0.9.0 (Mars 2026) — Commercial & CRM
✅ Module Commercial (Suivi client, Comparateur, Veille, Prospects)  
✅ Scoring adaptatif apporteurs  
✅ Pipeline prospects 6 états  
✅ Import Excel prospects

### V0.8.7 (Janvier 2026) — Médiathèque Unique
✅ MediaLibraryPortal (composant Finder)  
✅ Documents RH migrés vers Médiathèque  
✅ Suppression tables legacy documents

### Historique antérieur
✅ Permissions V2 (global_role + modules)  
✅ Support unifié (apogee_tickets)  
✅ StatIA (moteur statistiques centralisé)  
✅ DocGen (génération documents DOCX/PDF)  
✅ Portail Apporteurs (auth OTP autonome)  
✅ Rapports Mensuels  

---

## 10. Conventions

### 10.1 Nommage

```
Pages:      PascalCase.tsx
Components: PascalCase.tsx
Hooks:      camelCase.ts (useXxx)
Utils:      camelCase.ts
Config:     camelCase.ts
Tables SQL: snake_case
Module Key: snake_case
```

### 10.2 Ajout de Module

1. Ajouter dans `src/types/modules.ts` (MODULE_DEFINITIONS)
2. Ajouter dans `module_registry` (migration SQL avec `is_deployed = false`)
3. → Le module apparaît automatiquement dans la section 🚧 de l'écran Droits
4. Développer les composants et routes
5. Quand prêt : N6 active `is_deployed = true` → le module monte dans l'arbre
6. Documenter dans ce fichier

---

## Annexes

### A. Documentation

- `docs/MODULES_DOCUMENTATION.md` — Documentation détaillée des modules
- `docs/support-levels.md` — Niveaux support SA1-SA3
- `src/statia/README.md` — Documentation StatIA

### B. Fichiers de Configuration

| Fichier | Rôle |
|---------|------|
| `src/types/modules.ts` | MODULE_DEFINITIONS (source unique) |
| `src/permissions/` | Moteur permissions V3 |
| `src/config/moduleTree.ts` | Seed référence module_registry |
| `src/config/changelog.ts` | Historique versions |
| `src/statia/domain/rules.ts` | Règles métier StatIA |
| `supabase/config.toml` | Config Edge Functions |

---

*Architecture GLOBAL / Apogée — Version 3.0*
