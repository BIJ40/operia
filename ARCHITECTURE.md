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

**Champs USER (compte métier)** - gérés par admins/managers :
- `id`, `email`, `first_name`, `last_name`
- `agence` (rattachement agence)
- `role_agence` (poste occupé : dirigeant, assistante, commercial, tete_de_reseau, externe)
- `global_role` (N0-N6 hiérarchie V2)
- `enabled_modules` (JSON modules activés)
- `is_active`, `deactivated_at`, `deactivated_by` (soft delete)

**Champs PROFIL (self-service)** - éditables par l'utilisateur :
- `avatar_url`
- (Futurs : phone_mobile, phone_fix, preferences_notifications...)

**Champs LEGACY (non utilisés en V2)** :
- `system_role` (remplacé par global_role)
- `support_level` (remplacé par enabled_modules.support)
- `service_competencies` (legacy)

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
- `date_ouverture`

Note : Les associations animateurs/directeurs ↔ agences utilisent la table `franchiseur_agency_assignments` (many-to-many).

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

#### `agency_collaborators`
Collaborateurs d'agence (inscrits ou non).
- `agency_id`, `first_name`, `last_name`, `email`, `phone`
- `role` (assistant, technicien, commercial, direction_agence, associe, autre)
- `is_registered_user`, `user_id` (lien vers profiles si inscrit)
- `created_by`, `notes`

### Tables et Fichiers Legacy (SUPPRIMÉS)

**Tables et fonctions DB supprimées (migration V2 complète) :**
- `user_roles` - Table des rôles applicatifs (admin, user, support, franchiseur) - **SUPPRIMÉE**
- `has_role()` - Fonction de vérification de rôle - **SUPPRIMÉE**
- `app_role` - Enum des rôles applicatifs - **SUPPRIMÉ**

**Tables DB conservées pour référence historique (non consultées par le code) :**
- `role_permissions` - Anciennes permissions par rôle_agence
- `user_permissions` - Anciennes permissions individuelles  
- `group_permissions` - Anciennes permissions par groupe
- `scopes` - Anciens scopes de permissions
- `user_capabilities` - Anciennes capabilities
- `groups` - Anciens groupes de permissions

**Fichiers supprimés lors du nettoyage legacy (2025-01-29) :**
- `src/types/permissions.ts` - Types V1 (SystemRole, AppRole, ScopeSlug, PERMISSION_LEVELS)
- `src/services/permissionsService.ts` - Service V1 complet (groups, scopes, user_permissions)
- `src/config/permissionsHelpTexts.ts` - Textes d'aide V1
- `src/hooks/use-permissions-admin.ts` - Hooks admin V1

**Fichiers nettoyés :**
- `src/types/accessControl.ts` - Suppression des fonctions legacy mapping (`getGlobalRoleFromLegacy`, `getEnabledModulesFromLegacy`, `createAccessContext`)
- `src/contexts/AuthContext.tsx` - Simplification pour V2 only (plus de fallback legacy)

> **Note :** Le système V2 est maintenant la seule source de vérité. Toutes les policies RLS utilisent `has_min_global_role()`, `has_support_access()`, `has_franchiseur_access()` au lieu de `has_role()`.


---

## Système de Permissions (ROLE_MATRIX)

> **Important :** La migration V2 est terminée. Le système de permissions actuel est le système **définitif**.
> Tous les outils et interfaces de migration ont été retirés (boutons "Appliquer V2", badges "Différent", edge function `migrate-user-roles-v2`, pages `/admin/roles-v2` et `/admin/permissions-v2`).

### Architecture

Le système V2 utilise une **source de vérité unique** : la **ROLE_MATRIX** définie dans `src/config/roleMatrix.ts`.

**Fichiers clés :**
- `src/config/roleMatrix.ts` - Matrice des capacités par rôle
- `src/types/globalRoles.ts` - Définition des 7 niveaux de rôles (N0-N6)
- `src/contexts/AuthContext.tsx` - Expose `globalRole` et helpers V2

