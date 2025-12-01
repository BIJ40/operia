# Historique des Développements — Projet GLOBAL / Apogée

> **Document généré le** : 2025-12-01  
> **Branche de référence** : `dev` (V2)  
> **Statut** : Documentation complète basée sur l'analyse du code source

---

## Vue d'ensemble

Ce document retrace l'ensemble des développements réalisés sur le projet GLOBAL / Apogée depuis sa création. Les évolutions sont regroupées par modules fonctionnels pour une meilleure lisibilité.

---

## 1. Module Authentification & Permissions

### 1.1 Système de permissions V1 (Legacy - Supprimé)

- **Période** : Phase initiale → Novembre 2025
- **Problème initial** : Gestion des accès utilisateurs basée sur des rôles applicatifs multiples
- **Architecture supprimée** :
  - Tables : `user_roles`, `user_permissions`, `group_permissions`, `role_permissions`, `user_capabilities`, `scopes`, `groups`, `roles`
  - Fonctions SQL : `has_role()`, `get_effective_permission_level()`
  - Fichiers : `src/types/permissions.ts`, `src/services/permissionsService.ts`
- **Impact** : Système complexe avec multiples sources de vérité, difficile à maintenir

### 1.2 Système de permissions V2 (Actuel)

- **Période** : Novembre 2025
- **Objectif** : Simplification radicale avec source de vérité unique
- **Changements réalisés** :
  - 7 niveaux hiérarchiques (`global_role` N0-N6)
  - `enabled_modules` JSONB pour activation granulaire
  - ROLE_MATRIX centralisée (`src/config/roleMatrix.ts`)
  - Guards : `RoleGuard`, `ModuleGuard`
- **Impact fonctionnel** : Gestion simplifiée, hiérarchie claire
- **Impact technique** : Code réduit de ~70%, RLS policies unifiées

### 1.3 Authentification par email

- **Changement** : Login par email (au lieu de pseudo)
- **Synchronisation** : Edge function `update-user-email` pour sync profiles ↔ auth.users
- **Validation mot de passe** : 8+ caractères, majuscules, minuscules, chiffres, symboles

---

## 2. Module Help Academy (Guides)

### 2.1 Guide Apogée

- **Objectif** : Documentation complète du logiciel CRM Apogée
- **Structure** : Catégories → Sections avec contenu riche (TipTap)
- **Tables** : `blocks` (type: category/section)
- **Fonctionnalités** :
  - Éditeur rich-text avec images redimensionnables
  - Système de favoris
  - Callouts colorés, mentions @
  - Pièces jointes
- **Routes** : `/academy/apogee`, `/academy/apogee/category/:slug`

### 2.2 Guide Apporteurs

- **Objectif** : Ressources pour apporteurs d'affaires
- **Tables** : `apporteur_blocks`
- **Structure** : Catégories → Sous-catégories → Sections
- **Routes** : `/academy/apporteurs`, `/academy/apporteurs/category/:slug/sub/:subslug`

### 2.3 Base Documentaire HelpConfort

- **Objectif** : Documents internes et procédures
- **Tables** : `blocks` avec scope "helpconfort"
- **Routes** : `/academy/hc-base`, `/academy/hc-base/category/:slug`

---

## 3. Module Chatbot IA (Mme MICHU)

### 3.1 Architecture RAG

- **Objectif** : Assistant IA contextuel basé sur la documentation
- **Pipeline** :
  1. Chunking des contenus (`guide_chunks`)
  2. Génération embeddings (OpenAI via `generate-embeddings`)
  3. Recherche vectorielle (`search-embeddings`)
  4. Génération réponse (Lovable AI Gateway)
- **Contextes RAG** : `apogee`, `apporteurs`, `helpconfort`, `metier`, `franchise`, `documents`, `auto`

### 3.2 Prompt SCALAR

- **Méthodologie** : Scope, Context, Action, Layout, Adapt, Refinement
- **Règles strictes** :
  - Réponses basées uniquement sur documents RAG
  - Pas de confabulation
  - Message explicite si info absente

### 3.3 Interface Admin RAG

- **Route** : `/admin/chatbot-rag`
- **Onglets** : Sources, Documents, Index, Questions, Debug
- **Fonctionnalités** : Indexation, rebuild, monitoring

