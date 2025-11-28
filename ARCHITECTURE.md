# Architecture du projet guide-apogee

## Vue d'ensemble

**Stack technique :**
- **Frontend** : React 18 + Vite + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Déploiement** : Lovable Cloud

**Rôle du projet :**  
Application web de gestion de guides métiers (Apogée, Apporteurs, HelpConfort) avec :
- Base de connaissance structurée en catégories et sections
- Chatbot IA (Mme MICHU) utilisant RAG (Retrieval-Augmented Generation)
- Système de support utilisateur avec tickets et chat en temps réel
- Back-office admin pour gestion des contenus, utilisateurs, permissions, documents et sauvegardes
- **Module "Mes indicateurs"** : Dashboard KPIs temps réel via API Apogée
- **Module "Tête de Réseau"** : Interface multi-agences pour franchiseurs (animateurs, directeurs, DG)
- **Mode Diffusion** : Dashboard TV plein écran pour affichage KPIs en agence

---

## Structure du code

### Dossiers principaux

```
src/
├── pages/                    # Pages principales de l'application (routes React Router)
│   ├── Landing.tsx           # Page d'accueil authentifiée avec widgets
│   ├── ApogeeGuide.tsx       # Guide Apogée
│   ├── ApporteurGuide.tsx    # Guide Apporteurs
│   ├── HelpConfort.tsx       # Guide HelpConfort
│   ├── Category.tsx          # Page catégorie générique
│   ├── CategoryHelpConfort.tsx
│   ├── ActionsAMener.tsx     # Suivi des actions à mener
│   ├── DiffusionDashboard.tsx # Mode TV plein écran
│   ├── Profile.tsx           # Profil utilisateur
│   ├── UserTickets.tsx       # Tickets support utilisateur
│   ├── Admin*.tsx            # Pages d'administration
│   └── ...
│
├── components/               # Composants UI réutilisables
│   ├── ui/                   # Composants shadcn/ui (Button, Dialog, Card, etc.)
│   ├── category/             # Composants pages Category (Accordion, Sortable, Tips)
│   ├── chatbot/              # Composants chatbot et support (ChatInput, ChatHistory)
│   ├── admin/                # Composants back-office admin
│   │   ├── backup/           # Gestion des sauvegardes
│   │   ├── support/          # Interface support (Kanban, TicketDetails)
│   │   └── franchiseur/      # Gestion rôles franchiseur
│   ├── landing/              # Composants page d'accueil (SortableCard, Grid)
│   ├── diffusion/            # Composants Mode TV (Slides, KpiTiles, Settings)
│   ├── dashboard/            # Widgets KPI génériques
│   ├── tickets/              # Badges et composants tickets
│   ├── Header.tsx            # En-tête avec navigation
│   ├── Layout.tsx            # Layout principal avec sidebar
│   ├── Chatbot.tsx           # Chatbot Mme MICHU
│   └── ...
│
├── apogee-connect/           # Module "Mes indicateurs" (API Apogée)
│   ├── components/           # Composants spécifiques indicateurs
│   │   ├── layout/           # AppLayout, IndicateursSidebar
│   │   ├── widgets/          # MetricCard, ChartCard, PipelineChart, etc.
│   │   └── filters/          # PeriodSelector, SecondaryPeriodSelector
│   ├── contexts/             # Contextes spécifiques (Filters, Agency, ApiToggle)
│   ├── hooks/                # Hooks métiers (useActionsConfig, useTechniciens)
│   ├── pages/                # Pages indicateurs (Dashboard, Univers, SAV, etc.)
│   ├── services/             # API et DataService avec cache TTL
│   ├── types/                # Types TypeScript spécifiques
│   └── utils/                # Fonctions de calcul (CA, SAV, transformations)
│
├── franchiseur/              # Module "Tête de Réseau" (multi-agences)
│   ├── components/           # Composants franchiseur
│   │   ├── layout/           # FranchiseurLayout, FranchiseurSidebar
│   │   ├── widgets/          # NetworkKpiTile, TopAgencies, Charts
│   │   └── filters/          # AgencySelector, NetworkPeriodSelector
│   ├── contexts/             # FranchiseurContext, NetworkFiltersContext
│   ├── hooks/                # useAgencies, useNetworkStats, useRoyaltyConfig
│   ├── pages/                # FranchiseurHome, Stats, Agencies, Royalties
│   ├── services/             # networkDataService, royaltyCalculationService
│   └── utils/                # networkCalculations (agrégation multi-agences)
│
├── contexts/                 # Contextes React globaux
│   ├── AuthContext.tsx       # Authentification, rôles, profil utilisateur
│   ├── EditorContext.tsx     # Gestion blocs/catégories guides
│   ├── ApporteurEditorContext.tsx
│   └── ImpersonationContext.tsx # Simulation de rôles (admin)
│
├── hooks/                    # Custom hooks métiers et techniques
│   ├── use-category.ts       # Logique pages catégories
│   ├── use-chatbot.ts        # Logique chatbot
│   ├── use-permissions.ts    # Vérification permissions
│   ├── use-admin-*.ts        # Hooks admin (backup, documents, stats)
│   ├── use-support-*.ts      # Hooks support (tickets, notifications)
│   ├── use-diffusion-settings.ts # Configuration Mode TV
│   └── ...
│
├── integrations/supabase/    # Client Supabase, types auto-générés
│   ├── client.ts             # Instance du client Supabase (NE PAS MODIFIER)
│   └── types.ts              # Types TypeScript générés (NE PAS MODIFIER)
│
├── lib/                      # Utilitaires et helpers
│   ├── db.ts                 # Fonctions BDD guides Apogée
│   ├── db-apporteurs.ts      # Fonctions BDD guides Apporteurs
│   ├── sanitize.ts           # DOMPurify pour sécurité XSS
│   ├── cache-manager.ts      # Gestionnaire cache local
│   ├── cache-backup.ts       # Sauvegarde cache
│   ├── mentions.ts           # Système mentions @
│   └── utils.ts              # Utilitaires généraux (cn, formatters)
│
├── extensions/               # Extensions TipTap pour éditeur rich-text
│   ├── Callout.tsx           # Blocs callout colorés
│   ├── ResizableImage.tsx    # Images redimensionnables
│   ├── Mention.tsx           # Mentions @utilisateur
│   ├── InlineFile.tsx        # Fichiers inline
│   └── ...
│
├── assets/                   # Images, logos, icônes
├── data/                     # Données statiques JSON
└── index.css                 # Styles globaux + design tokens Tailwind

supabase/
├── config.toml               # Configuration Supabase (NE PAS MODIFIER)
├── migrations/               # Migrations SQL versionnées
└── functions/                # Edge Functions Supabase (Deno)
    ├── chat-guide/           # Chatbot IA avec RAG
    ├── search-embeddings/    # Recherche vectorielle
    ├── generate-embeddings/  # Génération embeddings OpenAI
    ├── index-document/       # Indexation documents PDF
    ├── parse-document/       # Parsing documents
    ├── create-user/          # Création utilisateurs
    ├── delete-user/          # Suppression utilisateurs
    ├── update-user-email/    # Mise à jour email
    ├── reset-user-password/  # Reset mot de passe
    ├── notify-support-ticket/ # Notifications email/SMS tickets
    ├── notify-escalation/    # Notifications escalade
    ├── get-kpis/             # KPIs agence (OBSOLÈTE - frontend direct)
    └── network-kpis/         # KPIs réseau franchiseur

```

