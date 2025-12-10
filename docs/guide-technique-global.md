# Guide Technique — GLOBAL / HELP CONFORT SERVICES

> **Version** : 4.0  
> **Mise à jour** : 10 Décembre 2025  
> **Audience** : Développeurs rejoignant le projet  
> **Score Audit** : 90% Production-ready

---

## Table des matières

1. [Quick Start - Onboarding](#1-quick-start---onboarding)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Applicative](#3-architecture-applicative)
4. [Système de Permissions V2](#4-système-de-permissions-v2)
5. [Modules Fonctionnels (détaillé)](#5-modules-fonctionnels-détaillé)
6. [Base de Données](#6-base-de-données)
7. [Edge Functions](#7-edge-functions)
8. [StatIA - Moteur de Métriques](#8-statia---moteur-de-métriques)
9. [API Apogée (CRM externe)](#9-api-apogée-crm-externe)
10. [Sécurité](#10-sécurité)
11. [Conventions & Best Practices](#11-conventions--best-practices)
12. [Debugging & Monitoring](#12-debugging--monitoring)
13. [Pièges courants & Solutions](#13-pièges-courants--solutions)
14. [Backlog P3](#14-backlog-p3)

---

## 1. Quick Start - Onboarding

### 1.1 Prérequis

```bash
Node.js >= 18.x
npm ou bun (bun préféré)
Git
```

### 1.2 Installation

```bash
# Cloner le repo
git clone <repo-url>
cd helpconfort-services

# Installer les dépendances
bun install  # ou npm install

# Lancer le dev server
bun run dev  # ou npm run dev
```

L'application tourne sur `http://localhost:5173`

### 1.3 Variables d'environnement

Le fichier `.env` est **auto-généré par Lovable Cloud**. Ne jamais le modifier manuellement.

```env
VITE_SUPABASE_URL=https://uxcovgqhgjsuibgdvcof.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=uxcovgqhgjsuibgdvcof
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### 1.4 Comptes de test

Demander à l'équipe les credentials de test pour chaque niveau de rôle :
- N6 (superadmin) - accès total
- N5 (platform_admin) - administration
- N3 (franchisor_user) - vue réseau
- N2 (franchisee_admin) - dirigeant agence
- N1 (franchisee_user) - salarié agence

### 1.5 Fichiers clés à connaître

| Fichier | Description |
|---------|-------------|
| `src/App.tsx` | Routes principales + Guards |
| `src/contexts/AuthContext.tsx` | Authentification + permissions |
| `src/config/roleMatrix.ts` | Matrice des capacités par rôle |
| `src/types/modules.ts` | Définition des modules |
| `src/permissions/permissionsEngine.ts` | Moteur de permissions |
| `src/statia/domain/rules.ts` | Règles métier StatIA |
| `supabase/functions/_shared/` | Helpers Edge Functions |

---

## 2. Stack Technique

### 2.1 Frontend

| Technologie | Version | Usage | Documentation |
|-------------|---------|-------|---------------|
| **React** | 18.3.x | Framework UI | [react.dev](https://react.dev) |
| **TypeScript** | 5.x | Typage statique | Strict mode activé |
| **Vite** | 5.x | Build & dev server | Hot reload rapide |
| **Tailwind CSS** | 3.x | Styling utility-first | Classes dans `index.css` |
| **shadcn/ui** | Latest | Composants UI | Customisés dans `src/components/ui/` |
| **TanStack Query** | 5.x | Data fetching & cache | Queries + Mutations |
| **React Router** | 6.x | Routing | Lazy loading activé |
| **TipTap** | 3.x | Éditeur rich-text | Guides Apogée |
| **Framer Motion** | 12.x | Animations | Transitions pages |
| **Recharts** | 3.x | Graphiques | Dashboards StatIA |
| **Zod** | 4.x | Validation schemas | Formulaires |

### 2.2 Backend (Lovable Cloud / Supabase)

| Service | Usage | Notes |
|---------|-------|-------|
| **PostgreSQL** | BDD relationnelle | 50+ tables, RLS actif |
| **Auth** | Authentification | Email/password uniquement |
| **Storage** | Stockage fichiers | 13 buckets |
| **Edge Functions** | Serverless (Deno) | 41 fonctions |
| **Realtime** | Subscriptions | Support live chat |
| **RLS Policies** | Sécurité données | Isolation agence/rôle |

### 2.3 Services externes

| Service | Usage | Config |
|---------|-------|--------|
| **Lovable AI Gateway** | Chat IA (Gemini) | `LOVABLE_API_KEY` |
| **OpenAI** | Embeddings RAG | `OPENAI_API_KEY` |
| **Sentry** | Error monitoring | `SENTRY_DSN` |
| **API Apogée** | CRM HelpConfort | `APOGEE_API_KEY` |
| **AllMySMS** | Notifications SMS | `ALLMYSMS_*` |
| **Resend** | Emails transactionnels | `RESEND_API_KEY` |

---

## 3. Architecture Applicative

### 3.1 Structure des dossiers

```
src/
├── pages/                    # Pages React Router (70+ pages)
│   ├── Dashboard.tsx         # Page d'accueil avec tiles
│   ├── AdminIndex.tsx        # Hub administration
│   └── ...
│
├── components/
│   ├── ui/                   # shadcn/ui (30+ composants)
│   ├── layout/               # MainLayout, UnifiedHeader, UnifiedSidebar
│   ├── auth/                 # RoleGuard, ModuleGuard, Guards spécialisés
│   ├── category/             # Blocs guides, éditeurs, viewers
│   ├── chatbot/              # Chat IA, suggestions, historique
│   ├── admin/                # Composants administration
│   ├── support/              # Tickets, messages, console
│   ├── rh/                   # Collaborateurs, documents, congés
│   ├── landing/              # Dashboard tiles, widgets
│   └── diffusion/            # Mode TV agence
│
├── apogee-connect/           # 📊 Module indicateurs agence
│   ├── components/           # Charts, widgets, filtres
│   ├── contexts/             # AgencyContext, FiltersContext
│   ├── hooks/                # useIndicateurs, useKPIs
│   ├── pages/                # IndicateursAccueil, Techniciens, etc.
│   ├── services/             # dataService.ts (API calls)
│   └── utils/                # Calculs, formatters
│
├── franchiseur/              # 🏢 Module réseau franchiseur
│   ├── components/           # Tables, comparatifs, graphiques
│   ├── contexts/             # FranchiseurContext, NetworkFiltersContext
│   ├── hooks/                # useNetworkStats, useAgencies
│   ├── pages/                # Stats, Comparatifs, Royalties
│   └── services/             # API réseau
│
├── apogee-tickets/           # 🎫 Module gestion projet
│   ├── components/           # Kanban, TicketDetail, Filters
│   ├── hooks/                # useApogeeTickets, useTicketMutations
│   └── pages/                # ApogeeTicketsKanban
│
├── statia/                   # 📈 Moteur de métriques StatIA
│   ├── definitions/          # Métriques (ca.ts, sav.ts, techniciens.ts)
│   ├── domain/               # rules.ts (règles métier)
│   ├── engine/               # computeStat.ts, loaders.ts
│   ├── hooks/                # useStatiaMetric
│   ├── shared/               # Calculs partagés
│   └── nlp/                  # Parser requêtes NL
│
├── contexts/                 # Contextes React globaux
│   ├── AuthContext.tsx       # Auth + permissions (CENTRAL)
│   ├── EditorContext.tsx     # Édition guides Apogée
│   └── ImpersonationContext.tsx  # Simulation rôles
│
├── hooks/                    # Custom hooks globaux
│   ├── use-auth.ts           # Wrapper AuthContext
│   ├── use-admin-tickets.ts  # Hooks tickets admin
│   └── ...
│
├── lib/                      # Utilitaires
│   ├── logger.ts             # Logger → Sentry
│   ├── sentry.ts             # Config Sentry
│   ├── safeSupabase.ts       # Helpers safe query/mutation
│   └── userModulesUtils.ts   # Conversion modules
│
├── config/                   # Configuration centralisée
│   ├── roleMatrix.ts         # Capacités par rôle
│   └── constants.ts          # Constantes globales
│
├── permissions/              # Système permissions V2
│   ├── permissionsEngine.ts  # Moteur principal
│   └── index.ts              # Exports publics
│
├── types/                    # Types TypeScript
│   ├── globalRoles.ts        # N0-N6 roles enum
│   ├── modules.ts            # Modules & options
│   └── accessControl.ts      # Types contrôle accès
│
└── integrations/supabase/    # ⚠️ AUTO-GÉNÉRÉ - NE PAS MODIFIER
    ├── client.ts             # Client Supabase
    └── types.ts              # Types BDD

supabase/
├── functions/                # 41 Edge Functions (Deno)
│   ├── _shared/              # Helpers partagés
│   │   ├── cors.ts           # CORS whitelist
│   │   ├── rateLimit.ts      # Rate limiting
│   │   ├── auth.ts           # Auth helpers
│   │   └── sentry.ts         # Sentry edge
│   ├── chat-guide/           # Chat IA streaming
│   ├── proxy-apogee/         # Proxy API CRM
│   ├── unified-search/       # Recherche hybride
│   └── ...
├── migrations/               # Migrations SQL (read-only)
└── config.toml               # Config edge functions
```

### 3.2 Flux de données typique

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Composant │────▶│  Custom Hook │────▶│ TanStack Query  │
│    React    │     │ (useXXX)     │     │ useQuery/useMut │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
           ┌────────────────┐           ┌────────────────┐           ┌────────────────┐
           │ Supabase Client│           │ Edge Function  │           │ API Apogée     │
           │ (direct query) │           │ (via invoke)   │           │ (via proxy)    │
           └───────┬────────┘           └───────┬────────┘           └───────┬────────┘
                   │                            │                            │
                   ▼                            ▼                            ▼
           ┌────────────────┐           ┌────────────────┐           ┌────────────────┐
           │   PostgreSQL   │           │  Deno Runtime  │           │  HC Apogée     │
           │   + RLS        │           │  (serverless)  │           │  (CRM externe) │
           └────────────────┘           └────────────────┘           └────────────────┘
```

### 3.3 Patterns architecturaux clés

#### Pattern 1: Context + Hook + Component

```typescript
// 1. Context (src/contexts/AuthContext.tsx)
export const AuthContext = createContext<AuthContextType>(...)

// 2. Hook (src/hooks/use-auth.ts)
export const useAuth = () => useContext(AuthContext);

// 3. Component usage
const MyComponent = () => {
  const { user, hasMinRole, hasModule } = useAuth();
  
  if (!hasMinRole('franchisee_admin')) return <AccessDenied />;
  return <AdminPanel />;
};
```

#### Pattern 2: Safe Data Fetching

```typescript
// Utiliser safeQuery pour éviter les erreurs silencieuses
import { safeQuery } from '@/lib/safeSupabase';

const fetchData = async () => {
  const { data, error } = await safeQuery(
    supabase.from('table').select('*').eq('agency_id', agencyId),
    [],           // Fallback si erreur
    'Fetch table' // Description pour logs
  );
  return data;
};
```

#### Pattern 3: Module Guard Protection

```tsx
// Route protégée par module
<Route path="/hc-agency/*" element={
  <ModuleGuard moduleKey="pilotage_agence">
    <AgencyLayout />
  </ModuleGuard>
} />

// Avec option requise
<ModuleGuard moduleKey="rh" requiredOptions={['rh_admin']}>
  <SalaryManagement />
</ModuleGuard>
```

---

## 4. Système de Permissions V2

### 4.1 Hiérarchie des rôles (N0 → N6)

| Niveau | Rôle | Description | Peut gérer |
|--------|------|-------------|------------|
| **N0** | `base_user` | Externe (support agent possible) | Rien |
| **N1** | `franchisee_user` | Salarié agence | Son profil |
| **N2** | `franchisee_admin` | Dirigeant agence | Son agence, N0-N1 |
| **N3** | `franchisor_user` | Animateur réseau | Agences assignées, N0-N2 |
| **N4** | `franchisor_admin` | Directeur réseau | Tout le réseau, N0-N3 |
| **N5** | `platform_admin` | Admin plateforme | Plateforme, N0-N4 |
| **N6** | `superadmin` | Super-admin | TOUT, y compris N5 |

### 4.2 Sources de permissions

```
profiles.global_role     →  Niveau hiérarchique (N0-N6)
profiles.enabled_modules →  JSONB des modules activés
user_modules (table)     →  Version relationnelle (migration en cours)
```

### 4.3 Structure enabled_modules

```json
{
  "help_academy": { "enabled": true },
  "pilotage_agence": { "enabled": true },
  "support": { 
    "enabled": true, 
    "options": { 
      "agent": true,    // Accès console support
      "admin": false    // Admin support
    }
  },
  "rh": {
    "enabled": true,
    "options": {
      "coffre": true,      // Mon coffre RH (tous)
      "rh_viewer": true,   // Voir équipe (N2+)
      "rh_admin": false    // Admin RH (N2+)
    }
  },
  "apogee_tickets": {
    "enabled": true,
    "options": {
      "kanban": true,   // Vue kanban
      "manage": true,   // Édition tickets
      "import": false   // Import bulk
    }
  }
}
```

### 4.4 Fichiers clés permissions

| Fichier | Responsabilité |
|---------|----------------|
| `src/types/globalRoles.ts` | Enum des 7 rôles |
| `src/types/modules.ts` | Types modules & options |
| `src/config/roleMatrix.ts` | Capacités par rôle |
| `src/permissions/permissionsEngine.ts` | `hasAccess()`, `explainAccess()` |
| `src/components/auth/RoleGuard.tsx` | Guard UI par rôle |
| `src/components/auth/ModuleGuard.tsx` | Guard UI par module |

### 4.5 Fonctions SQL RLS (SECURITY DEFINER)

```sql
-- Vérification rôle minimum
has_min_global_role(user_id uuid, min_level int) → boolean

-- Accès support
has_support_access(user_id uuid) → boolean
is_support_agent(user_id uuid) → boolean

-- Accès franchiseur
has_franchiseur_access(user_id uuid) → boolean
can_access_agency(user_id uuid, agency_id uuid) → boolean

-- Helpers agence
get_user_agency(user_id uuid) → text      -- slug
get_user_agency_id(user_id uuid) → uuid   -- UUID

-- Accès RH
has_agency_rh_role(user_id uuid, agency_id uuid) → boolean

-- Admin check
is_admin(user_id uuid) → boolean  -- N5+
```

### 4.6 Usage dans le code

```typescript
// Dans un composant
const { hasMinRole, hasModule, hasModuleOption, isAdmin } = useAuth();

// Vérifier rôle minimum
if (hasMinRole('franchisor_user')) {
  // N3+ peut voir
}

// Vérifier module activé
if (hasModule('apogee_tickets')) {
  // Module tickets activé
}

// Vérifier option spécifique
if (hasModuleOption('rh', 'rh_admin')) {
  // Admin RH activé
}

// Guards JSX
<RoleGuard minRole="franchisee_admin">
  <SensitiveComponent />
</RoleGuard>

<ModuleGuard moduleKey="support" requiredOptions={['agent']}>
  <SupportConsole />
</ModuleGuard>
```

---

## 5. Modules Fonctionnels (détaillé)

### 5.1 Help Academy (`/academy/*`)

**But** : Guides et formations Apogée + Apporteurs

| Route | Page | Description |
|-------|------|-------------|
| `/academy` | AcademyIndex | Hub des guides |
| `/academy/apogee` | ApogeeGuide | Guide Apogée (liste catégories) |
| `/academy/apogee/:categorySlug` | Category | Catégorie + blocs |
| `/academy/apporteurs` | ApporteurGuide | Guide Apporteurs |
| `/academy/apporteurs/:code` | ApporteurSubcategories | Sous-catégories apporteur |
| `/academy/apporteurs/:code/:slug` | CategoryApporteur | Contenu apporteur |
| `/academy/helpconfort` | HelpConfort | Guide HelpConfort |
| `/academy/documents` | Documents | Bibliothèque docs |

**Tables clés** : `blocks`, `apporteur_blocks`, `documents`, `categories`

**Contextes** : `EditorContext`, `ApporteurEditorContext`

### 5.2 Mon Agence / Pilotage (`/hc-agency/*`)

**But** : KPIs et pilotage pour dirigeants d'agence

| Route | Page | Description |
|-------|------|-------------|
| `/hc-agency` | PilotageIndex | Hub agence |
| `/hc-agency/indicateurs` | IndicateursAccueil | Dashboard KPIs |
| `/hc-agency/indicateurs/apporteurs` | IndicateursApporteurs | CA par apporteur |
| `/hc-agency/indicateurs/univers` | IndicateursUnivers | CA par univers |
| `/hc-agency/indicateurs/techniciens` | IndicateursTechniciens | CA par technicien |
| `/hc-agency/indicateurs/sav` | IndicateursSAV | Taux SAV |
| `/hc-agency/planning` | PlanningHebdo | Planning semaine |
| `/hc-agency/actions` | ActionsAMener | Actions à mener |
| `/hc-agency/diffusion` | DiffusionDashboard | Mode TV |

**Module** : `pilotage_agence`

**Contextes** : `AgencyContext`, `FiltersContext`, `SecondaryFiltersContext`

**Services** : `src/apogee-connect/services/dataService.ts`

### 5.3 Réseau Franchiseur (`/hc-reseau/*`)

**But** : Vue réseau pour animateurs et directeurs

| Route | Page | Description |
|-------|------|-------------|
| `/hc-reseau` | FranchiseurHome | Hub réseau |
| `/hc-reseau/agencies` | FranchiseurAgencies | Liste agences |
| `/hc-reseau/agencies/:slug` | FranchiseurAgencyProfile | Profil agence |
| `/hc-reseau/tableaux` | FranchiseurStats | Tableaux stats |
| `/hc-reseau/periodes` | FranchiseurComparison | Comparatif périodes |
| `/hc-reseau/comparatif` | ComparatifAgencesPage | Comparatif agences |
| `/hc-reseau/graphiques` | ReseauGraphiquesPage | Graphiques réseau |
| `/hc-reseau/redevances` | FranchiseurRoyalties | Calcul redevances |
| `/hc-reseau/animateurs` | FranchiseurAnimateurs | Gestion animateurs |
| `/hc-reseau/utilisateurs` | TDRUsersPage | Utilisateurs réseau |

**Module** : `reseau_franchiseur`

**Contextes** : `FranchiseurContext`, `NetworkFiltersContext`

**Rôle minimum** : N3 (franchisor_user)

### 5.4 Gestion de Projet (`/gestion-projet/*`)

**But** : Tickets développement Apogée (Kanban)

| Route | Page | Description |
|-------|------|-------------|
| `/gestion-projet` | ApogeeTicketsKanban | Board Kanban |
| `/gestion-projet/:ticketId` | TicketDetail (dialog) | Détail ticket |

**Module** : `apogee_tickets`

**Options** : `kanban` (voir), `manage` (éditer), `import` (bulk)

**Tables** : `apogee_tickets`, `apogee_ticket_statuses`, `apogee_ticket_comments`

### 5.5 Support (`/support/*`)

**But** : Assistance utilisateurs (tickets + live chat)

| Route | Page | Description |
|-------|------|-------------|
| `/support` | SupportIndex | Hub support |
| `/support/helpcenter` | Faq | FAQ publique |
| `/support/mes-demandes` | MesDemandes | Mes tickets |

**Console Support** (N5+ ou support.agent) :
| Route | Page |
|-------|------|
| `/admin/support` | AdminSupportTickets |
| `/admin/support/settings` | SupportSettings |
| `/admin/support/stats` | AdminSupportStats |

**Module** : `support`

**Options** : `agent` (console), `admin` (configuration)

**Tables** : `support_tickets`, `support_messages`, `support_ticket_actions`

### 5.6 RH & Parc (`/rh/*`)

**But** : Gestion collaborateurs, documents RH, congés

| Route | Page | Description |
|-------|------|-------------|
| `/rh` | RHIndex | Hub RH |
| `/rh/coffre` | MonCoffreRH | Mon coffre personnel |
| `/rh/demande` | FaireUneDemande | Demander un document |
| `/rh/equipe` | CollaborateursPage | Gestion équipe |
| `/rh/equipe/:id` | CollaborateurProfilePage | Profil collaborateur |
| `/rh/demandes` | DemandesRHPage | Demandes RH (côté RH) |
| `/rh/conges` | GestionConges | Gestion congés |
| `/rh/dashboard` | RHDashboardPage | Dashboard RH |

**Module** : `rh`

**Options** : 
- `coffre` : Accès coffre personnel (tous)
- `rh_viewer` : Voir équipe (N2+)
- `rh_admin` : Admin RH complet (N2+)

**Tables** : `collaborators`, `collaborator_documents`, `document_requests`, `leave_requests`

### 5.7 Administration (`/admin/*`)

**But** : Configuration plateforme (N5+)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminIndex | Hub admin |
| `/admin/utilisateurs` | AdminUsersUnified | Gestion utilisateurs |
| `/admin/agencies` | AdminAgencies | Gestion agences |
| `/admin/backup` | AdminBackup | Backup guides |
| `/admin/faq` | AdminFAQ | Gestion FAQ |
| `/admin/helpi` | AdminHelpi | RAG & indexation |
| `/admin/system-health` | SystemHealth | Santé système |
| `/admin/permissions-center` | PermissionsCenter | Gestion permissions |

**Module** : `admin_plateforme`

**Rôle minimum** : N5 (platform_admin)

---

## 6. Base de Données

### 6.1 Tables principales (50+)

#### Utilisateurs & Auth

```sql
-- Profils utilisateurs (source de vérité)
profiles (
  id UUID PRIMARY KEY,          -- = auth.users.id
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  global_role global_role_type, -- N0-N6
  enabled_modules JSONB,        -- Modules activés
  agency_id UUID REFERENCES apogee_agencies(id),
  agence TEXT,                  -- Slug agence (legacy)
  role_agence TEXT,             -- Rôle dans l'agence
  support_level INTEGER,        -- SA1/SA2/SA3 si agent
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Modules utilisateur (table relationnelle)
user_modules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  module_key TEXT NOT NULL,
  options JSONB,
  enabled_at TIMESTAMPTZ,
  enabled_by UUID
)
```

#### Agences

```sql
apogee_agencies (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,   -- ex: "dax", "bordeaux"
  label TEXT NOT NULL,         -- ex: "HelpConfort Dax"
  is_active BOOLEAN DEFAULT true,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  date_ouverture DATE,
  date_cloture_bilan TEXT
)

-- Assignations animateurs/directeurs
franchiseur_agency_assignments (
  user_id UUID,
  agency_id UUID,
  PRIMARY KEY (user_id, agency_id)
)
```

#### Guides & RAG

```sql
-- Blocs guides Apogée
blocks (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  content TEXT,               -- HTML TipTap
  type TEXT,                  -- 'category', 'section', 'tips'
  parent_id UUID REFERENCES blocks(id),
  order INTEGER,
  color_preset TEXT,
  icon TEXT,
  is_empty BOOLEAN
)

-- Chunks pour RAG
guide_chunks (
  id UUID PRIMARY KEY,
  block_id TEXT,
  block_type TEXT,            -- 'apogee', 'apporteur', 'faq'
  chunk_text TEXT,
  embedding VECTOR(1536),     -- OpenAI embeddings
  metadata JSONB,
  context_type rag_context_type
)
```

#### Support

```sql
support_tickets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT,                  -- 'question', 'bug', 'feature'
  status TEXT,                -- 'new', 'in_progress', 'resolved'
  heat_priority INTEGER,      -- 0-12 (SLA calculé)
  due_at TIMESTAMPTZ,
  sla_status TEXT,            -- 'ok', 'warning', 'late'
  assigned_to UUID,
  support_level INTEGER,      -- N1/N2/N3
  ai_classification TEXT,
  ai_summary TEXT,
  resolved_at TIMESTAMPTZ
)

support_messages (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  sender_id UUID,
  message TEXT,
  is_internal_note BOOLEAN,
  is_system_message BOOLEAN,
  created_at TIMESTAMPTZ
)
```

#### RH & Collaborateurs

```sql
collaborators (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL,
  user_id UUID UNIQUE REFERENCES profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type collaborator_type,     -- TECHNICIEN, ASSISTANTE, DIRIGEANT, etc.
  role TEXT,
  hiring_date DATE,
  leaving_date DATE,          -- NULL = actif
  apogee_user_id INTEGER,     -- Lien CRM
  created_at TIMESTAMPTZ
)

collaborator_documents (
  id UUID PRIMARY KEY,
  collaborator_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  doc_type TEXT,              -- 'FICHE_PAIE', 'CONTRAT', etc.
  title TEXT,
  file_path TEXT,
  visibility TEXT,            -- 'EMPLOYEE', 'RH_ONLY'
  period_month INTEGER,
  period_year INTEGER
)
```

### 6.2 Storage Buckets (13)

| Bucket | Public | Usage | Politique |
|--------|--------|-------|-----------|
| `category-icons` | ✅ | Icônes catégories | Public read |
| `category-images` | ✅ | Images catégories | Public read |
| `documents` | ✅ | Documents guides | Public read |
| `announcement-images` | ✅ | Images annonces | Public read |
| `pptx-assets` | ✅ | Assets PowerPoint | Public read |
| `support-attachments` | ❌ | PJ tickets support | RLS ticket owner/agent |
| `apogee-ticket-attachments` | ❌ | PJ tickets projet | RLS module access |
| `rag-uploads` | ❌ | Documents RAG | RLS admin only |
| `project-files` | ❌ | Fichiers projets | RLS project access |
| `rh-documents` | ❌ | Documents RH | RLS agency + RH role |
| `agency-stamps` | ❌ | Tampons agences | RLS agency |
| `apogee-imports` | ❌ | Imports Excel | RLS admin only |
| `pptx-templates` | ❌ | Templates PPTX | RLS admin only |

### 6.3 Policies RLS - Patterns

```sql
-- Pattern 1: Accès par rôle minimum
CREATE POLICY "N5+ can manage users" ON profiles
FOR ALL USING (has_min_global_role(auth.uid(), 5));

-- Pattern 2: Owner + agents
CREATE POLICY "Owner or support agent" ON support_tickets
FOR SELECT USING (
  user_id = auth.uid() 
  OR is_support_agent(auth.uid())
  OR is_admin(auth.uid())
);

-- Pattern 3: Isolation stricte par agence
CREATE POLICY "Same agency only" ON collaborators
FOR ALL USING (agency_id = get_user_agency_id(auth.uid()));

-- Pattern 4: Accès RH conditionnel
CREATE POLICY "RH or admin access" ON collaborator_documents
FOR ALL USING (
  has_agency_rh_role(auth.uid(), agency_id)
  OR is_admin(auth.uid())
  OR (  -- Ou propriétaire du document
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  )
);

-- Pattern 5: Franchiseur avec scope
CREATE POLICY "Franchiseur scoped" ON apogee_agencies
FOR SELECT USING (
  has_min_global_role(auth.uid(), 5)  -- Admin voit tout
  OR can_access_agency(auth.uid(), id)  -- Franchiseur assigné
  OR get_user_agency_id(auth.uid()) = id  -- Sa propre agence
);
```

---

## 7. Edge Functions

### 7.1 Configuration (`supabase/config.toml`)

Toutes les fonctions ont `verify_jwt = true` par défaut.

```toml
[functions.chat-guide]
verify_jwt = true

[functions.create-user]
verify_jwt = true
```

### 7.2 Helpers partagés (`_shared/`)

```typescript
// cors.ts - CORS sécurisé
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Override par isOriginAllowed
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function isOriginAllowed(origin: string): boolean {
  const ALLOWED = [
    'https://helpconfort.services',
    'http://localhost:5173',
    'http://localhost:8080',
    /\.lovableproject\.com$/,
    /\.lovable\.app$/
  ];
  return ALLOWED.some(pattern => 
    typeof pattern === 'string' ? origin === pattern : pattern.test(origin)
  );
}

export function withCors(response: Response, origin: string): Response {
  if (!isOriginAllowed(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  // Ajoute les headers CORS
  return response;
}

// rateLimit.ts - Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

// auth.ts - Authentication helpers
export async function getUserFromRequest(req: Request, supabaseClient: any) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { user: null, error: 'No auth header' };
  
  const { data: { user }, error } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  
  return { user, error };
}
```

### 7.3 Liste complète des fonctions

#### Authentification & Utilisateurs
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `create-user` | Création utilisateur + profil | 10/min |
| `delete-user` | Suppression compte | 5/min |
| `reset-user-password` | Reset mot de passe | 5/min |
| `update-user-email` | MAJ email | 10/min |
| `seed-test-users` | Données de test (dev) | - |

#### Chat & RAG
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `chat-guide` | Chat IA streaming (Gemini) | 30/min |
| `search-embeddings` | Recherche vectorielle | 30/min |
| `generate-embeddings` | Génération embeddings | 10/min |
| `helpi-search` | Recherche unifiée Helpi | 30/min |
| `helpi-index` | Indexation documents | 5/10min |
| `unified-search` | Recherche hybride stats+docs | 30/min |
| `faq-search` | Recherche FAQ sémantique | 30/min |

#### Support
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `notify-support-ticket` | Notif création ticket (SMS) | 10/min |
| `notify-escalation` | Notif escalade (SMS) | 10/min |
| `support-auto-classify` | Classification IA ticket | 20/min |
| `reformulate-ticket-faq` | Reformulation question | 20/min |

#### StatIA & KPIs
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `compute-metric` | Calcul métrique StatIA | 60/min |
| `get-kpis` | KPIs agence | 20/min (120 pour N3+) |
| `network-kpis` | KPIs réseau franchiseur | 20/min |
| `proxy-apogee` | Proxy API Apogée | 30/min (120 pour N3+) |
| `statia-analyze-metric` | Analyse métrique IA | 10/min |

#### Tickets Apogée
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `qualify-ticket` | Qualification IA | 20/min |
| `merge-tickets` | Fusion tickets | 10/min |
| `scan-ticket-duplicates` | Détection doublons | 10/min |
| `generate-ticket-embedding` | Embedding ticket | 20/min |

#### RH & Documents
| Fonction | Description | Rate Limit |
|----------|-------------|------------|
| `export-rh-documents` | Export documents RH | 5/min |
| `generate-hr-document` | Génération document | 10/min |
| `analyze-payslip` | Analyse bulletin paie | 10/min |
| `generate-leave-decision` | Génération décision congé | 10/min |
| `sensitive-data` | Accès données sensibles | 10/min |
| `export-my-data` | Export RGPD perso | 1/jour |

#### Autres
| Fonction | Description |
|----------|-------------|
| `generate-pptx` | Génération PowerPoint |
| `parse-document` | Parsing documents |
| `index-document` | Indexation RAG |
| `maintenance-alerts-scan` | Scan alertes maintenance |
| `qr-asset` | Génération QR codes |
| `test-sms` / `test-email-template` | Tests notifications |

### 7.4 Appels depuis le frontend

```typescript
// Standard - avec JWT automatique
const { data, error } = await supabase.functions.invoke('compute-metric', {
  body: { metricId: 'ca_global_ht', period: { month: 12, year: 2025 } }
});

// Avec safe helper
import { safeInvoke } from '@/lib/safeSupabase';
const { data } = await safeInvoke<MetricResult>('compute-metric', {
  body: { metricId: 'ca_global_ht' }
});

// Streaming (chat-guide)
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guide`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages, context: 'apogee', stream: true })
  }
);
// Lecture du stream SSE...
```

---

## 8. StatIA - Moteur de Métriques

### 8.1 Architecture

```
User Query ("CA par univers en décembre")
         │
         ▼
┌─────────────────────┐
│  NLP Parser V4      │  src/statia/nlp/statiaIntent.ts
│  (tokenize, parse)  │
└─────────┬───────────┘
         │ ParsedQuery
         ▼
┌─────────────────────┐
│  Metric Registry    │  src/statia/nlp/metricRegistry.ts
│  (selectMetric)     │
└─────────┬───────────┘
         │ MetricDefinition
         ▼
┌─────────────────────┐
│  Data Loaders       │  src/statia/engine/loaders.ts
│  (loadApogeeData)   │
└─────────┬───────────┘
         │ Raw data
         ▼
┌─────────────────────┐
│  Compute Engine     │  src/statia/definitions/*.ts
│  (metric.compute)   │
└─────────┬───────────┘
         │ Raw result
         ▼
┌─────────────────────┐
│  Enrichment         │  src/statia/shared/enrichment.ts
│  (format, color)    │
└─────────────────────┘
         │
         ▼
    Formatted Result
```

### 8.2 Métriques disponibles

| Famille | Métriques | Description |
|---------|-----------|-------------|
| **CA** | `ca_global_ht` | CA total HT (invoices) |
| | `ca_par_univers` | CA ventilé par univers |
| | `ca_par_apporteur` | CA ventilé par apporteur |
| | `ca_par_technicien` | CA attribué aux techniciens |
| | `ca_moyen_par_jour` | CA moyen / jour ouvré |
| **SAV** | `taux_sav_global` | % dossiers SAV |
| | `taux_sav_ytd` | % SAV year-to-date |
| | `ca_impacte_sav` | CA concerné par SAV |
| | `cout_sav_estime` | Coût estimé SAV |
| **Devis** | `taux_transformation_nombre` | % devis transformés (nb) |
| | `taux_transformation_montant` | % devis transformés (€) |
| **Délais** | `delai_premier_devis` | Jours avant 1er devis |
| | `delai_facturation` | Jours avant facturation |
| **Recouvrement** | `du_global_ttc` | Encours total TTC |
| | `du_apporteurs_ttc` | Encours apporteurs |
| | `taux_recouvrement` | % encaissé |

### 8.3 Règles métier (`src/statia/domain/rules.ts`)

```typescript
export const STATIA_RULES = {
  // Source CA
  ca: {
    source: 'apiGetFactures.data.totalHT',
    states: ['sent', 'paid', 'partial', 'partially_paid', 'overdue'],
    avoirHandling: 'subtract',  // Avoirs = montants négatifs
    dateField: 'dateReelle'     // Priorité sur date
  },
  
  // Types techniciens
  technicians: {
    productiveTypes: ['depannage', 'travaux', 'recherche de fuite'],
    nonProductiveTypes: ['RT', 'TH', 'SAV', 'diagnostic'],
    rtGeneratesNoCA: true,
    attributionMode: 'proportional'  // Prorata temps
  },
  
  // SAV
  sav: {
    detection: ['intervention.type.includes("sav")', 'project.isSav'],
    caImpact: 0,
    excludeFromTechStats: true
  },
  
  // Devis
  devis: {
    validatedStates: ['validated', 'signed', 'order', 'accepted'],
    linkedInvoiceAutoValidated: true
  }
};
```

### 8.4 Usage dans le code

```typescript
// Hook React
import { useStatiaMetric } from '@/statia/hooks/useStatiaMetric';

const { data, isLoading, error } = useStatiaMetric('ca_par_univers', {
  period: { month: 12, year: 2025 },
  agencySlug: 'dax'
});

// Résultat typé
// data = {
//   plomberie: { name: 'Plomberie', ca: 45000, color: '#2196F3' },
//   electricite: { name: 'Électricité', ca: 32000, color: '#FF9800' },
//   ...
// }

// Hook pour plusieurs métriques
import { useStatiaMetrics } from '@/statia/hooks/useStatiaMetrics';

const { data: metrics } = useStatiaMetrics(
  ['ca_global_ht', 'taux_sav_ytd', 'du_global_ttc'],
  { period, agencySlug }
);
```

---

## 9. API Apogée (CRM externe)

### 9.1 Configuration

```typescript
// API Key globale (partagée toutes agences)
APOGEE_API_KEY = "HC-0fbff339d2a701e86d63f66c1a8c8bf54"

// Base URL par agence (CRITIQUE: jamais hardcodé!)
const baseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
```

### 9.2 Endpoints principaux

| Endpoint | Description | Méthode |
|----------|-------------|---------|
| `apiGetProjects` | Dossiers/projets | POST |
| `apiGetInterventions` | Interventions/RDV | POST |
| `apiGetFactures` | Factures | POST |
| `apiGetDevis` | Devis | POST |
| `apiGetClients` | Clients & apporteurs | POST |
| `apiGetUsers` | Utilisateurs/techniciens | POST |

### 9.3 Appel via proxy

```typescript
// Frontend → proxy-apogee → API Apogée
const { data, error } = await supabase.functions.invoke('proxy-apogee', {
  body: {
    endpoint: 'apiGetFactures',
    params: {
      dateStart: '2025-01-01',
      dateEnd: '2025-12-31'
    }
  }
});
```

### 9.4 Règle critique : Isolation données

⚠️ **JAMAIS** de hardcoded agency slug dans le code !

```typescript
// ❌ INTERDIT
const url = 'https://dax.hc-apogee.fr/api/...';

// ✅ CORRECT
const { agence } = useAuth();  // ou depuis profiles
const url = `https://${agence}.hc-apogee.fr/api/...`;
```

---

## 10. Sécurité

### 10.1 Checklist (100% complété)

- [x] JWT vérifié sur 41/41 Edge Functions
- [x] CORS whitelist stricte
- [x] Rate limiting actif
- [x] RLS policies sur toutes tables sensibles
- [x] Secrets côté serveur uniquement
- [x] Validation input (Zod)
- [x] Sanitization HTML (DOMPurify)
- [x] Sentry monitoring
- [x] Données sensibles chiffrées
- [x] Audit logs RH

### 10.2 Secrets configurés

| Secret | Usage |
|--------|-------|
| `LOVABLE_API_KEY` | AI Gateway |
| `OPENAI_API_KEY` | Embeddings |
| `APOGEE_API_KEY` | API CRM |
| `SENTRY_DSN` | Monitoring |
| `ALLMYSMS_*` | SMS |
| `RESEND_API_KEY` | Emails |
| `SENSITIVE_DATA_ENCRYPTION_KEY` | Chiffrement RH |

### 10.3 CORS Whitelist

```typescript
const ALLOWED_ORIGINS = [
  'https://helpconfort.services',      // Production
  'http://localhost:5173',             // Dev Vite
  'http://localhost:8080',             // Dev alt
  /\.lovableproject\.com$/,            // Preview Lovable
  /\.lovable\.app$/                    // Deploy Lovable
];
```

---

## 11. Conventions & Best Practices

### 11.1 Nommage fichiers

```
Pages:              PascalCase.tsx     (AdminUsers.tsx)
Components:         PascalCase.tsx     (UserCard.tsx)
Hooks:              use-kebab-case.ts  (use-admin-tickets.ts)
Utils:              camelCase.ts       (actionsCalculations.ts)
Types:              camelCase.ts       (globalRoles.ts)
Config:             camelCase.ts       (roleMatrix.ts)
Edge Functions:     kebab-case/        (chat-guide/)
```

### 11.2 Imports

```typescript
// Ordre recommandé
import { useState, useEffect } from 'react';          // React
import { useQuery } from '@tanstack/react-query';      // Libs externes
import { supabase } from '@/integrations/supabase/client';  // Supabase
import { useAuth } from '@/hooks/use-auth';            // Hooks internes
import { Button } from '@/components/ui/button';       // Components
import { logError } from '@/lib/logger';               // Utils
import type { UserProfile } from '@/types';            // Types
```

### 11.3 Gestion erreurs

```typescript
// ✅ Utiliser le logger centralisé (→ Sentry automatique)
import { logError, logInfo, logWarning } from '@/lib/logger';

logError('ModuleName', 'Description erreur', error);
logInfo('ModuleName', 'Info message', { context });
logWarning('ModuleName', 'Warning message');

// ❌ NE JAMAIS utiliser en production
console.log('debug');
console.error('error');

// ✅ Pour debug dev uniquement
import { IS_DEV } from '@/lib/constants';
if (IS_DEV) console.log('debug:', data);
```

### 11.4 Safe Helpers Supabase

```typescript
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeSupabase';

// Query avec fallback
const { data } = await safeQuery(
  supabase.from('profiles').select('*').eq('agency_id', agencyId),
  [],                  // Valeur par défaut si erreur
  'Fetch profiles'     // Description pour logs
);

// Mutation
await safeMutation(
  supabase.from('profiles').update({ name }).eq('id', userId),
  'Update profile'
);

// Edge Function
const result = await safeInvoke<ResponseType>('function-name', {
  body: { param: value }
});
```

### 11.5 Composants

```tsx
// ✅ Composant bien structuré
interface UserCardProps {
  user: UserProfile;
  onEdit?: (id: string) => void;
}

export const UserCard = ({ user, onEdit }: UserCardProps) => {
  const { hasMinRole } = useAuth();
  
  // Early returns pour les guards
  if (!user) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Contenu */}
      </CardContent>
      {hasMinRole('franchisee_admin') && onEdit && (
        <CardFooter>
          <Button onClick={() => onEdit(user.id)}>Éditer</Button>
        </CardFooter>
      )}
    </Card>
  );
};
```

---

## 12. Debugging & Monitoring

### 12.1 Sentry

```typescript
// Contexte utilisateur automatique dans AuthContext
Sentry.setUser({
  id: user.id,
  email: user.email,
  global_role: profile.global_role,
  agency: profile.agence
});

// Tags automatiques
Sentry.setTag('module', 'support');
```

### 12.2 Pages admin debug

| Route | Description |
|-------|-------------|
| `/admin/system-health` | Santé système, Sentry test |
| `/admin/helpi` | RAG indexation, stats chunks |
| `/admin/statia` | Test métriques StatIA |
| `/admin/permissions-center` | Audit permissions utilisateurs |

### 12.3 Console logs Edge Functions

```typescript
// Dans une Edge Function
console.log('[chat-guide] User:', userId);
console.log('[chat-guide] Request:', JSON.stringify(body));

// Visible dans Lovable Cloud > Logs ou Supabase Dashboard
```

### 12.4 React Query DevTools

```typescript
// Activé en dev automatiquement
// Ouvrir avec le bouton flottant en bas à droite
```

---

## 13. Pièges courants & Solutions

### 13.1 RLS "No rows returned"

**Symptôme** : Query retourne `[]` alors que les données existent

**Causes possibles** :
1. RLS policy bloque l'accès
2. `agency_id` ne matche pas
3. Utilisateur non authentifié

**Debug** :
```sql
-- Dans SQL Editor Supabase
SELECT * FROM table WHERE id = 'xxx';  -- Sans RLS
-- Puis vérifier les policies
```

### 13.2 Edge Function 403/401

**Symptôme** : "Unauthorized" ou "Forbidden"

**Causes** :
1. JWT expiré → refresh token
2. CORS origin non whitelisté
3. Rate limit atteint

**Solution** :
```typescript
// Vérifier le token
const { data: { session } } = await supabase.auth.getSession();
if (!session) await supabase.auth.refreshSession();
```

### 13.3 Données d'une autre agence

**Symptôme** : L'utilisateur voit des données qui ne lui appartiennent pas

**Cause** : URL API hardcodée ou agencySlug mal récupéré

**Solution** : Toujours utiliser `useAuth().agence` ou `get_user_agency()`

### 13.4 Permissions incohérentes

**Symptôme** : UI affiche un élément mais l'action échoue

**Cause** : Guard UI et RLS policy désynchronisés

**Solution** : 
```typescript
// Vérifier les deux niveaux
// 1. UI: hasMinRole(), hasModule()
// 2. RLS: has_min_global_role(), has_module_v2()
```

### 13.5 Types Supabase outdated

**Symptôme** : TypeScript erreur sur colonnes/tables

**Cause** : `types.ts` pas synchronisé avec la BDD

**Solution** : Ce fichier est auto-généré. Demander une re-génération.

---

## 14. Backlog P3 (Post-production)

- [ ] Typage complet API Apogée (`src/apogee-connect/types/apogee-api.ts`)
- [ ] Typer `dataService.ts` avec interfaces
- [ ] Tests unitaires hooks critiques
- [ ] Tests E2E parcours utilisateurs
- [ ] Lazy loading plus agressif
- [ ] JSDoc sur fonctions exportées
- [ ] Storybook composants UI
- [ ] Migration complète `enabled_modules` → `user_modules`
- [ ] Suppression colonnes legacy collaborators

---

## Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **Agence** | Franchise locale HelpConfort (ex: Dax, Bordeaux) |
| **Apporteur** | Client B2B qui envoie des dossiers (assurance, bailleur) |
| **Dossier** | Unité de travail = 1 projet dans Apogée |
| **Intervention** | RDV terrain d'un technicien |
| **SAV** | Service Après-Vente = reprise gratuite |
| **RT** | Relevé Technique (diagnostic) |
| **StatIA** | Moteur de métriques interne |
| **RAG** | Retrieval-Augmented Generation (chat IA) |

### B. Contacts

| Rôle | Contact |
|------|---------|
| Lead Dev | [À compléter] |
| Product Owner | [À compléter] |
| Support Lovable | support@lovable.dev |

---

*Guide technique GLOBAL / HelpConfort Services — Version 4.0 — Décembre 2025*
