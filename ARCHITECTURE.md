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

---

## Structure du code

### Dossiers principaux

```
src/
├── pages/              # Pages principales de l'application (routes React Router)
│   ├── Landing.tsx
│   ├── ApogeeGuide.tsx
│   ├── ApporteurGuide.tsx
│   ├── HelpConfort.tsx
│   ├── Category.tsx
│   ├── CategoryHelpConfort.tsx
│   ├── AdminIndex.tsx
│   ├── AdminUsers.tsx
│   ├── AdminDocuments.tsx
│   ├── AdminBackup.tsx
│   ├── AdminSupport.tsx
│   └── ...
│
├── components/         # Composants UI réutilisables
│   ├── ui/            # Composants shadcn/ui (Button, Dialog, Card, etc.)
│   ├── category/      # Composants spécifiques aux pages Category
│   ├── chatbot/       # Composants du chatbot et support
│   ├── admin/         # Composants du back-office admin
│   ├── Header.tsx
│   ├── Layout.tsx
│   ├── Chatbot.tsx
│   └── ...
│
├── contexts/           # Contextes React pour état global
│   ├── AuthContext.tsx          # Authentification utilisateur, rôles
│   ├── EditorContext.tsx        # Gestion des blocs/catégories
│   └── ApporteurEditorContext.tsx
│
├── hooks/              # Custom hooks métiers et techniques
│   ├── use-auth.ts
│   ├── use-category.ts
│   ├── use-chatbot.ts
│   ├── use-admin-backup.ts
│   ├── use-admin-documents.ts
│   ├── use-support-ticket.ts
│   └── ...
│
├── integrations/supabase/  # Client Supabase, types auto-générés
│   ├── client.ts           # Instance du client Supabase
│   └── types.ts            # Types TypeScript générés depuis le schéma DB
│
├── lib/                # Utilitaires et helpers
│   ├── db.ts
│   ├── db-apporteurs.ts
│   ├── utils.ts
│   └── mentions.ts
│
├── extensions/         # Extensions TipTap pour éditeur rich-text
│   ├── Callout.tsx
│   ├── ResizableImage.tsx
│   ├── Mention.tsx
│   └── ...
│
├── assets/             # Images, logos, icônes
└── index.css           # Styles globaux + design tokens Tailwind

supabase/
├── migrations/         # Migrations SQL versionnées
└── functions/          # Edge Functions Supabase (Deno)
    ├── chat-guide/
    ├── search-embeddings/
    ├── generate-embeddings/
    ├── index-document/
    ├── parse-document/
    ├── create-user/
    ├── delete-user/
    └── notify-support-ticket/
```

---

## Modèle de données (niveau macro)

### Tables principales

#### `profiles`
Profils utilisateurs étendant `auth.users`.  
Contient : `pseudo`, `first_name`, `last_name`, `agence`, `role_agence` (poste occupé), `avatar_url`, `must_change_password`.

#### `user_roles`
Rôles applicatifs des utilisateurs (séparé du profil pour la sécurité).  
Enum `app_role` : `admin`, `user`, `support`.  
Clé étrangère vers `auth.users`.

#### `role_permissions`
Permissions granulaires par rôle et par bloc de contenu.  
Colonnes : `role_agence` (poste), `block_id`, `can_access`.  
Permet de restreindre l'accès à certaines sections selon le poste occupé (technicien, assistante, dirigeant, commercial).

#### `blocks`
Blocs de contenu pour le guide Apogée (catégories et sections).  
Colonnes : `title`, `slug`, `content` (HTML), `type` (category/section), `parent_id`, `order`, `icon`, `color_preset`, `content_type`, `tips_type`, `hide_title`, `show_summary`, `summary`, `attachments`.

#### `apporteur_blocks`
Blocs de contenu pour le guide Apporteurs (même structure que `blocks` mais table séparée).

#### `categories`
Catégories legacy utilisées par l'ancien système (backup/export).  
Contient : `title`, `slug`, `scope` (apogee/apporteur/helpconfort), `icon`, `color_preset`, `display_order`.

#### `sections`
Sections legacy (backup/export).  
Colonnes : `title`, `content` (JSON), `category_id`, `display_order`.

#### `guide_chunks`
Chunks de texte indexés pour le RAG (Retrieval-Augmented Generation).  
Contient : `block_id`, `block_slug`, `block_title`, `block_type`, `chunk_index`, `chunk_text`, `embedding` (vecteur JSON), `metadata`.  
Utilisé par Mme MICHU pour rechercher le contenu pertinent via embeddings.

#### `documents`
Documents uploadés par les admins (PDF, images, etc.) associés à des blocs.  
Colonnes : `title`, `description`, `file_path`, `file_type`, `file_size`, `scope`, `block_id`, `apporteur_block_id`.  
Stockés dans le bucket Supabase Storage `documents`.