---

## Modèle de données

### Tables principales

#### `profiles`
Profils utilisateurs étendant `auth.users`.  
- `id`, `email`, `first_name`, `last_name`, `agence`, `role_agence` (poste occupé)
- `avatar_url`, `must_change_password`, `support_level` (niveau support N1/N2/N3)
- `service_competencies` (JSON compétences par service), `email_notifications_enabled`

#### `user_roles`
Rôles applicatifs des utilisateurs.  
Enum `app_role` : `admin`, `user`, `support`, `franchiseur`.  

#### `franchiseur_roles`
Rôles spécifiques franchiseur pour le module "Tête de Réseau".  
Enum `franchiseur_role` : `animateur`, `directeur`, `dg`.  
- `user_id`, `franchiseur_role`, `permissions` (JSON)

#### `franchiseur_agency_assignments`
Associations animateurs ↔ agences (restriction de visibilité optionnelle).  
- `user_id`, `agency_id`

#### `blocks`
Blocs de contenu pour le guide Apogée (catégories et sections).  
- `title`, `slug`, `content` (HTML), `type` (category/section), `parent_id`, `order`
- `icon`, `color_preset`, `content_type`, `tips_type`, `hide_title`, `show_summary`, `summary`, `attachments`

#### `apporteur_blocks`
Blocs de contenu pour le guide Apporteurs (même structure que `blocks`).

