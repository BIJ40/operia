# Guide Technique — GLOBAL / Apogée

> **Version** : 2.0  
> **Mise à jour** : Décembre 2025  
> **Audience** : Développeurs, architectes, DevOps

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

### 1.2 Backend (Supabase)

| Service | Usage |
|---------|-------|
| PostgreSQL | Base de données relationnelle |
| Auth | Authentification (email/password) |
| Storage | Stockage fichiers (documents, avatars) |
| Edge Functions | Logique serveur (Deno) |
| Realtime | Subscriptions temps réel |

### 1.3 Services externes

| Service | Usage |
|---------|-------|
| Lovable AI Gateway | Chat IA (Gemini 2.5 Flash) |
| OpenAI | Génération embeddings |
| Sentry | Monitoring erreurs |
| API Apogée | Données CRM (CORS frontend only) |

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
│   ├── landing/              # Composants dashboard
│   └── diffusion/            # Composants mode TV
├── apogee-connect/           # Module indicateurs
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   └── utils/
├── franchiseur/              # Module réseau
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── services/
├── apogee-tickets/           # Module gestion projet
│   ├── components/
│   ├── hooks/
│   └── pages/
├── contexts/                 # Contextes React globaux
├── hooks/                    # Custom hooks
├── lib/                      # Utilitaires
├── config/                   # Configuration centralisée
├── types/                    # Types TypeScript
└── integrations/supabase/    # Client Supabase (auto-généré)

supabase/
├── functions/                # Edge Functions
│   ├── _shared/              # Helpers partagés
│   ├── chat-guide/
│   ├── search-embeddings/
│   ├── create-user/
│   └── ...
└── migrations/               # Migrations SQL
```

### 2.2 Patterns architecturaux

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
```

#### Safe Helpers

```typescript
// Wrappers Supabase robustes
safeQuery()         // SELECT avec fallback
safeMutation()      // INSERT/UPDATE/DELETE
safeInvoke()        // Edge Functions
errorToast()        // Toast d'erreur unifié
successToast()      // Toast de succès
```

---

## 3. Système de Permissions V2

### 3.1 Architecture

```
profiles.global_role (N0-N6)
        ↓
    ROLE_MATRIX
        ↓
    RoleGuard / ModuleGuard
        ↓
    Accès page/feature
```

### 3.2 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/types/globalRoles.ts` | Définition des 7 rôles |
| `src/config/roleMatrix.ts` | Matrice des capacités |
| `src/components/auth/RoleGuard.tsx` | Guard par rôle |
| `src/components/auth/ModuleGuard.tsx` | Guard par module |

### 3.3 Fonctions SQL (SECURITY DEFINER)

```sql
-- Vérifie si l'utilisateur a le rôle minimum
has_min_global_role(user_id uuid, min_level int) → boolean

-- Vérifie accès support
has_support_access(user_id uuid) → boolean

-- Vérifie accès franchiseur
has_franchiseur_access(user_id uuid) → boolean

-- Récupère l'agence de l'utilisateur
get_user_agency(user_id uuid) → text
```

### 3.4 Usage dans les composants

```tsx
// Protection par rôle minimum
<RoleGuard minRole="franchisee_admin">
  <ProtectedPage />
</RoleGuard>

// Protection par module activé
<ModuleGuard module="apogee_tickets" option="kanban">
  <KanbanBoard />
</ModuleGuard>

// Vérification programmatique
const hasAccess = useHasGlobalRole('franchisor_user');
```

---

## 4. Edge Functions

### 4.1 Configuration

```toml
# supabase/config.toml
[functions.chat-guide]
verify_jwt = true

[functions.create-user]
verify_jwt = true
```

### 4.2 Helpers partagés

```typescript
// _shared/cors.ts
export function withCors(response: Response): Response
export function isOriginAllowed(origin: string): boolean

// _shared/rateLimit.ts
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean

// _shared/error.ts
export function handleError(error: unknown, corsHeaders: Headers): Response

// _shared/sentry.ts
export function initSentry()
export function captureException(error: Error, context?: object)
```

### 4.3 Fonctions principales

| Fonction | Endpoint | Rôle |
|----------|----------|------|
| `chat-guide` | POST | Chat IA avec RAG (streaming) |
| `search-embeddings` | POST | Recherche vectorielle |
| `generate-embeddings` | POST | Génération embeddings |
| `create-user` | POST | Création utilisateur |
| `delete-user` | POST | Suppression utilisateur |
| `reset-user-password` | POST | Reset mot de passe |
| `update-user-email` | POST | Mise à jour email |
| `notify-support-ticket` | POST | Notification ticket |
| `support-auto-classify` | POST | Classification IA |
| `network-kpis` | POST | KPIs réseau |

### 4.4 Appel depuis le frontend

```typescript
// Avec JWT automatique
const { data, error } = await supabase.functions.invoke('chat-guide', {
  body: { messages, context: 'apogee' }
});

// Pour streaming (SSE)
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

### 5.1 Tables principales

```sql
-- Utilisateurs
profiles (id, email, first_name, last_name, global_role, enabled_modules, agence, role_agence, is_active)

-- Guides
blocks (id, slug, title, content, type, parent_id, order, ...)
apporteur_blocks (id, slug, title, content, type, parent_id, order, ...)

-- RAG
guide_chunks (id, block_id, chunk_text, embedding, metadata)

-- Support
support_tickets (id, user_id, type, status, priority, due_at, sla_status, ai_*)
support_messages (id, ticket_id, sender_id, message, is_system_message)

-- Agences
apogee_agencies (id, slug, label, is_active, ...)
franchiseur_agency_assignments (id, user_id, agency_id)
franchiseur_roles (id, user_id, franchiseur_role)

