# Architecture du Projet GLOBAL / Apogée

> **Version** : 2.2  
> **Dernière mise à jour** : 26 Janvier 2026  
> **Branche de référence** : `main`

---

## 1. Objectif du Projet

**GLOBAL / Apogée** est une plateforme SaaS B2B destinée au réseau de franchises HelpConfort. Elle centralise :

- 📚 **Documentation métier** : Guides Apogée, Apporteurs, HelpConfort
- 🤖 **Assistant IA** : Chatbot Mme MICHU avec RAG
- 📊 **Pilotage** : KPIs temps réel via API Apogée + StatIA
- 🎫 **Support** : Chat IA/humain + tickets avec SLA
- 🏢 **Multi-agences** : Dashboard réseau pour franchiseurs
- 👷 **RH & Parc** : Gestion collaborateurs, véhicules, EPI
- 📄 **DocGen** : Génération documents personnalisés
- 🏠 **Portail Apporteurs** : Espace externe pour gestionnaires/bailleurs
- 📈 **Rapports Mensuels** : Génération automatique rapports d'activité
- ⚙️ **Administration** : Gestion utilisateurs, contenus, système

---

## 2. Vue d'Ensemble Technique

### 2.1 Stack

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query, React Context |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **IA** | Lovable AI Gateway (Gemini 2.5), OpenAI (embeddings) |
| **PDF** | Gotenberg (DOCX→PDF), pdf-lib |
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

---

## 3. Découpage par Domaines

### 3.1 Structure des Dossiers

```
src/
├── pages/                    # Pages principales
├── components/               # Composants réutilisables
│   ├── ui/                   # shadcn/ui
│   ├── layout/               # MainLayout, Header, Sidebar
│   ├── auth/                 # Guards (RoleGuard, ModuleGuard)
│   └── ...
├── apogee-connect/           # Module indicateurs
├── franchiseur/              # Module réseau
├── apogee-tickets/           # Module gestion projet
├── apporteur/                # Portail apporteurs externes
├── statia/                   # Moteur statistiques centralisé
├── contexts/                 # Contextes React
├── hooks/                    # Custom hooks
├── lib/                      # Utilitaires
├── config/                   # Configuration centralisée
└── types/                    # Types TypeScript

supabase/
├── functions/                # Edge Functions (Deno)
│   └── _shared/              # Helpers (CORS, rate limit, Sentry)
└── migrations/               # Migrations SQL
```

### 3.2 Modules Applicatifs

| Module | Route racine | Description |
|--------|--------------|-------------|
| Help Academy | `/academy` | Guides documentaires |
| Pilotage | `/hc-agency` | KPIs et indicateurs agence |
| Support | `/support` | Chat et tickets |
| Réseau | `/hc-reseau` | Multi-agences franchiseur |
| Projets | `/projects` | Gestion tickets internes |
| RH & Parc | `/rh` | Collaborateurs, véhicules, EPI |
| DocGen | `/rh/docgen` | Génération documents |
| Portail Apporteurs | `/apporteur` | Espace externe apporteurs |
| Admin | `/admin` | Administration plateforme |

---

## 4. Système de Permissions V2

### 4.1 Architecture

```
profiles.global_role (N0-N6)
         ↓
     ROLE_MATRIX (src/config/roleMatrix.ts)
         ↓
     RoleGuard / ModuleGuard
         ↓
     Accès page/fonctionnalité
```

### 4.2 Hiérarchie des Rôles

| Niveau | Rôle | Capacités |
|--------|------|-----------|
| N0 | `base_user` | Lecture guides |
| N1 | `franchisee_user` | + Support, favoris, Espace salarié |
| N2 | `franchisee_admin` | + Pilotage agence, RH, DocGen |
| N3 | `franchisor_user` | + Réseau (animateur) |
| N4 | `franchisor_admin` | + Redevances, Templates (directeur) |
| N5 | `platform_admin` | + Administration |
| N6 | `superadmin` | Accès total |

### 4.3 Modules Activables

```typescript
enabled_modules: {
  help_academy: { enabled: true, options: { apogee: true, apporteurs: true } },
  pilotage_agence: { enabled: true },
  support: { enabled: true, options: { agent: false } },
  apogee_tickets: { enabled: false, options: { kanban: true, manage: false } },
  rh_parc: { enabled: true, options: { rh: true, parc: true } },
  // ...
}
```