#### `categories` / `sections`
Tables legacy utilisées pour backup/export.

#### `guide_chunks`
Chunks de texte indexés pour le RAG (chatbot Mme MICHU).  
- `block_id`, `block_slug`, `block_title`, `block_type`, `chunk_index`, `chunk_text`
- `embedding` (vecteur JSON), `metadata`

#### `documents`
Documents uploadés par les admins (PDF, images).  
- `title`, `description`, `file_path`, `file_type`, `file_size`, `scope`
- `block_id`, `apporteur_block_id`

#### `support_tickets`
Tickets de support.  
- `user_id`, `status` (waiting/in_progress/resolved), `priority`, `assigned_to`
- `service` (apogee/helpconfort/apporteurs/conseil/autre), `category`
- `chatbot_conversation` (JSON), `escalation_history` (JSON)
- `rating`, `rating_comment`, `support_level`, `is_live_chat`

#### `support_messages`
Messages échangés dans les tickets.  
- `ticket_id`, `sender_id`, `message`, `is_from_support`, `read_at`

#### `support_presence`
Présence temps réel des agents support.  
- `user_id`, `status` (online/offline/typing), `last_seen`

#### `chatbot_queries`
Questions posées au chatbot pour tracking.  
- `question`, `answer`, `user_id`, `status`, `is_incomplete`
- `admin_notes`, `context_found`, `similarity_scores`

#### `favorites` / `user_history`
Favoris et historique de navigation utilisateurs.

#### `user_widget_preferences`
Préférences widgets dashboard.  
- `user_id`, `widget_key`, `is_enabled`, `size`, `display_order`

#### `home_cards`
Cartes personnalisables de la page d'accueil.  
- `title`, `description`, `link`, `icon`, `color_preset`, `size`, `display_order`, `is_logo`

#### `diffusion_settings`
Configuration Mode TV (diffusion).  
- `auto_rotation_enabled`, `rotation_speed_seconds`, `enabled_slides` (array)
- `objectif_title`, `objectif_amount`, `saviez_vous_templates` (array)

### Tables Agences & Redevances

#### `apogee_agencies`
Configuration des agences pour le module indicateurs.  
- `slug` (utilisé pour construire l'URL API), `label`, `is_active`
- `adresse`, `code_postal`, `ville`, `contact_email`, `contact_phone`
- `date_ouverture`, `animateur_id`

#### `agency_royalty_config`
Configuration des redevances par agence.  
- `agency_id`, `model_name`, `is_active`, `valid_from`, `valid_to`

#### `agency_royalty_tiers`
Paliers de redevances (système progressif).  
- `config_id`, `tier_order`, `from_amount`, `to_amount`, `percentage`

#### `agency_royalty_calculations`
Historique des calculs de redevances.  
- `agency_id`, `config_id`, `year`, `month`, `ca_cumul_annuel`
- `redevance_calculee`, `detail_tranches` (JSON), `calculated_by`

### Tables Permissions

#### `role_permissions`
Permissions par rôle_agence (poste) et bloc.  
- `role_agence`, `block_id`, `can_access`

#### `user_permissions`
Permissions individuelles par utilisateur.  
- `user_id`, `block_id`, `can_access`

---

## Rôles & Permissions

### Rôles applicatifs (`app_role`)

| Rôle | Description |
|------|-------------|
| `admin` | Accès total à l'application |
| `support` | Accès interface support pour gérer tickets |
| `franchiseur` | Accès interface Tête de Réseau |
| `user` | Utilisateur standard |

### Rôles franchiseur (`franchiseur_role`)

| Rôle | Accès |
|------|-------|
| `animateur` | Statistiques, navigation agences, données nationales agrégées. PAS accès redevances. |
| `directeur` | Tout animateur + gestion redevances + affectation animateurs |
| `dg` | Accès complet |

### Postes occupés (`role_agence`)

Indépendant des rôles applicatifs :
- `dirigeant`, `assistante`, `commercial`, `tete_de_reseau`, `externe`

**Note** : `tete_de_reseau` déclenche automatiquement l'assignation des rôles `franchiseur` + `support`.

### Mécanisme de permissions

- **Permissions par catégorie** : L'accès est géré au niveau des 3 principales catégories (Apogée, Apporteurs, HelpConfort).
- **Fonction SQL `has_role(_user_id, _role)`** : Vérifie les rôles sans déclencher de récursion RLS.
- **Fonction SQL `has_franchiseur_role(_user_id, _role)`** : Vérifie les rôles franchiseur.
- **Fonction SQL `get_user_agency(_user_id)`** : Récupère l'agence de l'utilisateur (SECURITY DEFINER).

### Row Level Security (RLS)

Toutes les tables sensibles ont des policies RLS :
- **`profiles`** : Users voient/modifient uniquement leur profil. Admins voient tout.
- **`apogee_agencies`** : Admin/franchiseur/support voient toutes les agences. Users voient uniquement leur agence.
- **`blocks`/`apporteur_blocks`** : Lecture authentifiés. Écriture admin uniquement.
- **`guide_chunks`** : Lecture authentifiés. CRUD admin uniquement.
- **`support_tickets`** : Users voient leurs tickets. Support/franchiseur/admin voient tout.
- **`favorites`/`user_history`** : Chaque user ne voit que ses données.

---

## Module "Mes indicateurs" (Apogee-Connect)

### Architecture

Le module utilise une architecture frontend-only avec appels directs à l'API Apogée (les edge functions ne peuvent pas appeler l'API Apogée due à des restrictions IP/CORS).

