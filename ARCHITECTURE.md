# Architecture du Projet GLOBAL / Apogée

> **Version** : 2.0  
> **Dernière mise à jour** : Décembre 2025  
> **Branche de référence** : `dev`

---

## 1. Objectif du Projet

**GLOBAL / Apogée** est une plateforme SaaS B2B destinée au réseau de franchises HelpConfort. Elle centralise :

- 📚 **Documentation métier** : Guides Apogée, Apporteurs, HelpConfort
- 🤖 **Assistant IA** : Chatbot Mme MICHU avec RAG
- 📊 **Pilotage** : KPIs temps réel via API Apogée
- 🎫 **Support** : Chat IA/humain + tickets avec SLA
- 🏢 **Multi-agences** : Dashboard réseau pour franchiseurs
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
| **Monitoring** | Sentry |
| **Déploiement** | Lovable Cloud |

### 2.2 Services Externes

| Service | Usage |
|---------|-------|
| API Apogée | Données CRM (clients, dossiers, factures) |
| Lovable AI | Chat IA (streaming) |
| OpenAI | Génération embeddings |

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
| N1 | `franchisee_user` | + Support, favoris |
| N2 | `franchisee_admin` | + Pilotage agence |
| N3 | `franchisor_user` | + Réseau (animateur) |
| N4 | `franchisor_admin` | + Redevances (directeur) |
| N5 | `platform_admin` | + Administration |
| N6 | `superadmin` | Accès total |

### 4.3 Modules Activables

```typescript
enabled_modules: {
  help_academy: { enabled: true, options: { apogee: true, apporteurs: true } },
  pilotage_agence: { enabled: true },
  support: { enabled: true, options: { agent: false } },
  apogee_tickets: { enabled: false, options: { kanban: true, manage: false } },
  // ...
}
```

### 4.4 Fonctions SQL (RLS)

```sql
has_min_global_role(uid, level)  -- Vérifie rôle minimum
has_support_access(uid)          -- Accès console support
has_franchiseur_access(uid)      -- Accès réseau
get_user_agency(uid)             -- Agence de l'utilisateur
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
                  ↓
              Résolution
```

**Règles de transition** :
- `chat_ai` → `chat_human` | `ticket` | `resolved` ✓
- `chat_human` → `ticket` | `resolved` ✓
- `chat_human` → `chat_ai` ✗ (interdit)
- `ticket` → `chat_*` ✗ (interdit)

### 5.3 API Apogée

```
AgencyContext → setApiBaseUrl(agence)
                      ↓
    https://{agence}.hc-apogee.fr/api/
                      ↓
              POST + API_KEY partagée
                      ↓
              Calculs frontend (utils/)
                      ↓
              Indicateurs
```

> ⚠️ **Limitation** : API Apogée rejette les appels backend (CORS/IP). Tout passe par le frontend.

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

### 7.2 Policies RLS Critiques

```sql
-- Accès par rôle minimum
USING (has_min_global_role(auth.uid(), 5))

-- Isolation agence
USING (agency_id = get_user_agency(auth.uid()))

-- Accès support
USING (user_id = auth.uid() OR has_support_access(auth.uid()))
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

### 9.1 V2 Livrée

✅ Permissions V2 (global_role + enabled_modules)  
✅ Support V2 (chat_ai/chat_human/ticket + SLA)  
✅ Routes V2 (hub pages par section)  
✅ RAG unifié (multi-contextes)  
✅ Sécurité P1 (JWT, CORS, rate limit, RLS)  
✅ Sentry intégré  

### 9.2 En Cours

⚠️ P1#7 Lots 3+ (safeQuery migration)  
⚠️ Support V2 timeout 60s  

### 9.3 À Venir

📅 Thématisation support  
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

### A. Documentation Complète

- `docs/historique-developpements.md` — Historique complet
- `docs/historique-developpements-v2.md` — Focus V2
- `docs/manuel-information-global.md` — Manuel utilisateur
- `docs/guide-technique-global.md` — Guide développeur
- `docs/support-commercial-saas.md` — Support commercial

### B. Fichiers de Configuration

| Fichier | Rôle |
|---------|------|
| `src/config/routes.ts` | Routes centralisées |
| `src/config/navigation.ts` | Navigation sidebar |
| `src/config/roleMatrix.ts` | Matrice permissions |
| `src/config/dashboardTiles.ts` | Tuiles dashboard |
| `supabase/config.toml` | Config Edge Functions |

---

*Architecture GLOBAL / Apogée — Version 2.0*