### 4.4 Fonctions SQL (RLS)

```sql
has_min_global_role(uid, level)  -- Vérifie rôle minimum
has_support_access(uid)          -- Accès console support
has_franchiseur_access(uid)      -- Accès réseau
get_user_agency(uid)             -- Agence de l'utilisateur
is_apporteur_user(uid)           -- Est utilisateur apporteur
```

---

## 5. Flux de Données Majeurs

### 5.1 RAG Pipeline (Chatbot)

```
Blocs guides → Chunking → Embeddings (OpenAI)
                              ↓
                        guide_chunks
                              ↓
Question → search-embeddings → Top-K chunks
                              ↓
                     chat-guide (Lovable AI)
                              ↓
                        Réponse IA
```

### 5.2 Support V2

```
Utilisateur → Chat IA (chat_ai)
                  ↓ [escalade]
              Chat Humain (chat_human)
                  ↓ [conversion]
              Ticket (ticket)
                  ↓ [développement]
              Ticket Apogée (apogee_tickets)
                  ↓
              Résolution
```

**Règles de transition** :
- `chat_ai` → `chat_human` | `ticket` | `resolved` ✓
- `chat_human` → `ticket` | `resolved` ✓
- `chat_human` → `chat_ai` ✗ (interdit)
- `ticket` → `apogee_tickets` ✓ (développement)
- `ticket` → `chat_*` ✗ (interdit)

### 5.3 API Apogée

```
AgencyContext → setApiBaseUrl(agence)
                      ↓
    https://{agence}.hc-apogee.fr/api/
                      ↓
              POST + API_KEY partagée
                      ↓
              StatIA (calculs centralisés)
                      ↓
              Indicateurs
```

> ⚠️ **Limitation** : API Apogée rejette les appels backend (CORS/IP). Tout passe par le frontend.

### 5.4 StatIA (Moteur Statistiques)

```
src/statia/
├── api/                    # getMetric, getMetricForAgency
├── definitions/            # Métriques core (CA, SAV, Devis...)
├── domain/rules.ts         # STATIA_RULES (source de vérité)
├── engine/                 # Calculs, loaders, normalizers
└── hooks/                  # useStatia, useStatiaMetric
```

**Règles métier clés** :
- CA source : `apiGetFactures.data.totalHT`
- Types productifs : dépannage, travaux
- SAV : dossier lié, CA=0, excludeFromTechStats
- RT ne génère jamais de CA technicien

### 5.5 DocGen Pipeline

```
Template DOCX → parse-docx-tokens → Token extraction
                                         ↓
                                  Smart tokens auto-fill
                                         ↓
                           User input (manual tokens)
                                         ↓
                      documents-preview → Gotenberg → PDF preview
                                         ↓
                      documents-finalize → Final DOCX/PDF
```

### 5.6 Portail Apporteurs

```
Apporteur User → ApporteurAuthContext
                        ↓
              get-apporteur-dossiers (via commanditaireId)
                        ↓
              Dossiers / Stats / Demandes
                        ↓
              notify-apporteur-request → Email agence
```

---

## 6. Edge Functions

| Fonction | Rôle | Rate Limit |
|----------|------|------------|
| `chat-guide` | Chat IA avec RAG | 30/min |
| `search-embeddings` | Recherche vectorielle | 30/min |
| `generate-embeddings` | Génération embeddings | 10/min |
| `create-user` | Création utilisateur | 10/min |
| `delete-user` | Suppression utilisateur | 5/min |
| `reset-user-password` | Reset mot de passe | 10/min |
| `notify-support-ticket` | Notification ticket | 10/min |
| `support-auto-classify` | Classification IA | 20/min |
| `parse-docx-tokens` | Extraction tokens DOCX | 10/min |
| `documents-preview` | Génération preview PDF | 10/min |
| `documents-finalize` | Finalisation documents | 10/min |
| `get-apporteur-dossiers` | Dossiers apporteur | 20/min |
| `get-apporteur-stats` | Stats apporteur | 20/min |
| `notify-apporteur-request` | Notification demande | 10/min |
| `generate-monthly-report` | Rapport mensuel PDF | 5/min |

**Configuration** : `verify_jwt = true` sur toutes les fonctions.