### Rôles globaux (`global_role`)

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Visiteur de base (lecture guides) |
| N1 | `franchisee_user` | Technicien, assistant |
| N2 | `franchisee_admin` | Dirigeant agence |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur réseau, DG |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Super administrateur |

### Matrice des capacités

| Capacité | N0 | N1 | N2 | N3 | N4 | N5 | N6 |
|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Help Academy | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pilotage Agence* | - | - | ✓ | - | - | ✓ | ✓ |
| Support (tickets) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Console Support | - | - | - | ✓ | ✓ | ✓ | ✓ |
| Réseau Franchiseur | - | - | - | ✓ | ✓ | ✓ | ✓ |
| Administration | - | - | - | - | - | ✓ | ✓ |
| Gestion utilisateurs | - | - | ✓ | ✓ | ✓ | ✓ | ✓ |

*N2 nécessite une agence assignée pour Pilotage Agence.

### Matrice de gestion utilisateurs (UserManagementCapabilities)

Définie dans `src/config/roleMatrix.ts` via `getUserManagementCapabilities()` :

| Rôle | viewScope | manageScope | canCreateRoles | canDeleteUsers |
|------|-----------|-------------|----------------|----------------|
| N0 | self | none | - | ✗ |
| N1 | ownAgency | none | - | ✗ |
| N2 | ownAgency | ownAgency | N0, N1 | ✗ |
| N3 | allAgencies | assignedAgencies | N0-N2 | ✗ |
| N4 | allAgencies | allAgencies | N0-N3 | ✗ |
| N5 | allAgencies | allAgencies | N0-N5 | ✓ |
| N6 | allAgencies | allAgencies | N0-N6 | ✓ |

**Scopes de visibilité :**
- `none` : ne voit personne
- `self` : ne voit que soi-même
- `ownAgency` : utilisateurs de la même agence
- `assignedAgencies` : agences assignées (ou toutes si aucune)
- `allAgencies` : tous les utilisateurs

**Helpers disponibles :**
- `canViewUser(callerRole, callerAgency, targetAgency, assignedAgencies)`
- `canManageUser(callerRole, callerAgency, targetRole, targetAgency, assignedAgencies)`
- `canAssignRoleV2(callerRole, targetRole)`
- `canDeactivateUser(callerRole, targetRole)`

### Distinction USER vs PROFIL

**Page `/admin/users`** - Gestion des comptes métier (par admins/managers) :
- Champs éditables : email, nom, prénom, agence, global_role, enabled_modules, role_agence
- Activation/désactivation des comptes
- Création d'utilisateurs

**Page `/profile` (ou `/mon-compte`)** - Self-service utilisateur :
- Champs éditables : avatar uniquement
- Champs en lecture seule : email, nom, prénom, agence, rôle, modules
- Futurs : téléphone, préférences notifications

### Utilisation dans le code

```typescript
import { getRoleCapabilities, canAccessTileGroup } from '@/config/roleMatrix';

// Obtenir les capacités d'un utilisateur
const caps = getRoleCapabilities(globalRole);
if (caps.canAccessFranchiseur) { /* ... */ }

// Vérifier accès à un groupe de tuiles
if (canAccessTileGroup(globalRole, 'pilotage', { agence })) { /* ... */ }
```

### Rôles franchiseur (`franchiseur_role`)

Sous-rôles pour le module Tête de Réseau :

| Rôle | Accès |
|------|-------|
| `animateur` | Stats réseau, agences assignées, pas de redevances |
| `directeur` | Tout + redevances + affectation animateurs |
| `dg` | Accès complet |

### Postes occupés (`role_agence`)