```
Frontend → API Apogée (https://{agence}.hc-apogee.fr/api/)
```

### Cache client avec TTL

Le `DataService` implémente un cache côté client avec TTL de 5 minutes :

```typescript
// src/apogee-connect/services/dataService.ts
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: { users, clients, projects, interventions, factures, devis, creneaux };
  timestamp: number;
  agencyUrl: string; // Invalidation si changement d'agence
}
```

### Flux de données

1. **Initialisation séquentielle** (critique pour éviter race conditions) :
   - AuthContext charge session/profil
   - AgencyContext attend `isAuthLoading=false` puis définit `BASE_URL`
   - Pages statistiques attendent `isAgencyReady=true`

2. **Appel API** :
   - Vérification cache TTL valide
   - Si expiré : appel API POST avec `API_KEY` dans body JSON
   - Stockage résultat en cache avec timestamp

3. **Calculs** :
   - Fonctions utilitaires dans `utils/` (dashboardCalculations, universCalculations, etc.)
   - Filtrage par période via `FiltersContext`

### Règles métier importantes

- **Avoirs** : Traités comme montants négatifs dans tous les calculs CA.
- **Multi-univers** : CA distribué proportionnellement entre univers d'un projet.
- **8 univers valides** : PMR, Volets roulants, Rénovation, Électricité, Plomberie, Serrurerie, Vitrerie, Menuiserie.
- **Types apporteurs** : agence_immo → "gestion locative", facility_services → "maintenanceur", gestion_syndic → "syndic".

---

## Module "Tête de Réseau" (Franchiseur)

### Architecture

Interface multi-agences pour les utilisateurs franchiseur (animateurs, directeurs, DG).

### Chargement des données

**CRITIQUE** : Chargement séquentiel obligatoire (pas de Promise.allSettled) pour éviter les race conditions sur BASE_URL.

```typescript
// Chargement une agence à la fois
for (const agency of agencies) {
  await setApiBaseUrl(agency.slug);
  const data = await DataService.loadAllData();
  cache[agency.slug] = data;
}
```

### KPIs agrégés

Les KPIs réseau sont des sommes arithmétiques simples des KPIs individuels déjà calculés :
- CA réseau = Σ CA agences
- SAV global = (Σ projets SAV) / (Σ projets totaux) × 100
- SAV moyen agences = (Σ taux SAV agences) / N

### Redevances

Système de calcul progressif par paliers basé sur le CA HT cumulé annuel :
- Modèle A (80% agences) : paliers standards
- Modèle B : paliers personnalisés
- Calcul mensuel avec historique permanent

---

## Mode Diffusion (TV)

### Description

Dashboard plein écran (1920×1080) pour affichage en agence sur écran TV.

### Composants

- **Bandeau animé** : Message motivationnel défilant
- **10 KPI tiles** : CA, Top apporteurs, Taux conversion, SAV, Objectif, etc.
- **"Le Saviez-tu?"** : Facts éducatifs avec tokens dynamiques
- **Carousel de slides** : 4 visualisations rotatives
  - Slide A : Distribution univers + types apporteurs
  - Slide B : CA par technicien (6 mois)
  - Slide C : Segmentation particuliers/apporteurs
  - Slide D : Top apporteurs + SAV

