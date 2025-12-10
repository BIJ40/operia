# Guide Technique — GLOBAL / HELP CONFORT SERVICES

> **Version** : 3.0  
> **Mise à jour** : 10 Décembre 2025  
> **Audience** : Développeurs, architectes, DevOps  
> **Score Audit** : 90% Production-ready

---

## 1. Stack Technique

### 1.1 Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3.x | Framework UI |
| TypeScript | 5.x | Typage statique |
| Vite | 5.x | Build & dev server |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Composants UI |
| TanStack Query | 5.x | Data fetching & cache |
| React Router | 6.x | Routing |
| TipTap | 3.x | Éditeur rich-text |
| Framer Motion | 12.x | Animations |
| Recharts | 3.x | Graphiques |

### 1.2 Backend (Lovable Cloud / Supabase)

| Service | Usage |
|---------|-------|
| PostgreSQL | Base de données relationnelle (50+ tables) |
| Auth | Authentification (email/password) |
| Storage | 13 buckets (documents, avatars, templates) |
| Edge Functions | 41 fonctions serverless (Deno) |
| Realtime | Subscriptions temps réel |
| RLS Policies | Isolation données par agence/rôle |

### 1.3 Services externes

| Service | Usage |
|---------|-------|
| Lovable AI Gateway | Chat IA (Gemini 2.5 Flash/Pro) |
| OpenAI | Génération embeddings |
| Sentry | Monitoring erreurs (frontend + edge) |
| API Apogée | Données CRM HelpConfort |
| AllMySMS | Notifications SMS |
| Resend | Emails transactionnels |

---

## 2. Architecture Applicative

### 2.1 Structure des dossiers

```
src/
├── pages/                    # Pages React Router
├── components/
│   ├── ui/                   # Composants shadcn/ui
│   ├── layout/               # MainLayout, Header, Sidebar
│   ├── auth/                 # RoleGuard, ModuleGuard
│   ├── category/             # Composants guides
│   ├── chatbot/              # Composants chat IA
│   ├── admin/                # Composants administration
│   ├── support/              # Composants support
│   ├── rh/                   # Composants RH
│   ├── landing/              # Composants dashboard
│   └── diffusion/            # Composants mode TV
├── apogee-connect/           # Module indicateurs agence
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   └── utils/
├── franchiseur/              # Module réseau franchiseur
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── services/
├── apogee-tickets/           # Module gestion projet
│   ├── components/
│   ├── hooks/
│   └── pages/
├── statia/                   # Moteur de métriques StatIA
│   ├── definitions/          # Définitions métriques
│   ├── domain/               # Règles métier
│   ├── engine/               # Moteur de calcul
│   ├── hooks/
│   └── shared/               # Utilitaires partagés
├── contexts/                 # Contextes React globaux
├── hooks/                    # Custom hooks
├── lib/                      # Utilitaires (logger, etc.)
├── config/                   # Configuration centralisée
├── permissions/              # Système permissions V2
├── types/                    # Types TypeScript
└── integrations/supabase/    # Client Supabase (auto-généré)

supabase/
├── functions/                # 41 Edge Functions
│   ├── _shared/              # Helpers partagés (CORS, rate limit, auth)
│   ├── chat-guide/
│   ├── proxy-apogee/
│   ├── unified-search/
│   └── ...
└── migrations/               # Migrations SQL
```

### 2.2 Modules fonctionnels

| Module | Route | Description |
|--------|-------|-------------|
| Help Academy | `/academy/*` | Guides Apogée & Apporteurs |
| Mon Agence | `/hc-agency/*` | Indicateurs & pilotage agence |
| Réseau Franchiseur | `/hc-reseau/*` | Stats & gestion réseau |
| Gestion de Projet | `/gestion-projet/*` | Tickets développement Apogée |
| Support | `/support/*` | Assistance utilisateurs |
| RH & Parc | `/rh/*` | Gestion collaborateurs & documents |
| Administration | `/admin/*` | Configuration plateforme |