---

## 4. Module Support V2

### 4.1 Architecture Support V2

- **Types de canaux** (`type`) :
  - `chat_ai` : Conversation avec IA
  - `chat_human` : Chat avec conseiller humain
  - `ticket` : Ticket formel
- **Transitions** : Règles strictes via `support-transitions.ts`
- **Messages système** : `is_system_message = true`

### 4.2 SLA Automatique (P3#1)

- **Calcul** : Trigger `calculate_ticket_due_at()`
- **Règles** :
  - Bloquant/Blocage : 4h
  - Bug + Urgent : 8h
  - Amélioration : 72h
  - Défaut : 24h
- **Statut SLA** : ok / warning (< 1h) / late

### 4.3 Auto-classification IA (P3#2)

- **Edge function** : `support-auto-classify`
- **Champs générés** : `ai_category`, `ai_priority`, `ai_confidence`, `ai_suggested_answer`, `ai_is_incomplete`
- **Interface** : AIClassificationBadge, AISuggestionPanel

### 4.4 Escalade et notifications

- **Edge functions** : `notify-support-ticket`, `notify-escalation`
- **Canaux** : Email, SMS (configurable)

---

## 5. Module Pilotage Agence

### 5.1 Indicateurs KPI

- **Source** : API Apogée temps réel
- **Architecture** :
  - Context : `AgencyContext`, `FiltersContext`
  - Services : `dataService.ts`, `api.ts`
  - Calculs : `dashboardCalculations.ts`, `universCalculations.ts`, etc.
- **Routes** : `/hc-agency/indicateurs/*`
- **Filtres temporels** : Jour, 7 jours, Mois, Année, 12 mois glissants

### 5.2 Actions à Mener

- **Objectif** : Suivi des dossiers nécessitant action
- **Calculs** : `actionsAMenerCalculations.ts`
- **Routes** : `/hc-agency/actions`

### 5.3 Mode Diffusion TV

- **Objectif** : Dashboard plein écran pour affichage agence
- **Configuration** : `diffusion_settings` (rotation, slides, objectifs)
- **Slides** : Univers, CA, Techniciens, Segmentation
- **Routes** : `/hc-agency/diffusion`

### 5.4 Planning RH Tech

- **Objectif** : Planning hebdomadaire techniciens
- **Routes** : `/hc-agency/rh-tech`

### 5.5 Gestion d'équipe

- **Tables** : `agency_collaborators`
- **Routes** : `/hc-agency/equipe`

---

## 6. Module Réseau Franchiseur

### 6.1 Dashboard Multi-agences

- **Objectif** : Vue consolidée pour tête de réseau
- **Rôles** : Animateur (N3), Directeur (N4), DG (N4)
- **Agrégation** : Somme simple des KPIs agences
- **Routes** : `/hc-reseau/dashboard`

### 6.2 Gestion des agences

- **Tables** : `apogee_agencies`, `franchiseur_agency_assignments`
- **Fonctionnalités** : Profils, contacts, dates d'ouverture
- **Routes** : `/hc-reseau/agences`, `/hc-reseau/agences/:agencyId`

### 6.3 Gestion des animateurs

- **Association** : Many-to-many agences ↔ animateurs
- **Visibilité** : Par défaut toutes agences, restriction optionnelle
- **Routes** : `/hc-reseau/animateurs`

### 6.4 Redevances

- **Tables** : `agency_royalty_config`, `agency_royalty_tiers`, `agency_royalty_calculations`
- **Calcul** : Progressif par tranches
- **Accès** : Directeur/DG uniquement
- **Routes** : `/hc-reseau/redevances`

### 6.5 Comparatifs

- **Objectif** : Benchmark inter-agences
- **Routes** : `/hc-reseau/comparatifs`

---

## 7. Module Gestion de Projet (ex-Apogée Tickets)

### 7.1 Kanban

- **Statuts** : BACKLOG, TODO, IN_PROGRESS, TESTING, DONE, etc.
- **Tables** : `apogee_tickets`, `apogee_ticket_statuses`
- **Routes** : `/projects/kanban`

### 7.2 Système de transitions

- **Tables** : `apogee_ticket_transitions`, `apogee_ticket_user_roles`
- **Rôles** : developer, tester, franchiseur
- **Règles** : Transitions par rôle avec historique