-- Tickets projet
apogee_tickets (id, element_concerne, kanban_status, priority, heat_priority, ...)
apogee_ticket_transitions (id, from_status, to_status, allowed_role)
```

### 5.2 Policies RLS critiques

```sql
-- Accès par rôle minimum
CREATE POLICY "N5+ can manage" ON table
USING (has_min_global_role(auth.uid(), 5));

-- Accès support
CREATE POLICY "Support access" ON support_tickets
USING (user_id = auth.uid() OR has_support_access(auth.uid()));

-- Isolation agence
CREATE POLICY "Agency isolation" ON table
USING (agency_id = get_user_agency(auth.uid()));
```

---

## 6. Flux de Données

### 6.1 RAG Pipeline

```
1. Contenu guide (blocks)
        ↓
2. Chunking (chunkText)
        ↓
3. Embeddings (generate-embeddings → OpenAI)
        ↓
4. Stockage (guide_chunks)
        ↓
5. Recherche (search-embeddings → cosine similarity)
        ↓
6. Prompt + Context (chat-guide)
        ↓
7. Réponse IA (Lovable AI Gateway)
```

### 6.2 Support V2 Flow

```
Utilisateur → Chat IA (chat_ai)
                ↓
        Escalade humain
                ↓
        Chat Support (chat_human)
                ↓
        [Timeout 60s ou résolution]
                ↓
        Ticket formel (ticket) ou Resolved
```

### 6.3 API Apogée Flow

```
Frontend (AgencyContext)
        ↓
    setApiBaseUrl(agence)
        ↓
    API: https://{agence}.hc-apogee.fr/api/
        ↓
    POST avec API_KEY partagée
        ↓
    Calculs locaux (utils/*.ts)
        ↓
    Affichage indicateurs
```

---

## 7. Conventions & Best Practices

### 7.1 Nommage fichiers

```
Pages:              PascalCase.tsx (AdminUsers.tsx)
Components:         PascalCase.tsx (UserCard.tsx)
Hooks:              use-kebab-case.ts (use-admin-tickets.ts)
Utils:              camelCase.ts (actionsCalculations.ts)
Types:              camelCase.ts (globalRoles.ts)
Config:             camelCase.ts (roleMatrix.ts)
```

### 7.2 Structure composant

```tsx
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types
interface Props {
  title: string;
  onAction: () => void;
}

// 3. Composant
export function MyComponent({ title, onAction }: Props) {
  // 3a. Hooks
  const [state, setState] = useState(false);
  
  // 3b. Handlers
  const handleClick = () => {
    onAction();
  };
  
  // 3c. Render
  return (
    <div className="...">
      <h1>{title}</h1>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

### 7.3 Gestion erreurs

```typescript
// Utiliser les safe helpers
const { data, error } = await safeQuery(
  supabase.from('table').select('*'),
  [],  // fallback
  'Description opération'
);

if (error) {
  errorToast('Erreur', error.message);
  return;
}

// Ne jamais utiliser console.error, utiliser logError
import { logError } from '@/lib/logger';
logError('Module', 'Description', error);
```

### 7.4 Ajout nouveau module

1. Créer dossier `src/module-name/`
2. Structurer : `components/`, `hooks/`, `pages/`, `types/`
3. Ajouter routes dans `src/config/routes.ts`
4. Ajouter navigation dans `src/config/navigation.ts`
5. Ajouter routes dans `src/App.tsx` avec `RoleGuard`
6. Créer tables/policies si nécessaire (migration)
7. Documenter dans `ARCHITECTURE.md`

---

## 8. Sécurité

### 8.1 Checklist

- [ ] JWT vérifié sur toutes les Edge Functions
- [ ] CORS configuré (origines whitelist)
- [ ] Rate limiting actif
- [ ] RLS policies sur toutes les tables sensibles
- [ ] Pas de secrets côté client
- [ ] Validation input côté serveur
- [ ] Sanitization HTML (DOMPurify)

### 8.2 Variables d'environnement

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=xxx
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Edge Functions (Supabase Secrets)
LOVABLE_API_KEY=xxx
OPENAI_API_KEY=xxx
APOGEE_API_KEY=xxx
```

---

## 9. Monitoring & Debug

### 9.1 Sentry

```typescript
// Frontend automatique via GlobalErrorBoundary
// Edge Functions via _shared/sentry.ts

// Contexte utilisateur
Sentry.setUser({
  id: user.id,
  email: user.email,
  global_role: user.global_role,
  agency: user.agence
});
```

### 9.2 Logs

```typescript
import { logApogee, logError, logSupport } from '@/lib/logger';

// Log métier
logApogee.debug('Message', { data });
logSupport.info('Ticket créé', { ticketId });

// Log erreur (→ Sentry)
logError('Module', 'Description', error);
```

### 9.3 Debug RAG

- Admin > Chatbot & RAG > Onglet Debug
- Affiche chunks récupérés et scores

---

## 10. Pistes d'Amélioration

### 10.1 Refactors souhaitables

- [ ] Extraire composants > 300 lignes
- [ ] Centraliser les types Supabase custom
- [ ] Compléter P1#7 (Lots 3+)
- [ ] Tests unitaires hooks critiques

### 10.2 Optimisations

- [ ] Lazy loading plus agressif
- [ ] Memoization composants lourds
- [ ] Cache invalidation granulaire
- [ ] Compression embeddings

### 10.3 Documentation

- [ ] JSDoc sur fonctions exportées
- [ ] Storybook composants UI
- [ ] Schéma DB interactif

---

*Guide technique GLOBAL / Apogée — Version 2.0*