#### `support_tickets`
Tickets de support créés par les utilisateurs.  
Colonnes : `user_id`, `user_pseudo`, `status` (waiting/in_progress/resolved), `priority`, `assigned_to` (support agent), `chatbot_conversation` (JSON), `rating`, `rating_comment`, `created_at`, `resolved_at`.

#### `support_messages`
Messages échangés dans les tickets de support.  
Colonnes : `ticket_id`, `sender_id`, `message`, `is_from_support`, `read_at`, `created_at`.

#### `support_presence`
Présence en temps réel des agents support (typage, statut).  
Colonnes : `user_id`, `status` (online/offline/typing), `last_seen`.

#### `chatbot_queries`
Questions posées au chatbot Mme MICHU pour tracking et amélioration.  
Colonnes : `question`, `answer`, `user_id`, `user_pseudo`, `status` (pending/resolved), `is_incomplete`, `admin_notes`, `context_found`, `similarity_scores`, `reviewed_at`, `reviewed_by`.

#### `favorites`
Favoris des utilisateurs (blocs sauvegardés pour accès rapide).  
Colonnes : `user_id`, `block_id`, `block_slug`, `block_title`, `category_slug`, `scope`.

#### `user_history`
Historique de navigation des utilisateurs (tracking des blocs consultés).  
Colonnes : `user_id`, `block_id`, `block_slug`, `block_title`, `category_slug`, `scope`, `visited_at`.

#### `user_widget_preferences`
Préférences des widgets personnalisables sur le dashboard utilisateur.  
Colonnes : `user_id`, `widget_key`, `is_enabled`, `size`, `display_order`.

#### `knowledge_base`
Base de connaissance supplémentaire (legacy ou usage futur).  
Colonnes : `title`, `content`, `category`, `metadata`.

#### `apogee_agencies`
Configuration des agences pour le module "Mes indicateurs".  
Colonnes : `slug`, `label`, `api_base_url`, `is_active`.  
Utilisé pour associer chaque utilisateur (`profiles.agence`) à une configuration API Apogée.

#### `apogee_api_credentials`
Clés API optionnelles par agence (strictement protégées).  
Colonnes : `agency_id`, `api_key`.  
**Accès RLS** : Admins uniquement. Ne jamais exposer aux utilisateurs standards.

---

## Rôles & permissions

### Rôles applicatifs (`app_role`)

1. **`admin`** : Accès total à l'application (gestion utilisateurs, contenus, documents, sauvegardes, support).
2. **`support`** : Accès à l'interface de support pour gérer les tickets utilisateurs.
3. **`user`** : Utilisateur standard avec accès aux guides selon son poste (`role_agence`).

### Postes occupés (`role_agence`)

Indépendant des rôles applicatifs, utilisé pour filtrer les permissions granulaires :
- `technicien`, `assistante`, `dirigeant`, `commercial`, etc.

### Mécanisme de permissions

- **Table `user_roles`** : Associe chaque utilisateur à un ou plusieurs rôles applicatifs (`admin`, `support`, `user`).
- **Table `role_permissions`** : Définit quels postes (`role_agence`) peuvent accéder à quels blocs (`block_id`).
- **Fonction SQL `has_role(_user_id, _role)`** : Fonction SECURITY DEFINER pour vérifier les rôles sans déclencher de récursion RLS.

### Row Level Security (RLS)

Toutes les tables sensibles ont des policies RLS :
- **Lecture publique** : `blocks`, `apporteur_blocks`, `categories`, `sections`, `guide_chunks` (accessibles aux utilisateurs authentifiés).
- **Écriture admin uniquement** : `blocks`, `apporteur_blocks`, `documents`, `categories`, `sections` (INSERT/UPDATE/DELETE réservés aux admins).
- **Accès par utilisateur** : `favorites`, `user_history`, `user_widget_preferences` (chaque user ne voit que ses données via `auth.uid() = user_id`).
- **Support** : `support_tickets`, `support_messages` (users voient leurs tickets, support voit tous les tickets).
- **Chatbot queries** : Users voient leurs questions, admins voient toutes les questions.

---

## Edge Functions Supabase

Les Edge Functions sont des fonctions serverless Deno déployées sur Supabase, appelées depuis le frontend via `supabase.functions.invoke()`.

### `create-user`
**Rôle** : Créer un nouvel utilisateur dans Supabase Auth et insérer son profil dans `profiles` + `user_roles`.  
**Appelé par** : Admins depuis la page AdminUsers.  
**Paramètres** : `email`, `password`, `first_name`, `last_name`, `pseudo`, `agence`, `role_agence`, `role` (app_role).