### 2.3 Patterns architecturaux

#### Contextes React

```typescript
// Contextes globaux
AuthContext        // Auth, profil, global_role, enabled_modules
EditorContext      // Gestion blocs guides Apogée
ApporteurEditorContext // Gestion blocs apporteurs
ImpersonationContext   // Simulation de rôles (admin)

// Contextes modules
AgencyContext      // Configuration API agence
FiltersContext     // Filtres temporels indicateurs
SecondaryFiltersContext // Filtres secondaires
FranchiseurContext // État réseau franchiseur
NetworkFiltersContext  // Filtres réseau
```

#### Custom Hooks

```typescript
// Hooks métier
useAuth()           // Session, profil, helpers auth
useHasGlobalRole()  // Vérification rôle minimum
useCategory()       // Logique pages catégories
useChatbot()        // Logique chat IA

// Hooks data
useAdminStats()     // Statistiques admin
useSupportTicket()  // Gestion ticket support
useApogeeTickets()  // Gestion tickets projet
useNetworkStats()   // Statistiques réseau
useCollaborators()  // Gestion collaborateurs RH
useStatiaMetric()   // Métriques StatIA
```

---

## 3. Système de Permissions V2

### 3.1 Hiérarchie des rôles

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Utilisateur externe (support agent possible) |
| N1 | `franchisee_user` | Salarié agence |
| N2 | `franchisee_admin` | Dirigeant agence |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur réseau |
| N5 | `platform_admin` | Administrateur plateforme |
| N6 | `superadmin` | Super-administrateur |

### 3.2 Architecture permissions

```
profiles.global_role (N0-N6)
profiles.enabled_modules (JSONB)
        ↓
    ROLE_MATRIX + MODULE_DEFINITIONS
        ↓
    RoleGuard / ModuleGuard
        ↓
    Accès page/feature
```

### 3.3 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/types/globalRoles.ts` | Définition des 7 rôles |
| `src/config/roleMatrix.ts` | Matrice des capacités |
| `src/types/modules.ts` | Définition des modules |
| `src/permissions/permissionsEngine.ts` | Moteur permissions |
| `src/components/auth/RoleGuard.tsx` | Guard par rôle |
| `src/components/auth/ModuleGuard.tsx` | Guard par module |

### 3.4 Fonctions SQL (SECURITY DEFINER)

```sql
has_min_global_role(user_id, min_level) → boolean
has_support_access(user_id) → boolean
has_franchiseur_access(user_id) → boolean
is_support_agent(user_id) → boolean
is_admin(user_id) → boolean
get_user_agency(user_id) → text
get_user_agency_id(user_id) → uuid
can_access_agency(user_id, agency_id) → boolean
has_agency_rh_role(user_id, agency_id) → boolean
has_module_v2(user_id, module_key) → boolean
```

### 3.5 Usage

```tsx
// Protection par rôle minimum
<RoleGuard minRole="franchisee_admin">
  <ProtectedPage />
</RoleGuard>

// Protection par module activé
<ModuleGuard moduleKey="apogee_tickets" requiredOptions={['kanban']}>
  <KanbanBoard />
</ModuleGuard>

// Vérification programmatique
const { hasMinRole } = useAuth();
if (hasMinRole('franchisor_user')) { ... }
```

---

## 4. Edge Functions (41 fonctions)

### 4.1 Configuration globale

Toutes les fonctions ont `verify_jwt = true` dans `supabase/config.toml`.

### 4.2 Helpers partagés (`_shared/`)

```typescript
// cors.ts - CORS hardened
withCors(response) → Response
isOriginAllowed(origin) → boolean  // whitelist strict

// rateLimit.ts - Rate limiting par fonction
checkRateLimit(key, limit, windowMs) → { allowed, retryAfter }

// auth.ts - Helpers authentification
getUserFromRequest(req) → { user, error }
assertMinRole(user, minLevel) → void

// error.ts - Gestion erreurs
handleError(error, corsHeaders) → Response

// sentry.ts - Monitoring
initSentry()
captureException(error, context)
```

