# OPERIA — Plateforme SaaS de gestion pour réseaux de franchises 

> **Version** : Production — 29 mars 2026
> **Stack** : React 18 + Vite + TypeScript + Supabase + 100+ Edge Functions

---

## 🚀 Qu'est-ce qu'OPERIA ?

OPERIA est une plateforme SaaS complète pour la gestion de réseaux de franchises dans le secteur des services à domicile. Elle centralise :

- **Pilotage** : Dashboard agence, statistiques (StatIA), performance terrain, KPI, cartes, trésorerie, rentabilité
- **Commercial** : Suivi clients, comparateur, prospection CRM, réalisations, signature commerciale, social media
- **Organisation** : RH/salariés, plannings, réunions, parc véhicules/EPI, médiathèque, documents
- **Support** : Guides (Help! Academy), aide en ligne (Helpi), ticketing
- **Réseau** : Dashboard franchiseur, gestion agences, redevances, KPI réseau
- **Admin** : Gestion utilisateurs, permissions, offres SaaS

---

## 📦 Installation

```bash
npm install
npm run dev        # Développement
npm run build      # Production
```

### Variables d'environnement requises

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
```

---

## 📚 Documentation

Toute la documentation est dans [`docs/042026/`](./docs/042026/INDEX.md) :

| Dossier | Contenu |
|---------|---------|
| `01-architecture/` | Stack, flux données, frontend, DB |
| `02-permissions/` | Moteur permissions V1 + V2, rôles N0-N6 |
| `03-modules/` | Catalogue 74+ modules, plans, presets |
| `04-securite/` | RLS, auth, chiffrement |
| `05-api-integrations/` | Apogée API, services externes |
| `06-engines-metier/` | StatIA, Performance, Prospection, DocGen |
| `07-saas-commercial/` | Plans SaaS, migration V2 |
| `08-deploiement/` | Build, Docker, conventions, tests |
| `09-notifications/` | Notifications unifiées |
| `10-manuel-utilisateur/` | Manuel complet |

---

## 🏗️ Architecture

```
Frontend SPA (React/Vite) → Supabase (PostgreSQL + Edge Functions) → APIs externes (Apogée, Stripe, Resend...)
```

Voir [`docs/042026/01-architecture/ARCHITECTURE.md`](./docs/042026/01-architecture/ARCHITECTURE.md) pour le détail complet.

---

## 🔐 Sécurité

- RLS sur toutes les tables
- Hiérarchie N0-N6 avec plafonnement N-1
- Fail-closed (module absent = refusé)
- Chiffrement AES-256-GCM données sensibles

---

## 🚀 Déploiement

- **Lovable Cloud** : build et deploy automatiques
- **Self-hosted** : Docker + Nginx (`docker build && docker run -p 80:80`)
- **URL Production** : `operiav2.lovable.app`

---

## 📄 Licence

Usage interne — Apogée / HELPCONFORT