### Rotation automatique

- Configurable : ON/OFF, vitesse (5-60s)
- Cycle : slides → mois suivant → slides...
- Pause automatique si panneau settings ouvert

### Configuration

Persistée dans table `diffusion_settings` Supabase :
- `auto_rotation_enabled`, `rotation_speed_seconds`
- `enabled_slides` (array de slugs)
- `objectif_title`, `objectif_amount`
- `saviez_vous_templates` (array avec tokens)

---

## Edge Functions Supabase

### `create-user`
Création utilisateur avec profil et rôles. Création automatique agence si nécessaire.

### `delete-user`
Suppression utilisateur et données associées.

### `update-user-email`
Synchronisation email entre `profiles` et `auth.users`.

### `reset-user-password`
Génération mot de passe temporaire avec flag `must_change_password`.

### `generate-embeddings`
Génération embeddings OpenAI pour tous les blocs (chunking + vectorisation).

### `search-embeddings`
Recherche vectorielle pour RAG (similarité cosinus, topK résultats).

### `index-document` / `parse-document`
Parsing et indexation documents PDF pour RAG.

### `chat-guide`
Chatbot IA avec streaming GPT-4o et contexte RAG.

### `notify-support-ticket`
Notifications email (Resend) et SMS (AllMySMS) lors création ticket.
Routage par service :
- Apogée → support + admin
- HelpConfort/Apporteurs/Conseil → franchiseur + admin
- Autre → tous

### `notify-escalation`
Notifications lors d'escalade de tickets.

### `network-kpis`
KPIs agrégés pour franchiseur (expérimental, limitations API backend).

---

## Flux principaux

### 1. Authentification

1. Vérification session Supabase
2. Si non authentifié → `LoginDialog` (email + mot de passe)
3. Récupération profil (`profiles`) et rôles (`user_roles`, `franchiseur_roles`)
4. Redirection si `must_change_password`
5. `AuthContext` expose : `user`, `profile`, `isAdmin`, `isSupport`, `franchiseurRole`

### 2. Consultation guide + Chatbot

1. Navigation vers guide (Apogée/Apporteurs/HelpConfort)
2. `EditorContext` charge les blocs depuis Supabase
3. Filtrage par permissions catégorie
4. Mode IA chatbot : `search-embeddings` → `chat-guide` (streaming)
5. Tracking dans `chatbot_queries`

### 3. Support tickets

1. Création ticket (chatbot "Support" ou formulaire)
2. Notification agents (`notify-support-ticket`)
3. Prise en charge par agent (`assigned_to`)
4. Chat temps réel (Supabase Realtime)
5. Résolution + rating

### 4. Indicateurs (Mes indicateurs)

1. Vérification accès (dirigeant par défaut OU permission individuelle)
2. Initialisation AgencyContext avec `profile.agence`
3. Chargement données via `DataService` (cache TTL 5min)
4. Calculs et affichage KPIs

### 5. Franchiseur (Tête de Réseau)

1. Vérification rôle franchiseur
2. Chargement séquentiel données toutes agences
3. Agrégation KPIs réseau
4. Affichage dashboard multi-agences

---

## Sécurité

### Sanitization HTML

Tous les `dangerouslySetInnerHTML` utilisent DOMPurify :

```typescript
import { createSanitizedHtml } from '@/lib/sanitize';

<div dangerouslySetInnerHTML={createSanitizedHtml(content)} />
```

### Validation mot de passe

Minimum 8 caractères avec :
- Majuscules
- Minuscules
- Chiffres
- Symboles spéciaux

Appliqué uniformément : création ET modification.

### Protection API Apogée

- Clé API stockée dans secret Supabase `APOGEE_API_KEY`
- URL API construite dynamiquement depuis `profile.agence`
- Isolation données par agence (RLS sur `apogee_agencies`)

---

## Système de Permissions V2.0 (Phase 4 - Guards actifs)

### Vue d'ensemble

Le système V2.0 simplifie la gestion des accès avec :
- **Un rôle global unique** par utilisateur (hiérarchie N0-N6)
- **Des modules activables** indépendamment
- **Des sous-options** par module
- **Guards et protection des routes** via `RoleGuard` et `useHasGlobalRole`

### Rôles globaux (hiérarchie)

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Visiteur, accès minimal |
| N1 | `franchisee_user` | Utilisateur agence |
| N2 | `franchisee_admin` | Dirigeant agence |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur/DG réseau |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Super administrateur |