### 4.3 Fonctions par catégorie

#### Authentification & Utilisateurs
| Fonction | Description |
|----------|-------------|
| `create-user` | Création utilisateur + profil |
| `delete-user` | Suppression compte |
| `reset-user-password` | Reset mot de passe |
| `update-user-email` | Mise à jour email |
| `seed-test-users` | Données de test (dev only) |

#### Chat & RAG
| Fonction | Description |
|----------|-------------|
| `chat-guide` | Chat IA avec RAG (streaming) |
| `search-embeddings` | Recherche vectorielle |
| `generate-embeddings` | Génération embeddings OpenAI |
| `helpi-search` | Recherche unifiée Helpi |
| `helpi-index` | Indexation documents |
| `unified-search` | Recherche hybride (stats + docs) |
| `faq-search` | Recherche FAQ sémantique |

#### Support
| Fonction | Description |
|----------|-------------|
| `notify-support-ticket` | Notification création ticket |
| `notify-escalation` | Notification escalade |
| `support-auto-classify` | Classification IA ticket |
| `reformulate-ticket-faq` | Reformulation question |

#### StatIA & KPIs
| Fonction | Description |
|----------|-------------|
| `compute-metric` | Calcul métrique StatIA |
| `get-kpis` | KPIs agence |
| `network-kpis` | KPIs réseau franchiseur |
| `proxy-apogee` | Proxy API Apogée |
| `statia-analyze-metric` | Analyse métrique IA |

#### Tickets Apogée
| Fonction | Description |
|----------|-------------|
| `qualify-ticket` | Qualification IA ticket |
| `merge-tickets` | Fusion tickets |
| `scan-ticket-duplicates` | Détection doublons |
| `generate-ticket-embedding` | Embedding ticket |

#### RH & Documents
| Fonction | Description |
|----------|-------------|
| `export-rh-documents` | Export documents RH |
| `generate-hr-document` | Génération document RH |
| `analyze-payslip` | Analyse bulletin paie |
| `generate-leave-decision` | Génération décision congé |
| `sensitive-data` | Accès données sensibles |
| `export-my-data` | Export RGPD données perso |

#### Autres
| Fonction | Description |
|----------|-------------|
| `generate-pptx` | Génération PowerPoint |
| `parse-document` | Parsing documents |
| `index-document` | Indexation document RAG |
| `maintenance-alerts-scan` | Scan alertes maintenance |
| `qr-asset` | Génération QR codes |
| `test-sms` / `test-email-template` | Tests notifications |

### 4.4 Appel depuis le frontend

```typescript
// Standard (avec JWT automatique)
const { data, error } = await supabase.functions.invoke('compute-metric', {
  body: { metricId: 'ca_global_ht', period: { month: 12, year: 2025 } }
});

// Streaming (SSE)
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
```

---

## 5. Base de Données

### 5.1 Tables principales (50+)

#### Utilisateurs & Auth
```sql
profiles (id, email, first_name, last_name, global_role, enabled_modules, 
          agency_id, agence, role_agence, support_level, is_active)
user_modules (user_id, module_key, options)
```

#### Agences
```sql
apogee_agencies (id, slug, label, is_active, adresse, ville, ...)
franchiseur_agency_assignments (user_id, agency_id)
franchiseur_roles (user_id, franchiseur_role, permissions)
agency_rh_roles (user_id, agency_id)
```

#### Guides & RAG
```sql
blocks (id, slug, title, content, type, parent_id, order)
apporteur_blocks (id, slug, title, content, type, parent_id)
guide_chunks (id, block_id, chunk_text, embedding, metadata, context_type)
faq_items (id, question, answer, category_id, is_published)
```

#### Support
```sql
support_tickets (id, user_id, type, status, heat_priority, due_at, sla_status,
                 assigned_to, support_level, ai_classification, ai_summary)
support_messages (id, ticket_id, sender_id, message, is_internal_note)
support_ticket_actions (id, ticket_id, action_type, old_value, new_value)
```