### 7.3 Heat Priority

- **Calcul** : Score automatique basé sur impact, urgence, ancienneté
- **Hook** : `useRecalculateHeatPriority`

### 7.4 Import Excel

- **Formats** : Standard, Priorités, Évalué, Bugs, V1
- **Routes** : `/projects/import*`

### 7.5 Permissions granulaires

- **Options modules** :
  - `kanban` : Vue + création
  - `manage` : Modification champs
  - `import` : Import Excel
- **Exception** : Developer peut modifier h_min/h_max et PEC sans `manage`

---

## 8. Module Administration

### 8.1 Gestion utilisateurs

- **Interface** : AdminUsersUnified
- **Capacités** : Création, édition, désactivation, suppression
- **Edge functions** : `create-user`, `delete-user`, `reset-user-password`
- **Routes** : `/admin/users`

### 8.2 Gestion agences

- **Interface** : AdminAgencies
- **Auto-création** : Agence créée si inexistante lors de création utilisateur
- **Routes** : `/admin/agencies`

### 8.3 Sauvegardes

- **Types** : Complète, par catégorie, cache
- **Interface** : AdminBackup, AdminCacheBackup
- **Routes** : `/admin/backup`, `/admin/cache-backup`

### 8.4 Monitoring système

- **Sentry** : Intégration frontend + Edge Functions
- **Interface** : AdminSystemHealth
- **Routes** : `/admin/system-health`

---

## 9. Infrastructure & Sécurité (P1)

### 9.1 JWT Verification (P1#1)

- **Configuration** : `verify_jwt = true` sur 17 Edge Functions
- **Frontend** : `supabase.functions.invoke()` avec JWT automatique

### 9.2 CORS Hardening (P1#2)

- **Helper** : `_shared/cors.ts`
- **Origines autorisées** : Production, localhost, Lovable preview

### 9.3 Rate Limiting (P1#3)

- **Helper** : `_shared/rateLimit.ts`
- **Limites** : 30 req/min chat, 5 req/10min RAG rebuild

### 9.4 RLS Audit (P1#4-5)

- **Corrections** : Suppression "Temporary full access"
- **Policies** : `has_min_global_role()`, `has_support_access()`, `has_franchiseur_access()`

### 9.5 React Query Robustness (P1#7)

- **Helpers** : `safeQuery`, `safeMutation`, `safeInvoke`
- **Fallbacks** : Valeurs par défaut, pas d'undefined

---

## 10. UI/UX & Design System

### 10.1 Layout unifié

- **Composants** : MainLayout, UnifiedHeader, UnifiedSidebar
- **Logo** : HelpConfort Services

### 10.2 Thème

- **Tokens** : HSL via CSS variables
- **Mode** : Clair par défaut (dark mode supporté)

### 10.3 Navigation hiérarchique

- **Sections** : Academy, Pilotage, Support, Réseau, Admin
- **Hub pages** : Index par section avec découverte

---

## Annexes

### A. Tables principales Supabase

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs étendus |
| `blocks` | Contenus guides |
| `apporteur_blocks` | Contenus apporteurs |
| `guide_chunks` | Index RAG |
| `support_tickets` | Tickets support |
| `support_messages` | Messages tickets |
| `apogee_agencies` | Configuration agences |
| `apogee_tickets` | Tickets projet |
| `franchiseur_roles` | Rôles franchiseur |
| `franchiseur_agency_assignments` | Associations animateur-agence |

### B. Edge Functions

| Fonction | Rôle |
|----------|------|
| `chat-guide` | Chatbot IA avec RAG |
| `search-embeddings` | Recherche vectorielle |
| `generate-embeddings` | Génération embeddings |
| `create-user` | Création utilisateur |
| `delete-user` | Suppression utilisateur |
| `reset-user-password` | Reset mot de passe |
| `update-user-email` | Mise à jour email |
| `notify-support-ticket` | Notifications support |
| `notify-escalation` | Notifications escalade |
| `support-auto-classify` | Classification IA tickets |
| `get-kpis` | KPIs agence (legacy) |
| `network-kpis` | KPIs réseau |

---

*Document mis à jour automatiquement. Pour toute correction, contacter l'équipe technique.*
