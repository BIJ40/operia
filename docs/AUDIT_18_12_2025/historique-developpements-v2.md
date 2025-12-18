# Historique des Développements V2 — Focus sur la branche `dev`

> **Document généré le** : 2025-12-18  
> **Branche de référence** : `dev`  
> **Comparaison** : `dev` vs `main`  
> **Version application** : v0.8.1+ "Pointages & Timesheets"

---

## Synthèse Exécutive

La V2 représente une **refonte majeure** du système de permissions et une **modernisation de l'architecture** globale de l'application. Les changements principaux concernent :

1. **Permissions V2** : Remplacement du système multi-tables par une hiérarchie simple (N0-N6)
2. **Support V2** : Nouveau système de canaux (chat_ai/chat_human/ticket) avec SLA et IA
3. **Routes V2** : Restructuration complète avec hub pages par section
4. **Sécurité P1** : Hardening complet (JWT, CORS, Rate Limiting, RLS)
5. **RAG unifié** : Pipeline unique avec multi-contextes

---

## 1. Permissions V2 — Refonte Complète

### 1.1 Statut : REFONTE MAJEURE

### 1.2 Différences vs `main`

| Aspect | `main` (V1) | `dev` (V2) |
|--------|-------------|------------|
| Source de vérité | Multiple tables | `profiles.global_role` + `enabled_modules` |
| Niveaux | app_role enum | N0-N6 hiérarchique |
| Guards | `canViewScope()`, `getEffectivePermission()` | `RoleGuard`, `ModuleGuard` |
| Fichiers config | Multiples services | `roleMatrix.ts` unique |

### 1.3 Objectifs V2

- Simplifier drastiquement la gestion des permissions
- Éliminer la confusion entre multiple sources de vérité
- Faciliter l'attribution de droits par les admins
- Réduire la dette technique de ~70%

### 1.4 Détails techniques

**Frontend** :
- `src/config/roleMatrix.ts` : Matrice des capacités par rôle
- `src/types/globalRoles.ts` : Définition des 7 niveaux
- `src/components/auth/RoleGuard.tsx` : Guard par rôle minimum
- `src/components/auth/ModuleGuard.tsx` : Guard par module activé

**Backend** :
- `has_min_global_role(uid, level)` : Fonction SQL SECURITY DEFINER
- `has_support_access(uid)` : Vérifie accès support
- `has_franchiseur_access(uid)` : Vérifie accès franchiseur

**Base de données** :
- `profiles.global_role` : enum `global_role` (base_user → superadmin)
- `profiles.enabled_modules` : JSONB avec structure `{module: {enabled, options}}`

### 1.5 Tables/colonnes supprimées

```sql
-- Tables supprimées
DROP TABLE user_roles;
DROP TABLE user_permissions;
DROP TABLE group_permissions;
DROP TABLE role_permissions;
DROP TABLE user_capabilities;
DROP TABLE scopes;
DROP TABLE groups;
DROP TABLE roles;

-- Colonnes supprimées de profiles
-- group_id, role_id, system_role, support_level, service_competencies
```

### 1.6 État d'avancement

✅ Migration complète effectuée  
✅ Outils de migration retirés  
✅ Toutes les RLS policies migrées  
✅ Tests de non-régression validés

---

## 2. Support V2 — Nouveau Système

### 2.1 Statut : NOUVEAU MODULE

### 2.2 Différences vs `main`

| Aspect | `main` | `dev` (V2) |
|--------|--------|------------|
| Types tickets | `is_live_chat` boolean | `type` enum (chat_ai/chat_human/ticket) |
| Escalade | Flag simple | Transitions contrôlées |
| SLA | Manuel | Automatique (trigger) |
| IA | Basique | Classification auto + suggestions |

### 2.3 Objectifs V2

- Clarifier les flux de communication (IA → Humain → Ticket)
- Automatiser le calcul des SLA
- Intégrer l'IA pour classification et suggestions
- Améliorer la traçabilité des transitions