### `delete-user`
**Rôle** : Supprimer un utilisateur de Supabase Auth et toutes ses données associées (cascade).  
**Appelé par** : Admins depuis la page AdminUsers.  
**Paramètres** : `userId`.

### `generate-embeddings`
**Rôle** : Générer des embeddings vectoriels pour tous les blocs du guide (chunking + OpenAI embeddings).  
**Appelé par** : Admins depuis le bouton "MAJ BOT" (AdminIndex ou AdminDocuments).  
**Paramètres** : Aucun (traite tous les blocs automatiquement par batch).

### `search-embeddings`
**Rôle** : Rechercher les chunks les plus pertinents pour une question donnée (similarité cosinus sur les embeddings).  
**Appelé par** : Chatbot Mme MICHU lors de chaque question utilisateur.  
**Paramètres** : `query` (question), `scope` (apogee/apporteur/helpconfort), `topK` (nombre de résultats, défaut 15).

### `index-document`
**Rôle** : Indexer un document PDF uploadé (parsing + chunking + embeddings) pour le RAG.  
**Appelé par** : Admins après upload d'un document PDF (AdminDocuments).  
**Paramètres** : `documentUrl`, `documentId`.

### `parse-document`
**Rôle** : Parser un document (PDF, DOCX, etc.) et extraire le texte brut.  
**Appelé par** : `index-document` en interne ou directement par les admins.  
**Paramètres** : `documentUrl`.

### `chat-guide`
**Rôle** : Gérer la conversation avec Mme MICHU (streaming de réponses OpenAI GPT-4o basé sur contexte RAG).  
**Appelé par** : Chatbot lors de l'envoi d'un message utilisateur en mode IA.  
**Paramètres** : `messages` (historique conversation), `context` (chunks RAG), `userPseudo`, `scope`.

### `notify-support-ticket`
**Rôle** : Envoyer des notifications email (Resend) et SMS (AllMySMS) aux agents support lors de la création d'un ticket.  
**Appelé par** : Frontend automatiquement après création d'un ticket support.  
**Paramètres** : `ticketId`.

### `get-kpis`
**Rôle** : Récupérer les indicateurs de performance (KPIs) pour l'agence de l'utilisateur connecté.  
**Appelé par** : Page "Mes indicateurs" au chargement initial et sur actualisation.  
**Paramètres** : `period` (month/year, optionnel).  
**Retour** : JSON contenant CA mensuel/annuel, nombre de factures et interventions pour l'agence.  
**Fonctionnement** :
  1. Récupère le profil de l'utilisateur (`profiles.agence`).
  2. Trouve la configuration de l'agence dans `apogee_agencies`.
  3. Charge les credentials API depuis `apogee_api_credentials` ou env variables.
  4. Appelle l'API Apogée de l'agence (actuellement stub/mock).
  5. Retourne les KPIs structurés pour affichage frontend.

---

## Flux principaux

### 1. Connexion / Gestion de session / Récupération du rôle

1. L'utilisateur accède à la page Landing (ou toute page protégée).
2. `AuthContext` vérifie la session Supabase (`supabase.auth.getSession()`).
3. Si non authentifié, affiche `LoginDialog` (login par pseudo ou email + mot de passe).
4. Fonction SQL `get_email_from_pseudo` convertit le pseudo en email si nécessaire.
5. Après authentification réussie, récupération du profil (`profiles`) et des rôles (`user_roles`).
6. `AuthContext` expose `user`, `profile`, `isAdmin`, `isSupport` à toute l'application.
7. Redirection automatique si mot de passe temporaire (`must_change_password`).

### 2. Consultation du guide + Recherche + Chatbot

1. L'utilisateur navigue vers ApogeeGuide, ApporteurGuide ou HelpConfort.
2. `EditorContext` charge les blocs (`blocks` ou `apporteur_blocks`) et catégories depuis Supabase.
3. Affichage des catégories filtrées (permissions granulaires via `role_permissions`).
4. Clic sur une catégorie → navigation vers `/apogee/:slug` (composant `Category`).
5. Affichage des sections avec accordéons, favoris, filtres (TIPS/Tutoriels).
6. **Recherche via chatbot Mme MICHU** :
   - Clic sur le bouton chatbot (choix IA ou Support).
   - Mode IA : envoi de la question → `search-embeddings` (topK=15) → `chat-guide` avec contexte RAG.
   - Réponse streaming affichée dans l'interface chatbot.
   - Tracking de la question dans `chatbot_queries` si réponse incomplète.

### 3. Création/Gestion de tickets support + Présence support