Titre du poste (indépendant du niveau d'accès) :
- `dirigeant`, `assistante`, `commercial`, `tete_de_reseau`, `externe`

**Note** : `tete_de_reseau` déclenche auto-assignation `franchiseur` + `support`.

### Row Level Security (RLS)

**Fonctions SECURITY DEFINER V2 (utilisées par toutes les policies RLS) :**
- `has_min_global_role(_user_id, _min_level)` : Vérifie si l'utilisateur a le niveau global_role minimum (0-6)
- `has_support_access(_user_id)` : Vérifie `enabled_modules.support.enabled = true` OU `global_role IN (platform_admin, superadmin)`
- `has_franchiseur_access(_user_id)` : Vérifie `enabled_modules.reseau_franchiseur.enabled = true` OU `global_role IN (franchisor_user+)`
- `is_admin(_user_id)` : Wrapper pour `has_min_global_role(_, 5)`
- `get_user_global_role_level(_user_id)` : Retourne le niveau numérique du global_role
- `get_user_agency(_user_id)` : Retourne l'agence de l'utilisateur

**Policies RLS actives sur les tables sensibles :**
- **`profiles`** : Users voient/modifient leur profil. `has_min_global_role(5)` voient tout.
- **`apogee_agencies`** : `has_franchiseur_access` ou admin voient tout. Users voient leur agence via `get_user_agency`.
- **`blocks`/`apporteur_blocks`** : Lecture authentifiés. Écriture `has_min_global_role(5)`.
- **`support_tickets`** : Users voient leurs tickets. `has_support_access` ou `has_min_global_role(5)` voient tout.
- **`favorites`/`user_history`** : Accès utilisateur uniquement.

> **Note :** Toutes les policies RLS ont été migrées de `has_role()` (qui consultait la table `user_roles` legacy) vers les fonctions V2 ci-dessus qui consultent uniquement `profiles.global_role` et `profiles.enabled_modules`.

---

## Module Support (Tickets) - V2

### Architecture

Le module Support sépare clairement deux fonctionnalités :

1. **Création de demandes** (tous utilisateurs connectés) :
   - Route : `/mes-demandes`
   - Accès : **NATIF** pour tout utilisateur authentifié (N0-N6)
   - Aucune condition sur `enabled_modules.support` pour cette fonctionnalité

2. **Console Support** (agents qui traitent les tickets) :
   - Route : `/admin/support`
   - Accès : contrôlé par `enabled_modules.support.options`

### Structure `enabled_modules.support`

```json
{
  "support": {
    "enabled": true,
    "options": {
      "agent_support": true,    // Peut traiter les tickets
      "admin_support": false,   // Droits admin support (vision globale)
      "level": 1,               // Niveau escalade (L1/L2/L3)
      "skills": ["apogee", "apporteurs"]  // Compétences pour routage
    }
  }
}
```

### Règles d'accès

| Fonctionnalité | Condition |
|----------------|-----------|
| Créer un ticket | Authentifié (N0-N6) |
| Voir "Mes Demandes" | Authentifié (N0-N6) |
| Accès console support | `support.enabled` ET (`agent_support` OU `admin_support`) |
| Être assignable | `support.enabled` ET (`agent_support` OU `admin_support`) |
| Superadmin fallback | N6 a toujours accès à la console |

### Helpers AuthContext V2

```typescript
// Exposés par AuthContext
const {
  canAccessSupportUser,     // Toujours true pour authentifiés
  isSupportAgent,           // support.enabled && options.agent_support
  isSupportAdmin,           // support.enabled && options.admin_support
  canAccessSupportConsole,  // isSupportAgent || isSupportAdmin || superadmin
} = useAuth();
```

### Hook `useSupportAgents`

Liste les agents support assignables basée sur V2 :

```typescript
import { useSupportAgents, getAgentDisplayName } from '@/hooks/use-support-agents';

const { agents, isLoading } = useSupportAgents();
// Filtre automatiquement : is_active=true + support.enabled + (agent_support || admin_support)
```

### Éléments LEGACY (ne plus utiliser)

| Élément | Status |
|---------|--------|
| `profiles.support_level` | DEPRECATED - utiliser `enabled_modules.support.options.level` |
| `/admin/support-levels` | SUPPRIMÉ - configuration via `/admin/users` |
| `profiles.service_competencies` | DEPRECATED - utiliser `enabled_modules.support.options.skills` |

### Configuration agents support

La configuration des agents s'effectue dans `/admin/users` > fiche utilisateur :
- Section "Modules activés" > bloc "Support"
- Toggle Agent / Admin support
- Niveau escalade (optionnel)
- Compétences (tags)

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
3. Récupération profil (`profiles`) avec `global_role` et `enabled_modules`
4. Récupération rôle franchiseur (`franchiseur_roles`) si applicable
5. Redirection si `must_change_password`
6. `AuthContext` expose : `user`, `globalRole`, `hasGlobalRole()`, `isFranchiseur`, etc.

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

## Système de Permissions V2.0 (Phase 4 - Guards ACTIFS)

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
| `pilotage_agence` | Stats, actions, diffusion | N2 |
| `reseau_franchiseur` | Multi-agences franchiseur | N3 |
| `support` | Tickets et assistance | N0 |
| `admin_plateforme` | Administration système | N5 |

### Mapping des Routes (App.tsx)

**Toutes les routes sont désormais protégées par `RoleGuard` :**

| Route | minRole | Niveau | Description |
|-------|---------|--------|-------------|
| `/`, `/profile`, `/favorites` | - | N0+ | Tous utilisateurs connectés |
| `/academy/*` | - | N0+ | Help Academy (Apogée, Apporteurs, Documents) |
| `/support/mes-demandes` | - | N0+ | Mes demandes support |
| `/pilotage/indicateurs/*` | `franchisee_admin` | N2+ | Indicateurs agence |
| `/pilotage/actions/*` | `franchisee_admin` | N2+ | Actions à mener |
| `/pilotage/diffusion` | `franchisee_admin` | N2+ | Écran diffusion TV |
| `/pilotage/rh-tech` | `franchisee_admin` | N2+ | Planning hebdo techniciens |
| `/pilotage/equipe` | `franchisee_admin` | N2+ | Gestion équipe agence |
| `/reseau/*` | `franchisor_user` | N3+ | Réseau franchiseur |
| `/reseau/agences/:id` | `franchisor_user` | N3+ | Profil agence (franchiseur) |
| `/support/console` | `franchisor_user` | N3+ | Console support |
| `/admin/users` | `franchisor_user` | N3+ | Gestion utilisateurs |
| `/admin/agencies` | `platform_admin` | N5+ | Gestion agences |
| `/admin/agencies/:id` | `platform_admin` | N5+ | Profil agence (admin) |
| `/admin/*` (autres) | `platform_admin` | N5+ | Administration plateforme |

### Fichiers TypeScript

```
src/types/
├── globalRoles.ts     # Définition des rôles (GLOBAL_ROLES, hasMinimumRole, canManageUsers)
├── modules.ts         # Définition des modules (MODULE_DEFINITIONS, isModuleEnabled)
└── accessControl.ts   # Guards unifiés (hasGlobalRole, hasModule, hasModuleOption)

src/hooks/
├── useHasGlobalRole.ts # Hook V2 pour vérification niveau (remplace isAdmin)
│   ├── useHasGlobalRole(minRole)  # Vérifie niveau minimum
│   ├── useHasMinLevel(level)      # Vérifie niveau numérique
│   └── useGlobalRoleLevel()       # Retourne niveau actuel

src/components/auth/
├── RoleGuard.tsx       # Composant protection routes (minRole, redirectTo, showError)

src/config/
├── modulesByRole.ts    # Modules par défaut selon le rôle (pour création)
├── routes.ts           # Registre centralisé de toutes les routes
```

### Pages Admin

| Route | Fichier | Description |
|-------|---------|-------------|
| `/admin` | `AdminIndex.tsx` | Hub administration |
| `/admin/users` | `AdminUsersUnified.tsx` | Gestion utilisateurs & permissions |
| `/admin/agencies` | `AdminAgencies.tsx` | Liste et gestion des agences |
| `/admin/agencies/:id` | `FranchiseurAgencyProfile.tsx` | Profil détaillé agence (partagé avec franchiseur) |
| `/admin/collaborateurs` | `AdminCollaborators.tsx` | Collaborateurs non inscrits |
| `/admin/backup` | `AdminBackup.tsx` | Sauvegardes guides |

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

// Vérification dans un composant
const canManage = useHasGlobalRole('franchisor_user');
if (!canManage) return null;
```

### Helpers de commodité (V2)

Les helpers suivants sont exposés par `AuthContext` et utilisent le système V2 en interne :

| Helper | Implémentation V2 | Usage recommandé |
|--------|-------------------|------------------|
| `isAdmin` | `globalRoleLevel >= GLOBAL_ROLES.platform_admin` (N5+) | Vérification rapide admin |
| `isFranchiseur` | `globalRoleLevel >= GLOBAL_ROLES.franchisor_user` (N3+) | Vérification rapide franchiseur |
| `isSupport` | `isModuleEnabled(enabledModules, 'support')` | Vérification module support |

Ces helpers sont des **wrappers V2 valides**, pas du code legacy. Pour des vérifications plus précises, utiliser directement `hasGlobalRole()` ou `useHasGlobalRole()`.

### Colonnes DB (table `profiles`)

```sql
global_role     global_role  -- Enum nullable (N0-N6)
enabled_modules jsonb        -- Structure modules/options activés
```

> **Note :** Le système V2 est la seule source de vérité. Plus de fallback legacy.

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

## Gestion des Routes

### Architecture centralisée

Toutes les routes applicatives V2 sont centralisées dans un fichier unique :

```
src/config/routes.ts
```

**Règle absolue** : Aucune route ne doit être hardcodée (string literal comme `'/admin/users'`) dans le code. Toute navigation doit utiliser les constantes de `ROUTES`.

### Structure des routes

```typescript
import { ROUTES } from '@/config/routes';

// Exemples d'utilisation
<Link to={ROUTES.academy.apogee}>Guide Apogée</Link>
navigate(ROUTES.support.userTickets);

// Routes dynamiques avec paramètres
<Link to={ROUTES.academy.apogeeCategory('ma-categorie')}>...</Link>
<Link to={ROUTES.reseau.agenceProfile('agency-uuid')}>...</Link>
```

### Sections de routes

| Section | Préfixe | Exemples |
|---------|---------|----------|
| Help Academy | `/academy` | `/academy/apogee`, `/academy/apporteurs` |
| Pilotage | `/pilotage` | `/pilotage/indicateurs`, `/pilotage/actions` |
| Support | `/support` | `/support/mes-demandes`, `/support/console` |
| Réseau | `/reseau` | `/reseau/dashboard`, `/reseau/agences` |
| Admin | `/admin` | `/admin/users`, `/admin/backup` |
| User | `/profile`, `/favorites` | Pages utilisateur |

### Routes legacy (backward compatibility)

Les anciennes routes sont maintenues pour rétrocompatibilité mais NE DOIVENT PAS être utilisées dans le nouveau code :

- `/apogee` → `/academy/apogee`
- `/mes-indicateurs` → `/pilotage/indicateurs`
- `/mes-demandes` → `/support/mes-demandes`
- `/tete-de-reseau` → `/reseau/dashboard`

### Ajouter une nouvelle route

1. Définir la route dans `src/config/routes.ts`
2. Ajouter la route dans `App.tsx` avec `<Route path={ROUTES.xxx.yyy} ... />`
3. Ajouter l'entrée de navigation dans `UnifiedSidebar.tsx` si nécessaire
4. Ajouter le titre de page dans `navigation.ts` `PAGE_TITLES`

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
**Dernière mise à jour** : 2025-11-29