### 2.4 Détails techniques

**Frontend** :
- `src/services/support-transitions.ts` : Règles de transition
- `src/components/support/AIClassificationBadge.tsx`
- `src/components/support/AISuggestionPanel.tsx`
- `src/components/chatbot/ChatCloseDialog.tsx` : 3 options de fermeture

**Backend** :
- `support-auto-classify` : Edge function classification IA
- Trigger `calculate_ticket_due_at` : SLA automatique

**Base de données** :
- `support_tickets.type` : enum channel_type
- `support_tickets.due_at`, `sla_status` : Champs SLA
- `support_tickets.ai_*` : Champs classification IA
- `support_messages.is_system_message` : Messages système

### 2.5 Règles de transition

```
chat_ai → chat_human ✓
chat_ai → ticket ✓
chat_ai → resolved ✓
chat_human → ticket ✓
chat_human → resolved ✓
ticket → resolved ✓
ticket → closed ✓

chat_human → chat_ai ✗ (interdit)
ticket → chat_ai ✗ (interdit)
ticket → chat_human ✗ (interdit)
```

### 2.6 État d'avancement

✅ Architecture transitions complète  
✅ SLA automatique (P3#1)  
✅ Classification IA (P3#2)  
⚠️ Timeout 60s en cours de finalisation (P3#2 Phase 2)

---

## 3. Routes V2 — Restructuration

### 3.1 Statut : REFONTE COMPLÈTE

### 3.2 Nouvelle structure

```
/                           → Landing (Dashboard)
/academy                    → HUB Help Academy
  /academy/apogee           → Guide Apogée
  /academy/apporteurs       → Guide Apporteurs
  /academy/hc-base          → Base Documentaire
/hc-agency                  → HUB Pilotage Agence
  /hc-agency/statistiques   → Hub Statistiques
  /hc-agency/indicateurs/*  → Indicateurs détaillés
  /hc-agency/actions        → Actions à Mener
  /hc-agency/diffusion      → Mode TV
  /hc-agency/rh-tech        → Planning
  /hc-agency/equipe         → Équipe
/support                    → HUB Support
  /support/helpcenter       → Centre d'aide
  /support/mes-demandes     → Mes demandes
  /support/console          → Console SU
/hc-reseau                  → HUB Réseau Franchiseur
  /hc-reseau/dashboard      → Dashboard
  /hc-reseau/agences        → Agences
  /hc-reseau/animateurs     → Animateurs
  /hc-reseau/stats          → Statistiques
  /hc-reseau/redevances     → Redevances
/projects                   → HUB Gestion Projet
  /projects/kanban          → Kanban
  /projects/import*         → Imports
/admin                      → HUB Administration
  /admin/users              → Utilisateurs
  /admin/agencies           → Agences
  /admin/chatbot-rag        → RAG & IA
  /admin/system-health      → Système
```

### 3.3 Routes legacy supprimées/redirigées

```typescript
/apogee → /academy/apogee
/apporteurs → /academy/apporteurs
/helpconfort → /academy/hc-base
/mes-indicateurs → /hc-agency/indicateurs
/actions-a-mener → /hc-agency/actions
/diffusion → /hc-agency/diffusion
/mes-demandes → /support/mes-demandes
/tete-de-reseau → /hc-reseau/dashboard
/admin/apogee-tickets → /projects/kanban
/admin/documents → /admin/chatbot-rag
```

### 3.4 Fichier centralisé

`src/config/routes.ts` : Toutes les routes définies comme constantes typées

---

## 4. RAG V2 — Pipeline Unifié

### 4.1 Statut : REFONTE

### 4.2 Différences vs `main`

| Aspect | `main` | `dev` (V2) |
|--------|--------|------------|
| Pipeline | `rag-apogee.ts` | `rag-michu.ts` unique |
| Contextes | Limités | 7 contextes (apogee, apporteurs, etc.) |
| Prompt | Variable | SCALAR standardisé |

### 4.3 Contextes autorisés (stricts)

```typescript
type RAGContextType = 
  | 'apogee'      // Guide Apogée
  | 'apporteurs'  // Guide Apporteurs
  | 'helpconfort' // Base documentaire
  | 'metier'      // Connaissances métier
  | 'franchise'   // Réseau franchise
  | 'documents'   // Documents uploadés
  | 'auto';       // Détection automatique
```

### 4.4 État d'avancement

✅ Pipeline unifié  
✅ Multi-contextes  
✅ Interface admin complète  
✅ `rag-apogee.ts` supprimé définitivement

---

## 5. Sécurité P1 — Hardening Complet

### 5.1 Statut : TERMINÉ

### 5.2 Tickets P1 complétés

| Ticket | Description | Statut |
|--------|-------------|--------|
| P1#1 | JWT verification sur 17 Edge Functions | ✅ |
| P1#2 | CORS hardening (`_shared/cors.ts`) | ✅ |
| P1#3 | Rate limiting (`_shared/rateLimit.ts`) | ✅ |
| P1#4 | RLS audit initial | ✅ |
| P1#5 | RLS corrections complètes | ✅ |
| P1#6 | Intégration Sentry | ✅ |
| P1#7 | React Query robustness | ✅ (Lots 1-2) |

### 5.3 Configuration CORS

```typescript
const ALLOWED_ORIGINS = [
  'https://helpconfort.services',
  'http://localhost:5173',
  'http://localhost:8080',
  /\.lovableproject\.com$/,
  /\.lovable\.app$/,
];
```

### 5.4 Rate Limits

| Fonction | Limite |
|----------|--------|
| chat-guide | 30 req/min |
| search-embeddings | 30 req/min |
| get-kpis | 20 req/min |
| notify-* | 10 req/min |
| regenerate-* | 5 req/10min |

---

## 6. Gestion de Projet (ex-Apogée Tickets)

### 6.1 Statut : EXTENSION

### 6.2 Nouveautés V2

- **Routes** : Migration `/admin/apogee-tickets` → `/projects`
- **Permissions granulaires** : `kanban`, `manage`, `import` comme options module
- **Heat Priority** : Calcul automatique du score de priorité
- **PEC Slider** : Distribution Apogée ↔ HC sur 5 niveaux

### 6.3 Transitions par rôle

```typescript
// Exemple : developer peut avancer vers TESTING mais pas VALIDATED
developer: ['BACKLOG→TODO', 'TODO→IN_PROGRESS', 'IN_PROGRESS→TESTING']
tester: ['TESTING→VALIDATED', 'TESTING→IN_PROGRESS']
franchiseur: ['VALIDATED→DONE', 'ANY→CLOSED']
```

---

## 7. Points Critiques V2

### 7.1 À stabiliser avant production

| Élément | Priorité | Statut |
|---------|----------|--------|
| Permissions V2 complètes | CRITIQUE | ✅ |
| Support V2 transitions | HAUTE | ✅ |
| RLS policies audit | HAUTE | ✅ |
| Rate limiting | HAUTE | ✅ |
| P1#7 Lots restants | MOYENNE | ⚠️ En cours |

### 7.2 Modules sensibles

1. **Permissions** : Source unique de vérité critique
2. **Support V2** : Transitions strictes à maintenir
3. **API Apogée** : Isolation agences critique (pas de backend)
4. **RAG** : Contextes stricts à valider

### 7.3 Limitations connues

- API Apogée : Pas d'appels backend (CORS/IP restrictions)
- Multi-agences : Agrégation frontend uniquement
- Timeout chat : 60s manuel (Phase 2 en cours)

---

## 8. Migration main → dev

### 8.1 Checklist pré-merge

- [ ] Vérifier toutes les RLS policies
- [ ] Tester les 7 rôles (N0-N6)
- [ ] Valider les transitions Support V2
- [ ] Confirmer redirections legacy
- [ ] Audit Sentry pour erreurs

### 8.2 Rollback strategy

En cas de problème :
1. Les colonnes legacy n'ont PAS été supprimées de auth.users
2. Les routes legacy redirigent automatiquement
3. Les RLS policies ont des fallbacks

---

## 9. Nouvelles Fonctionnalités V2.1+ (Décembre 2025)

### 9.1 DocGen — Génération de Documents

**Statut** : ✅ LIVRÉ (v0.8.0)

Module complet de génération de documents professionnels (lettres, attestations, etc.).

| Composant | Description |
|-----------|-------------|
| `/rh/docgen` | Liste des templates et instances |
| `/rh/docgen/:instanceId` | Éditeur avec preview PDF live |
| `/admin/templates` | Studio de gestion des templates (N4+) |

**Caractéristiques** :
- Upload de templates DOCX avec tokens `{{NOM_TOKEN}}`
- Smart tokens auto-remplis (AGENCE_*, DIRIGEANT_*, COLLAB_*, DATE_*, USER_*)
- Wizard step-by-step pour les champs manuels
- Preview PDF en temps réel avec debounce
- Conversion DOCX→PDF via Gotenberg externe
- Versioning et publication des templates

**Tables** : `doc_templates`, `doc_template_fields`, `doc_instances`

**Edge Functions** : `parse-docx-tokens`, `documents-preview`, `documents-finalize`

---

### 9.2 Rapports Mensuels d'Activité

**Statut** : ✅ LIVRÉ

Génération automatique de rapports PDF pour les dirigeants d'agence.

| Composant | Description |
|-----------|-------------|
| `/admin/rapportactivite` | Console de configuration (N4+) |
| CRON `trigger-monthly-reports` | Génération auto le 10 du mois à 08:00 UTC |
| CRON `purge-old-reports` | Nettoyage des rapports >12 mois |

**Sections modulables** :
- Synthèse dirigeant (4 KPIs + trends M-1)
- CA analysis (univers, apporteurs, panier moyen)
- Pipeline (devis, conversion rates)
- Techniciens (CA attribué, productivité)
- Qualité (taux SAV, retours)
- Alertes & actions

**Tables** : `monthly_report_settings`, `monthly_report_history`

**Edge Functions** : `generate-monthly-report`, `trigger-monthly-reports`, `purge-old-reports`

---

### 9.3 Portail Apporteur

**Statut** : ✅ Phase 1-3 LIVRÉES, Phase 4 (Apogée) différée

Portail externe pour les prescripteurs (assurances, bailleurs, etc.).

| Route | Page | Description |
|-------|------|-------------|
| `/apporteur` | Login | Authentification séparée |
| `/apporteur/dashboard` | Dashboard | KPIs + bouton nouvelle demande |
| `/apporteur/dossiers` | Dossiers | Table des dossiers commanditaire |
| `/apporteur/demande` | Dialog | Formulaire nouvelle intervention |

**Architecture** :
- Authentification isolée via `ApporteurAuthContext` (hors N0-N6)
- Table `apporteur_users` avec liaison `user_id` Supabase Auth
- Liaison `apporteurs.apogee_client_id` → commanditaire Apogée
- Demandes d'intervention → notifications email via Resend

**Tables** : `apporteurs`, `apporteur_users`, `apporteur_project_links`, `apporteur_intervention_requests`, `apporteur_access_logs`

**Edge Functions** : `get-apporteur-dossiers`, `get-apporteur-stats`, `notify-apporteur-request`, `create-apporteur-user`, `search-apogee-commanditaires`, `validate-apogee-commanditaire`

---

### 9.4 Support V2 — Améliorations

**Statut** : ✅ LIVRÉ

Améliorations de la console support pour les agents.

| Fonctionnalité | Description |
|----------------|-------------|
| Affichage utilisateur | Nom/email de l'initiateur visible sur chaque ticket |
| Bouton "Développement" | Transformation ticket support → ticket Gestion de Projet |
| Fermeture automatique | Ticket support fermé lors de la transformation |
| Bouton désactivé | Grisé après transformation (empêche doublons) |
| Realtime | Notifications et statuts mis à jour instantanément |

**Flow "Développement"** :
1. Agent clique "Développement" sur un ticket support
2. Ticket Apogée créé avec référence croisée
3. Ticket support passé en `resolved`
4. Bouton grisé avec texte "Déjà traité"
5. Ticket visible dans onglet "Archivés"

---

### 9.5 Module RH Complet

**Statut** : ✅ P0-P2 LIVRÉS

| Phase | Fonctionnalité | Routes |
|-------|----------------|--------|
| P0 | Suivi RH back-office (N2) | `/rh/suivi`, `/rh/suivi/:id` |
| P1 | Portail salarié (N1) | `/rh/coffre`, `/rh/demande`, `/rh/mon-planning`, `/rh/signature` |
| P2 | Génération lettres EPI | Edge function `generate-rh-letter` |

**Tables** : `collaborators`, `collaborator_documents`, `collaborator_sensitive_data`, `rh_requests`, `rh_notifications`, `rh_letter_templates`, `user_signatures`

**Particularités** :
- Données sensibles chiffrées (SSN, contact urgence)
- Notifications bidirectionnelles (N1↔N2) en temps réel
- Workflow demandes unifié (LEAVE, EPI, DOCUMENT_REQUEST)
- Fusion automatique Profile ↔ Collaborator

---

## 10. Points Critiques V2.1+

### 10.1 Modules stabilisés

| Module | Version | Status |
|--------|---------|--------|
| Permissions V2 | 2.0 | ✅ Production |
| Support V2 | 2.1 | ✅ Production |
| RH | 1.0 | ✅ Production |
| DocGen | 1.0 | ✅ Production |
| Rapports Mensuels | 1.0 | ✅ Production |
| Portail Apporteur | 0.9 | ⚠️ Phase 4 (Apogée) différée |

### 10.2 Edge Functions critiques

| Fonction | Sécurité | Rate Limit |
|----------|----------|------------|
| `proxy-apogee` | JWT + Masquage données sensibles | 50 req/min |
| `get-client-contact` | JWT + Audit log | 10 req/min |
| `generate-monthly-report` | N2+ agency check | 5 req/min |
| `notify-apporteur-request` | Service role only | 10 req/min |
| `documents-preview` | JWT + Agency check | 20 req/min |

### 10.3 Prochaines priorités

1. **Phase 4 Apporteur** : Intégration Apogée (différée jusqu'à stabilisation P2.5+P3)
2. **Flow Builder** : `/admin/flow` - Concepteur de workflows (RT, bons intervention)
3. **StatIA Builder** : Métriques personnalisées

---

### 9.6 Module Pointages / Timesheets

**Statut** : ✅ LIVRÉ (v0.8.1)

Système complet de gestion des pointages techniciens avec workflow de validation.

| Route | Page | Description |
|-------|------|-------------|
| `/t/pointage` | Pointage N1 | Saisie hebdomadaire des heures |
| `/rh/timesheets` | Validation N2 | Traitement des pointages équipe |

**Workflow 5 états** :
```
DRAFT → SUBMITTED → N2_MODIFIED → COUNTERSIGNED → VALIDATED
              ↓           ↓              ↓
           VALIDATED    (N1 contre-signe)  ↓
              ↓                          VALIDATED
           (validation directe)
```

**Règles métier** :
- N1 saisit et soumet ses pointages hebdomadaires
- N2 peut valider directement, modifier, ou rejeter
- Si N2 modifie : N1 doit contre-signer avant validation finale
- Modifications N2 affichées en rouge avec différences calculées
- Entrées originales conservées pour audit

**Tables** : `timesheets` (user_id, agency_id, week_start, status, entries_original, entries_modified)

**Hooks** :
- `useTimesheets` : Pointages N1 (CRUD personnel)
- `useAgencyTimesheets` : Pointages agence N2 (liste + actions)

---

*Document V2 — Dernière mise à jour : 2025-12-17*