#### Tickets Projet
```sql
apogee_tickets (id, element_concerne, description, kanban_status, heat_priority,
                module, owner_side, is_qualified, impact_tags, h_min, h_max)
apogee_ticket_statuses (id, label, color, display_order, is_final)
apogee_ticket_transitions (from_status, to_status, allowed_role)
apogee_ticket_comments (id, ticket_id, body, author_type)
```

#### RH & Collaborateurs
```sql
collaborators (id, agency_id, user_id, first_name, last_name, email, type, role,
               hiring_date, leaving_date, apogee_user_id)
collaborator_documents (id, collaborator_id, doc_type, file_path, visibility)
collaborator_sensitive_data (id, collaborator_id, ssn_encrypted, ...)
employment_contracts (id, collaborator_id, contract_type, start_date, end_date)
document_requests (id, collaborator_id, request_type, status, response_document_id)
leave_requests (id, collaborator_id, type, start_date, end_date, status)
rh_notifications (id, recipient_id, notification_type, is_read)
```

### 5.2 Storage Buckets (13)

| Bucket | Public | Usage |
|--------|--------|-------|
| `category-icons` | ✅ | Icônes catégories |
| `category-images` | ✅ | Images catégories |
| `documents` | ✅ | Documents guides |
| `announcement-images` | ✅ | Images annonces |
| `pptx-assets` | ✅ | Assets PowerPoint |
| `support-attachments` | ❌ | PJ tickets support |
| `apogee-ticket-attachments` | ❌ | PJ tickets projet |
| `rag-uploads` | ❌ | Documents RAG |
| `project-files` | ❌ | Fichiers projets |
| `rh-documents` | ❌ | Documents RH |
| `agency-stamps` | ❌ | Tampons agences |
| `apogee-imports` | ❌ | Imports Excel |
| `pptx-templates` | ❌ | Templates PPTX |

### 5.3 Policies RLS

```sql
-- Accès par rôle minimum
CREATE POLICY "N5+ can manage" ON table
USING (has_min_global_role(auth.uid(), 5));

-- Accès support agent
CREATE POLICY "Support agents only" ON support_tickets
FOR SELECT USING (
  user_id = auth.uid() 
  OR is_support_agent(auth.uid())
  OR is_admin(auth.uid())
);

-- Isolation agence stricte
CREATE POLICY "Agency isolation" ON collaborators
USING (agency_id = get_user_agency_id(auth.uid()));

-- Accès RH
CREATE POLICY "RH access" ON collaborator_documents
USING (
  has_agency_rh_role(auth.uid(), agency_id)
  OR is_admin(auth.uid())
);
```

---

## 6. StatIA - Moteur de Métriques

### 6.1 Architecture

```
Définitions (src/statia/definitions/)
        ↓
    Parser NLP (statiaIntent.ts)
        ↓
    Metric Registry (metricRegistry.ts)
        ↓
    Engine (compute functions)
        ↓
    Formatters (enrichment, display)
```

### 6.2 Métriques disponibles

| Famille | Métriques |
|---------|-----------|
| CA | `ca_global_ht`, `ca_par_univers`, `ca_par_apporteur`, `ca_par_technicien` |
| SAV | `taux_sav_global`, `taux_sav_ytd`, `ca_impacte_sav`, `cout_sav_estime` |
| Devis | `taux_transformation_nombre`, `taux_transformation_montant` |
| Délais | `delai_premier_devis`, `delai_facturation` |
| Recouvrement | `du_global_ttc`, `du_apporteurs_ttc`, `taux_recouvrement` |

### 6.3 Règles métier (src/statia/domain/rules.ts)

```typescript
// Source CA
CA_SOURCE = 'apiGetFactures.data.totalHT'

// Types techniciens productifs
PRODUCTIVE_TYPES = ['depannage', 'travaux', 'recherche de fuite']
NON_PRODUCTIVE_TYPES = ['RT', 'TH', 'SAV', 'diagnostic']

// Avoirs = montants négatifs (toujours soustraits)
AVOIR_HANDLING = 'subtract_negative'

// RT ne génère jamais de CA technicien
RT_GENERATES_NO_CA = true
```