### Modules

| Module | Description | Rôle minimum |
|--------|-------------|--------------|
| `help_academy` | Guides Apogée, Apporteurs, HelpConfort | N0 |
| `pilotage_agence` | Stats, actions, diffusion | N1 |
| `reseau_franchiseur` | Multi-agences franchiseur | N3 |
| `support` | Tickets et assistance | N0 |
| `admin_plateforme` | Administration système | N5 |

### Fichiers TypeScript

```
src/types/
├── globalRoles.ts     # Définition des rôles (GLOBAL_ROLES, hasMinimumRole, canManageUsers)
├── modules.ts         # Définition des modules (MODULE_DEFINITIONS, isModuleEnabled)
└── accessControl.ts   # Guards unifiés (hasGlobalRole, hasModule, hasModuleOption)

src/hooks/
├── useHasGlobalRole.ts # Hook V2 pour vérification niveau (remplace isAdmin)

src/components/auth/
├── RoleGuard.tsx       # Composant protection routes (minRole, redirectTo, showError)

src/config/
├── modulesByRole.ts    # Modules par défaut selon le rôle (pour création/migration)

supabase/functions/
├── migrate-user-roles-v2/ # Edge function migration batch (N5+ requis)
```

### Pages Admin V2

| Route | Fichier | Description |
|-------|---------|-------------|
| `/admin/users-unified` | `AdminUsersUnified.tsx` | **Page principale** - Gestion centralisée utilisateurs & permissions V2 + Migration batch |
| `/admin/permissions-v2` | `AdminPermissionsV2.tsx` | Page avancée - Édition détaillée des modules/options |
| `/admin/roles-v2` | `AdminRolesV2.tsx` | Audit - Comparaison DB vs suggestions legacy |
| `/admin/users-list` | `AdminUsersList.tsx` | Legacy - Ancienne liste utilisateurs (conservée) |

### Protection des routes (RoleGuard)

```tsx
import { RoleGuard } from '@/components/auth/RoleGuard';

// Route admin (N5+)
<RoleGuard minRole="platform_admin">
  <AdminUsersUnified />
</RoleGuard>

// Route franchiseur (N3+)
<RoleGuard minRole="franchisor_user" redirectTo="/">
  <FranchiseurDashboard />
</RoleGuard>
```

### Colonnes DB (table `profiles`)

```sql
global_role     global_role  -- Enum nullable (N0-N6)
enabled_modules jsonb        -- Structure modules/options activés
```

### Cohabitation Legacy

Pendant la migration, les deux systèmes coexistent via `createAccessContext()` :
- Si `global_role` défini → utilise V2.0
- Sinon → calcule depuis legacy (user_roles, franchiseur_roles, etc.)

Voir `DOC_PERMISSIONS.md` et `DOC_MIGRATION.md` pour les détails.

---

## Points d'attention développeurs

### Fichiers NE PAS MODIFIER

- `src/integrations/supabase/client.ts` (auto-généré)
- `src/integrations/supabase/types.ts` (auto-généré)
- `supabase/config.toml` (géré par Lovable Cloud)
- `.env` (géré automatiquement)

### Design system

Utiliser les tokens Tailwind CSS définis dans `index.css` :
- `--primary`, `--secondary`, `--accent`, `--muted`
- `--background`, `--foreground`, `--border`
- **Éviter** : `text-white`, `bg-black`, couleurs directes

Toutes les couleurs en HSL.

### Refactoring

Fichiers ne doivent pas dépasser 300-400 lignes :
- Hooks métiers dans `src/hooks/`
- Composants UI dans `src/components/[feature]/`
- Utilitaires dans `src/lib/` ou `[module]/utils/`

### Real-time Supabase

```typescript
// Activer publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

// Souscrire
const channel = supabase
  .channel('messages')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, callback)
  .subscribe();
```

---

## Liens utiles

- **Documentation Supabase** : https://supabase.com/docs
- **Documentation shadcn/ui** : https://ui.shadcn.com/
- **Documentation Tailwind CSS** : https://tailwindcss.com/docs
- **Documentation React Router** : https://reactrouter.com/
- **Documentation TipTap** : https://tiptap.dev/
- **Documentation Recharts** : https://recharts.org/
- **Documentation DOMPurify** : https://github.com/cure53/DOMPurify

---

**Auteur** : Projet généré et maintenu via Lovable AI.  
**Dernière mise à jour** : 2025-11-28