1. Utilisateur clique "Support" dans le chatbot ou "Parler à un conseiller".
2. Création d'un ticket dans `support_tickets` (statut `waiting`, conversation chatbot sauvegardée en JSON).
3. Notification envoyée aux agents support (email Resend + SMS AllMySMS) via `notify-support-ticket`.
4. Agent support voit le ticket dans AdminSupport (ou interface dédiée Support).
5. Agent clique "Prendre en charge" → ticket passe en `in_progress`, `assigned_to` mis à jour.
6. **Chat en temps réel** :
   - Utilisateur et agent échangent des messages via `support_messages`.
   - Real-time Supabase (`postgres_changes` sur `support_messages`).
   - Typing indicators via `support_presence` (Supabase Realtime Presence).
7. Agent clique "Résoudre" → ticket passe en `resolved`, `resolved_at` enregistré.
8. Utilisateur rate la résolution (1-5 étoiles + commentaire optionnel) → `rating` et `rating_comment` enregistrés.

### 4. Gestion de documents et indexation IA côté admin

1. Admin accède à AdminDocuments.
2. Sélection du scope (Apogée/Apporteurs/HelpConfort), du bloc associé.
3. Upload d'un document (PDF, image, etc.) → stockage dans bucket `documents`.
4. Métadonnées insérées dans table `documents`.
5. **Indexation automatique si PDF** :
   - Appel de `index-document` avec l'URL publique du PDF.
   - Parsing du PDF (`parse-document`), chunking du texte.
   - Génération des embeddings OpenAI (`text-embedding-3-small`).
   - Insertion des chunks dans `guide_chunks`.
6. Le chatbot Mme MICHU peut désormais récupérer ce contenu via `search-embeddings`.

### 5. Consultation des indicateurs de performance (KPIs)

1. Utilisateur accède à "Mes indicateurs" depuis la Landing page.
2. Page `MyIndicators` charge via hook `useAgencyKpis()`.
3. Hook appelle edge function `get-kpis` avec le JWT de l'utilisateur.
4. `get-kpis` :
   - Vérifie l'authentification et récupère `profiles.agence`.
   - Charge la configuration depuis `apogee_agencies` (api_base_url).
   - Charge les credentials depuis `apogee_api_credentials` ou secrets Supabase.
   - Appelle l'API Apogée de l'agence (actuellement mock).
   - Retourne les KPIs (CA mensuel, CA annuel, factures, interventions).
5. Affichage des KPIs dans des cartes shadcn (Euro, TrendingUp, FileText, Wrench).
6. Bouton "Actualiser" pour recharger les données.

**Admin** : Configuration des agences disponible dans `AdminAgencies` (ajout/modification des slugs, labels, URLs API, statut actif/inactif).

**Extension future** : Dashboard franchiseur (multi-agences) avec agrégation des KPIs.

---

## Points d'attention pour les développeurs

### Refactoring en cours
Plusieurs gros composants (Category.tsx, Chatbot.tsx, AdminBackup.tsx, AdminDocuments.tsx, AdminSupport.tsx) ont été refactorisés en sous-composants et hooks pour améliorer la maintenabilité. Respecter la structure :
- **Hooks métiers** dans `src/hooks/` (use-category.ts, use-chatbot.ts, etc.).
- **Composants UI** dans `src/components/[nom-feature]/`.
- **Fichiers de page** ne doivent pas dépasser 300-400 lignes.

### Sécurité
- **Jamais de vérification de rôles côté client** (localStorage, hardcoded).
- **Toujours utiliser RLS** et fonction `has_role()` pour les permissions.
- **Secrets gérés via Supabase Secrets** (OPENAI_API_KEY, RESEND_API_KEY, ALLMYSMS_API_KEY, etc.).

### Types TypeScript
- **Ne jamais éditer manuellement** `src/integrations/supabase/types.ts` (auto-généré).
- Utiliser `Database['public']['Tables']['nom_table']['Row']` pour typer les données.

### Design system
- **Utiliser les tokens Tailwind** (`--primary`, `--secondary`, `--accent`, etc.) définis dans `index.css`.
- **Éviter les couleurs directes** (text-white, bg-black). Toujours utiliser les variables HSL.

### Real-time Supabase
- **Activer les publications** : `ALTER PUBLICATION supabase_realtime ADD TABLE public.nom_table;`.
- **Souscrire aux changements** via `supabase.channel()` pour les mises à jour live (messages support, typing indicators).

---

## Liens utiles

- **Documentation Supabase** : https://supabase.com/docs
- **Documentation shadcn/ui** : https://ui.shadcn.com/
- **Documentation Tailwind CSS** : https://tailwindcss.com/docs
- **Documentation React Router** : https://reactrouter.com/
- **Documentation TipTap** : https://tiptap.dev/

---

**Auteur** : Projet généré et maintenu via Lovable AI.  
**Dernière mise à jour** : 2025-01-XX (refactoring architecture).