---

## 7. Sécurité ✅

### 7.1 Checklist (100% complété)

- [x] JWT vérifié sur toutes les 41 Edge Functions
- [x] CORS configuré (whitelist stricte)
- [x] Rate limiting actif (30 req/min chat, 5 req/10min RAG)
- [x] RLS policies sur toutes les tables sensibles
- [x] Secrets côté serveur uniquement
- [x] Validation input (Zod schemas)
- [x] Sanitization HTML (DOMPurify)
- [x] Sentry monitoring (frontend + edge)
- [x] Données sensibles chiffrées (collaborator_sensitive_data)
- [x] Audit logs RH (rh_audit_log)

### 7.2 Secrets configurés

```
LOVABLE_API_KEY        # AI Gateway
OPENAI_API_KEY         # Embeddings
APOGEE_API_KEY         # API CRM
SENTRY_DSN             # Monitoring
ALLMYSMS_API_KEY       # SMS
ALLMYSMS_LOGIN
ALLMYSMS_SUPPORT_PHONES
RESEND_API_KEY         # Emails
SENSITIVE_DATA_ENCRYPTION_KEY  # Chiffrement
```

### 7.3 CORS Whitelist

```typescript
const ALLOWED_ORIGINS = [
  'https://helpconfort.services',
  'http://localhost:5173',
  'http://localhost:8080',
  /\.lovableproject\.com$/,
  /\.lovable\.app$/
];
```

---

## 8. Conventions & Best Practices

### 8.1 Nommage fichiers

```
Pages:              PascalCase.tsx (AdminUsers.tsx)
Components:         PascalCase.tsx (UserCard.tsx)
Hooks:              use-kebab-case.ts (use-admin-tickets.ts)
Utils:              camelCase.ts (actionsCalculations.ts)
Types:              camelCase.ts (globalRoles.ts)
Config:             camelCase.ts (roleMatrix.ts)
Edge Functions:     kebab-case/ (chat-guide/)
```

### 8.2 Gestion erreurs

```typescript
// Logger centralisé (→ Sentry automatique)
import { logError, logInfo } from '@/lib/logger';

logError('Module', 'Description', error);
logInfo('Module', 'Message', { context });

// Ne jamais utiliser console.log/error en production
// Utiliser IS_DEV pour logs dev-only
if (IS_DEV) console.log('debug:', data);
```

### 8.3 Safe Helpers

```typescript
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeSupabase';

// Query avec fallback
const { data, error } = await safeQuery(
  supabase.from('table').select('*'),
  [],  // fallback si erreur
  'Description opération'
);

// Mutation
await safeMutation(
  supabase.from('table').insert({ ... }),
  'Création enregistrement'
);

// Edge Function
await safeInvoke('function-name', { body: { ... } });
```

---

## 9. Monitoring & Debug

### 9.1 Sentry

```typescript
// Contexte utilisateur automatique
Sentry.setUser({
  id: user.id,
  email: user.email,
  global_role: user.global_role,
  agency: user.agence
});

// Tags automatiques
Sentry.setTag('module', 'support');
```

### 9.2 Pages admin debug

| Route | Description |
|-------|-------------|
| `/admin/system-health` | Santé système & Sentry |
| `/admin/helpi` | RAG indexation & debug |
| `/admin/statia` | Métriques & tests |

---

## 10. Backlog P3 (Post-production)

- [ ] Typage API Apogée (`src/apogee-connect/types/apogee-api.ts`)
- [ ] Typer `dataService.ts` avec interfaces
- [ ] Tests unitaires hooks critiques
- [ ] Lazy loading plus agressif
- [ ] JSDoc sur fonctions exportées
- [ ] Storybook composants UI

---

*Guide technique GLOBAL / HelpConfort Services — Version 3.0 — Décembre 2025*