---

## 7. Base de Données

### 7.1 Tables Principales

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs (global_role, enabled_modules, agence) |
| `blocks` | Contenus guides Apogée |
| `apporteur_blocks` | Contenus guides Apporteurs |
| `guide_chunks` | Index RAG (embeddings) |
| `support_tickets` | Tickets support (type, status, SLA) |
| `support_messages` | Messages tickets |
| `apogee_agencies` | Configuration agences |
| `apogee_tickets` | Tickets gestion projet |
| `franchiseur_roles` | Rôles franchiseur |
| `franchiseur_agency_assignments` | Associations animateur-agence |
| `collaborators` | Collaborateurs RH |
| `collaborator_documents` | Documents collaborateurs |
| `rh_requests` | Demandes RH (congés, EPI, documents) |
| `rh_notifications` | Notifications RH temps réel |
| `doc_templates` | Templates DocGen |
| `doc_instances` | Documents générés |
| `apporteurs` | Organisations apporteurs |
| `apporteur_users` | Utilisateurs apporteurs |
| `apporteur_intervention_requests` | Demandes intervention |
| `report_settings` | Configuration rapports mensuels |

### 7.2 Policies RLS Critiques

```sql
-- Accès par rôle minimum
USING (has_min_global_role(auth.uid(), 5))

-- Isolation agence
USING (agency_id = get_user_agency(auth.uid()))

-- Accès support
USING (user_id = auth.uid() OR has_support_access(auth.uid()))

-- Accès apporteur
USING (is_apporteur_user(auth.uid()))
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
| Sensitive data masking | ✅ Email/tel/adresse masqués |
| Audit logs | ✅ Accès données sensibles |
| CRON secret validation | ✅ Jobs planifiés |

### 8.2 Origines CORS Autorisées

```typescript
'https://helpconfort.services'
'http://localhost:5173'
'http://localhost:8080'
/\.lovableproject\.com$/
/\.lovable\.app$/
```

---

## 9. État Actuel & Roadmap

### 9.1 V2.2 Livrée (Janvier 2026)

✅ Guide Apogée Public (/guide-apogee)  
✅ Interface multi-onglets navigateur  
✅ Suppression portail salarié N1  
✅ Simplification gestion collaborateurs  
✅ Permissions V2 (global_role + enabled_modules)  
✅ Support unifié (apogee_tickets)  
✅ StatIA (moteur statistiques centralisé)  
✅ RH & Parc (collaborateurs, documents)  
✅ DocGen (génération documents DOCX/PDF)  
✅ Portail Apporteurs  
✅ Rapports Mensuels  

### 9.2 En Cours

⚠️ Guide public version complète (tickets, FAQ)  
⚠️ Flow Builder (éditeur workflows)  

### 9.3 À Venir

📅 Notifications push  
📅 Application mobile  

---

## 10. Conventions

### 10.1 Nommage

```
Pages:      PascalCase.tsx
Components: PascalCase.tsx
Hooks:      use-kebab-case.ts
Utils:      camelCase.ts
Config:     camelCase.ts
```

### 10.2 Ajout de Module

1. Créer dossier `src/module-name/`
2. Ajouter routes dans `src/config/routes.ts`
3. Ajouter navigation dans `src/config/navigation.ts`
4. Ajouter routes dans `src/App.tsx` avec guards
5. Créer migrations si tables nécessaires
6. Documenter ici

---

## Annexes

### A. Documentation

- `DOC_PERMISSIONS.md` — Système de permissions V2
- `DOC_LOGS.md` — Système de logging
- `docs/support-levels.md` — Niveaux support SA1-SA3
- `docs/support-commercial-saas.md` — Support commercial
- `src/statia/README.md` — Documentation StatIA

### B. Fichiers de Configuration

| Fichier | Rôle |
|---------|------|
| `src/config/routes.ts` | Routes centralisées |
| `src/config/navigation.ts` | Navigation sidebar |
| `src/config/roleMatrix.ts` | Matrice permissions |
| `src/config/dashboardTiles.ts` | Tuiles dashboard |
| `src/statia/domain/rules.ts` | Règles métier StatIA |
| `supabase/config.toml` | Config Edge Functions |

---

*Architecture GLOBAL / Apogée — Version 2.2*
