# Documentation Complète des Modules HelpConfort

> **Version**: 2.0  
> **Dernière mise à jour**: 2026-03-07  
> **Basée sur**: V0.9.1 — Permissions Unifiées

---

## Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [Système de Permissions V3](#système-de-permissions-v3)
3. [Modules Agence](#modules-agence)
   - [Mon Agence](#mon-agence)
   - [Statistiques (StatIA)](#statistiques-statia)
   - [RH / Salariés](#rh--salariés)
   - [Parc (Véhicules & EPI)](#parc-véhicules--epi)
4. [Modules Outils](#modules-outils)
   - [Apporteurs / Suivi Client](#apporteurs--suivi-client)
   - [Commercial (CRM Prospects)](#commercial-crm-prospects)
   - [Plannings](#plannings)
   - [Réunions](#réunions)
   - [Documents (Médiathèque)](#documents-médiathèque)
5. [Modules Support](#modules-support)
   - [Guides (Help! Academy)](#guides-help-academy)
   - [Ticketing (Gestion de Projet)](#ticketing-gestion-de-projet)
   - [Aide (Support & Helpi)](#aide-support--helpi)
6. [Modules Réseau](#modules-réseau)
   - [Réseau Franchiseur](#réseau-franchiseur)
   - [Administration Plateforme](#administration-plateforme)
7. [Recherche Unifiée](#recherche-unifiée)
8. [Inter-connexions Modules](#inter-connexions-modules)
9. [Règles Métier (STATIA_RULES)](#règles-métier-statia_rules)

---

## Architecture Globale

### Stack Technique
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth + RLS
- **Monitoring**: Sentry

### Navigation Unifiée (UnifiedWorkspace)
```
URL: /?tab={module}
Modules: agence | stats | rh | parc | divers_apporteurs | divers_plannings |
         divers_reunions | divers_documents | guides | ticketing | aide | prospection
Admin:   /?tab=admin&adminTab={sub}
Réseau:  /?tab=reseau
```

### Fichiers Clés
| Fichier | Description |
|---------|-------------|
| `src/types/modules.ts` | `MODULE_DEFINITIONS` — définition unique des modules et options |
| `src/permissions/` | Moteur de permissions (barrel: `@/permissions`) |
| `src/hooks/access-rights/` | Hooks `useEffectiveModules`, `useModuleRegistry`, `useModuleOverrides` |
| `src/config/moduleTree.ts` | Seed de référence pour `module_registry` (jamais lu au runtime) |
| `src/statia/domain/rules.ts` | `STATIA_RULES` (source de vérité règles métier CA) |

---

## Système de Permissions V3

> **Source de vérité unique** : table `user_modules` + RPC `get_user_effective_modules`.  
> Le champ legacy `profiles.enabled_modules` (JSONB) a été **entièrement purgé** en V0.9.1.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉCRITURE (unique point d'entrée)                              │
│  Admin > Gestion > Droits → INSERT/DELETE user_modules         │
├─────────────────────────────────────────────────────────────────┤
│  LECTURE                                                        │
│                                                                 │
│  Frontend:                                                      │
│    AuthContext → RPC get_user_effective_modules()               │
│    → enabledModules state                                       │
│    → hasModule() / hasModuleOption() via @/permissions          │
│                                                                 │
│  SQL/RLS:                                                       │
│    has_module_v2(_user_id, 'key')        → user_modules        │
│    has_module_option_v2(_user_id, k, o)  → user_modules        │
│    has_apogee_tickets_access()           → user_modules + N5+  │
│    has_franchiseur_access()              → has_module_v2 + N3+ │
│    has_support_access()                  → has_module_v2 + N5+ │
│    is_support_agent()                    → has_module_option_v2 │
│                                                                 │
│  Edge Functions:                                                │
│    global_role (N5+ bypass) + has_module_v2() SQL              │
└─────────────────────────────────────────────────────────────────┘
```

### Cascade de résolution (RPC)

```
1. module_registry     → modules déployés (is_deployed = true)
2. plan_tier_modules   → modules du plan agence (STARTER/PRO)
3. user_modules        → overrides individuels (onglet Droits)
4. Filtre min_role     → côté serveur (N5+ bypass)
```

### Hiérarchie des Rôles (N0-N6)

| Niveau | Code technique | Label métier | Accès |
|--------|---------------|--------------|-------|
| N0 | `base_user` | Partenaire externe | Guides, Aide |
| N1 | `franchisee_user` | Utilisateur agence | Pilotage lecture |
| N2 | `franchisee_admin` | Dirigeant agence | Pilotage complet, RH, Parc |
| N3 | `franchisor_user` | Animateur réseau | Multi-agences assignées |
| N4 | `franchisor_admin` | Direction réseau | Gestion réseau complète |
| N5 | `platform_admin` | Support avancé | Bypass tous modules |
| N6 | `superadmin` | Administrateur | Accès absolu + déploiement modules |

### Règle plancher agence

```typescript
// Trigger DB: enforce_agency_role_floor
// Tout utilisateur avec agence → minimum N2 automatiquement
if (user.agence && user.global_role < N2) {
  user.global_role = 'franchisee_admin'; // Force N2
}
```

### Section "En cours de développement"

Les modules avec `is_deployed = false` dans `module_registry` apparaissent dans une section séparée 🚧 en bas de l'écran Droits. Seul un **N6 (superadmin)** peut activer le déploiement. Une fois activé, le module remonte automatiquement dans la section correspondante de l'arbre.

### Fichiers Permissions

```
src/permissions/
├── index.ts              # Barrel exports
├── types.ts              # PermissionContext, HasAccessParams
├── constants.ts          # BYPASS_ROLES, MODULE_MIN_ROLES
├── permissionsEngine.ts  # hasAccess(), getEffectiveModules(), explainAccess()
├── moduleRegistry.ts     # Canon unique modules, PROTECTED_MODULES
└── devValidator.ts       # Validation cohérence dev
```

### Hooks (à utiliser)

```typescript
// AuthContext — Source de vérité frontend
const { hasGlobalRole, hasModule, hasModuleOption } = useAuth();

// Hooks spécialisés
import { useHasGlobalRole, useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { usePermissions } from '@/hooks/use-permissions';
```

### Tables SQL Permissions

```sql
module_registry          -- Arbre des modules (deployed, plan, min_role)
user_modules             -- Overrides individuels (user_id, module_key, options)
plan_tiers               -- Plans (STARTER, PRO)
plan_tier_modules        -- Modules par plan
agency_subscription      -- Abonnement agence → plan
```

---

## Modules Agence

### Mon Agence

**Clé**: `agence`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=agence`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Indicateurs | `agence.indicateurs` | KPIs principaux |
| Actions à mener | `agence.actions_a_mener` | Liste des actions |
| Diffusion | `agence.diffusion` | Écran TV |

#### Tables Supabase
```sql
apogee_agencies          -- Données agence
agency_commercial_profile -- Profil marketing
agency_stamps            -- Tampons
agency_admin_documents   -- Documents administratifs
```

---

### Statistiques (StatIA)

**Clé**: `stats`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=stats`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Stats Hub | `stats.stats_hub` | Tableaux avancés |
| Exports | `stats.exports` | Export des données |

#### Architecture StatIA
```
src/statia/
├── api/                    # getMetric, getMetricForAgency
├── definitions/            # Métriques core (CA, SAV, Devis...)
├── domain/rules.ts         # STATIA_RULES (source de vérité)
├── engine/                 # Calculs, loaders, normalizers
└── hooks/                  # useStatia, useStatiaMetric
```

#### Métriques Core

| ID | Description | Source |
|----|-------------|--------|
| `ca_global_ht` | CA total HT | apiGetFactures.totalHT |
| `ca_mensuel` | CA par mois | factures groupées |
| `ca_par_univers` | CA ventilé univers | project.universes |
| `ca_par_apporteur` | CA par commanditaire | project.commanditaireId |
| `ca_par_technicien` | CA attribué technicien | interventions.userId |
| `taux_sav_global` | % SAV | dossiers SAV / total |
| `taux_transformation_devis` | Devis → Facture | count + montant |

---

### RH / Salariés

**Clé**: `rh`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=rh`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Gestionnaire | `rh.rh_viewer` | Vue équipe |
| Admin RH | `rh.rh_admin` | Gestion complète + données sensibles |

#### Tables Supabase
```sql
collaborators              -- Données collaborateurs
collaborator_sensitive_data -- Données chiffrées AES-256-GCM (Edge Function)
employment_contracts       -- Contrats
salary_history             -- Historique salaires
document_requests          -- Demandes de documents
leave_requests             -- Demandes de congés
rh_notifications           -- Notifications RH temps réel
```

#### Sécurité données sensibles
- **Chiffrement**: AES-256-GCM via Edge Function `sensitive-data`
- **Accès**: Vérifié via `user_modules` (has_module_option_v2('rh', 'rh_admin'))
- **RLS**: Isolation stricte par agence
- **Audit**: `sensitive_data_access_log` + `activity_log`

---

### Parc (Véhicules & EPI)

**Clé**: `parc`  
**Rôle minimum**: N1 (`franchisee_user`)  
**Route**: `/?tab=parc`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Véhicules | `parc.vehicules` | Flotte véhicules |
| EPI | `parc.epi` | Équipements protection |
| Équipements | `parc.equipements` | Équipements divers |

#### Tables Supabase
```sql
fleet_vehicles           -- Véhicules
fleet_assignments        -- Affectations
maintenance_events       -- Événements maintenance
maintenance_alerts       -- Alertes préventives
epi_stock               -- Stock EPI
epi_assignments         -- Affectations EPI
epi_incidents           -- Incidents EPI
```

---

## Modules Outils

### Apporteurs / Suivi Client

**Clé**: `divers_apporteurs`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=divers_apporteurs`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Consulter | `divers_apporteurs.consulter` | Vue lecture |
| Gérer | `divers_apporteurs.gerer` | CRUD complet |

#### Tables Supabase
```sql
-- CRM interne agence
apporteurs                -- Apporteurs (nom, type, logo)
apporteur_contacts        -- Contacts apporteur

-- Portail autonome (PAS Supabase Auth!)
apporteur_managers        -- Gestionnaires portail (email, role)
apporteur_users           -- Utilisateurs portail liés à Supabase Auth
apporteur_sessions        -- Sessions JWT custom (SHA-256)
apporteur_otp_codes       -- Codes OTP 6 chiffres (15min TTL)
apporteur_invitation_links-- Liens invitation (48h)

-- Données métier
apporteur_intervention_requests -- Demandes intervention
apporteur_project_links   -- Liens vers projets Apogée
apporteur_access_logs     -- Audit accès portail
```

#### Authentification Portail (AUTONOME)

> **CRITIQUE**: Le portail apporteur utilise une authentification **100% autonome**.  
> Les apporteur_managers ne sont PAS dans auth.users.  
> Les apporteur_users SONT liés à auth.users via Supabase Auth.

```
1. Apporteur saisit email → Edge Fn: apporteur-auth-send-code
2. OTP 6 chiffres (SHA-256 hash, TTL 15min)
3. Validation → Edge Fn: apporteur-auth-verify-code
4. Session créée (90 jours) → JWT custom
```

---

### Commercial (CRM Prospects)

**Clé**: `prospection`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=prospection` (renommé "Commercial" dans l'UI)

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Dashboard | `prospection.dashboard` | Suivi client global |
| Comparateur | `prospection.comparateur` | Métriques apporteurs |
| Veille | `prospection.veille` | Classement partenaires |
| Prospects | `prospection.prospects` | Pipeline CRM |

#### Fonctionnalités (V0.9.0)
- Scoring adaptatif apporteurs (score composite 0-100)
- Comparateur de métriques (calcul CRON quotidien 02h30)
- Pipeline prospects 6 états (Nouveau → Gagné/Perdu)
- Import Excel avec mapping flexible
- Panel de détail avec notes et RDV

#### Tables Supabase
```sql
apporteur_scores           -- Scores calculés
apporteur_metrics_daily    -- Métriques quotidiennes
prospects                  -- Pipeline CRM
prospect_interactions      -- Notes, RDV, historique
```

---

### Plannings

**Clé**: `divers_plannings`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=divers_plannings`

#### Fonctionnalités
- Visualisation planning techniciens (semaine)
- Synchronisation Apogée (apiGetInterventions)
- Suggestions IA (Edge Function: suggest-planning)
- Optimisation IA (Edge Function: optimize-week)

---

### Réunions

**Clé**: `divers_reunions`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=divers_reunions`

#### Tables Supabase
```sql
agency_meetings         -- Réunions
meeting_participants    -- Participants
meeting_agenda_items    -- Points ODJ
meeting_decisions       -- Décisions
```

---

### Documents (Médiathèque)

**Clé**: `divers_documents`  
**Rôle minimum**: N2 (`franchisee_admin`)  
**Route**: `/?tab=divers_documents`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Consulter | `divers_documents.consulter` | Vue lecture |
| Gérer | `divers_documents.gerer` | Upload, déplacer, supprimer |
| Vider corbeille | `divers_documents.corbeille_vider` | Purge corbeille |

#### Modèle Asset-Link
```
Asset (fichier physique dans Supabase Storage)
  └── Links (références contextuelles)
       ├── /rh/salaries/{id}
       ├── /reunions/{id}
       └── /agence/documents
```

#### Tables Supabase
```sql
media_assets           -- Fichiers physiques
media_links            -- Références contextuelles
media_folders          -- Dossiers virtuels (hiérarchie)
media_tags             -- Tags classification
media_system_folders   -- Dossiers système auto-créés
```

---

## Modules Support

### Guides (Help! Academy)

**Clé**: `guides`  
**Rôle minimum**: N0 (`base_user`)  
**Route**: `/?tab=guides`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Apogée | `guides.apogee` | Tutoriels logiciel métier |
| Apporteurs | `guides.apporteurs` | Relations commanditaires |
| HelpConfort | `guides.helpconfort` | Processus réseau |
| FAQ | `guides.faq` | Questions fréquentes |

#### Tables Supabase
```sql
blocks                 -- Contenus guides (Apogée)
apporteur_blocks       -- Contenus guides (Apporteurs)
guide_chunks           -- Index RAG (embeddings pour Helpi)
knowledge_base         -- Base de connaissances IA
```

---

### Ticketing (Gestion de Projet)

**Clé**: `ticketing`  
**Rôle minimum**: N0 (`base_user`)  
**Route**: `/?tab=ticketing`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Kanban | `ticketing.kanban` | Vue kanban |
| Créer | `ticketing.create` | Création tickets |
| Gérer | `ticketing.manage` | Gestion avancée |
| Import | `ticketing.import` | Import Excel |

#### Tables Supabase
```sql
apogee_tickets           -- Tickets
apogee_ticket_statuses   -- Statuts kanban
apogee_ticket_comments   -- Commentaires
apogee_ticket_attachments-- Pièces jointes
apogee_ticket_history    -- Historique
apogee_ticket_tags       -- Tags
apogee_modules           -- Modules Apogée
apogee_priorities        -- Priorités
apogee_ticket_transitions-- Transitions autorisées
apogee_ticket_user_roles -- Rôles spécifiques ticketing
apogee_ticket_views      -- Vues utilisateur
apogee_ticket_support_exchanges -- Échanges support
apogee_ticket_field_permissions -- Permissions champs
```

#### Workflow Kanban
```
Nouveau → Qualifié → En cours → Review → Terminé
                  ↘ Bloqué ↗
```

#### Accès RLS
```sql
-- Vérifié par: has_apogee_tickets_access(auth.uid())
-- → Cherche dans user_modules ('apogee_tickets' OU 'ticketing')
-- → Ou N5+ bypass
```

---

### Aide (Support & Helpi)

**Clé**: `aide`  
**Rôle minimum**: N0 (`base_user`)  
**Route**: `/?tab=aide`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Utilisateur | `aide.user` | Accès aide de base |
| Agent | `aide.agent` | Console agent support |

#### Chatbot Helpi (RAG)
```
question → embedding → similarity_search (guide_chunks)
        → contexte → LLM (Lovable AI Gateway / Gemini)
        → réponse contextualisée
```

#### Edge Functions
```
helpi-search/          -- Recherche sémantique
helpi-index/           -- Indexation documents
chat-guide/            -- Chat RAG avec streaming
```

#### Accès RLS
```sql
-- Agent support vérifié par: is_support_agent(auth.uid())
-- → has_module_option_v2(uid, 'aide', 'agent')
-- → OU has_module_option_v2(uid, 'support', 'agent') [compat]
```

---

## Modules Réseau

### Réseau Franchiseur

**Clé**: `reseau_franchiseur`  
**Rôle minimum**: N3 (`franchisor_user`)  
**Route**: `/?tab=reseau`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Dashboard | `reseau_franchiseur.dashboard` | Vue consolidée |
| Stats | `reseau_franchiseur.stats` | KPIs réseau |
| Agences | `reseau_franchiseur.agences` | Gestion agences |
| Redevances | `reseau_franchiseur.redevances` | Calcul royalties |
| Comparatifs | `reseau_franchiseur.comparatifs` | Inter-agences |

#### Tables Supabase
```sql
agency_royalty_config      -- Configuration redevances
agency_royalty_tiers       -- Tranches
agency_royalty_calculations -- Calculs mensuels
animator_visits            -- Visites animateurs
```

#### Accès RLS
```sql
-- Vérifié par: has_franchiseur_access(auth.uid())
-- → has_module_v2(uid, 'reseau_franchiseur') OU N3+
```

---

### Administration Plateforme

**Clé**: `admin_plateforme`  
**Rôle minimum**: N5 (`platform_admin`)  
**Route**: `/?tab=admin`

#### Options
| Option | Clé | Description |
|--------|-----|-------------|
| Utilisateurs | `admin_plateforme.users` | CRUD users |
| Agences | `admin_plateforme.agencies` | Gestion agences |
| Permissions | `admin_plateforme.permissions` | Module registry |

#### Sous-onglets Admin
```
/?tab=admin&adminTab=gestion    → Plans, Modules (Droits), Utilisateurs
/?tab=admin&adminTab=contenus   → Guides, Knowledge Base, Annonces
/?tab=admin&adminTab=systeme    → Santé, Cache, Logs, Export
```

#### Écran "Gestion des Droits" (ModulesMasterView)
- Arbre `module_registry` avec switch Déployé, Plan min., Rôle min.
- Popovers privilèges individuels (user_modules)
- Section 🚧 "En cours de développement" pour modules non déployés
- Switch Déployé restreint à N6 uniquement

---

## Recherche Unifiée

**Clé**: `unified_search`  
**Rôle minimum**: N1 (`franchisee_user`)

#### Architecture
```typescript
// Tokenisation et classification
query → tokens → classification
  → StatIA query   → compute-metric
  → Help query     → search-embeddings → chat-guide
  → Entity query   → DB fulltext search
```

#### Edge Function
```
unified-search/         -- Orchestrateur multi-source
```

---

## Inter-connexions Modules

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Apogée API │────▶│   StatIA    │────▶│    Stats    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Commercial │     │   Agence    │     │   Réseau    │
│ (Prospects) │     │   (KPIs)    │     │ (Multi-Ag)  │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│ Médiathèque │────▶│     RH      │  (Documents salariés via media_links)
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│    Aide     │────▶│  Ticketing  │  (Escalade support → ticket)
│   (Helpi)   │     │  (Apogée)   │
└─────────────┘     └─────────────┘

┌─────────────┐
│  Recherche  │────▶ StatIA + RAG + DB Search
│  Unifiée    │
└─────────────┘
```

---

## Règles Métier (STATIA_RULES)

### Source de Vérité
```
src/statia/domain/rules.ts
```

### Structure (extrait)
```typescript
export const STATIA_RULES = {
  ca: {
    source: 'apiGetFactures.data.totalHT',
    states: { included: ['draft', 'sent', 'paid', 'partially_paid', 'overdue'] },
    avoirs: { treatment: 'subtract', asNegative: true },
    dateField: { priority: 'dateReelle', fallback: 'date' }
  },
  technicians: {
    productiveTypes: ['depannage', 'travaux', 'recherche de fuite'],
    nonProductiveTypes: ['RT', 'TH', 'SAV', 'diagnostic'],
    RT_generates_NO_CA: true
  },
  sav: {
    identification: 'linked_dossier',
    caImpact: 0,
    excludeFromTechStats: true
  },
  devis: {
    validatedStates: ['validated', 'signed', 'order', 'accepted'],
    transformationRate: {
      byCount: 'count(invoiced) / count(emitted)',
      byAmount: 'sum(invoiced_HT) / sum(quoted_HT)'
    }
  }
};
```

---

## Annexes

### A. Edge Functions (liste complète)

| Fonction | Description | Auth |
|----------|-------------|------|
| `chat-guide` | Chat IA RAG (streaming) | JWT |
| `search-embeddings` | Recherche vectorielle | JWT |
| `create-user` | Création utilisateur + user_modules | JWT + N5+ |
| `delete-user` | Suppression utilisateur | JWT + N5+ |
| `sensitive-data` | CRUD données chiffrées RH | JWT + RH admin |
| `compute-apporteur-metrics` | Scoring apporteurs (CRON) | CRON secret |
| `suggest-planning` | Suggestions IA planning | JWT |
| `optimize-week` | Optimisation semaine IA | JWT |
| `generate-hr-document` | Génération docs RH PDF | JWT |
| `generate-monthly-report` | Rapport mensuel PDF | JWT |
| `unified-search` | Recherche multi-source | JWT |
| `apporteur-auth-*` | Auth portail (4 fonctions) | Custom OTP |
| `get-apporteur-*` | Données portail (3 fonctions) | Custom JWT |

### B. Mapping Endpoints Apogée

| Endpoint | Données |
|----------|---------|
| `apiGetProjects` | Dossiers/projets |
| `apiGetInterventions` | Interventions/RDV |
| `apiGetDevis` | Devis |
| `apiGetFactures` | Factures |
| `apiGetClients` | Clients/Apporteurs |
| `apiGetUsers` | Utilisateurs/Techniciens |

### C. Conventions de Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Composant | PascalCase | `MediaQuickLook.tsx` |
| Hook | camelCase + use | `useMediaAssets.ts` |
| Type | PascalCase | `PermissionContext` |
| Table SQL | snake_case | `media_assets` |
| Module Key | snake_case | `divers_apporteurs` |

---

*Documentation Modules HelpConfort — V2.0 — Mars 2026*
