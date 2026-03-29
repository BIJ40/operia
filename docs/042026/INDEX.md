# Documentation OPERIA — 29 mars 2026

> Dossier de référence complet pour la plateforme OPERIA

---

## Structure

| Dossier | Contenu |
|---------|---------|
| [01-architecture/](./01-architecture/) | Stack, flux de données, frontend, schéma DB |
| [02-permissions/](./02-permissions/) | Moteur V1, architecture V2, rôles, hiérarchie |
| [03-modules/](./03-modules/) | Catalogue 74+ modules, distribution, presets |
| [04-securite/](./04-securite/) | RLS, auth, chiffrement, audit |
| [05-api-integrations/](./05-api-integrations/) | Apogée API, services externes |
| [06-engines-metier/](./06-engines-metier/) | StatIA, Performance, Prospection, DocGen |
| [07-saas-commercial/](./07-saas-commercial/) | Plans, options, Stripe, migration V2 |
| [08-deploiement/](./08-deploiement/) | Build, deploy, conventions, tests |
| [09-notifications/](./09-notifications/) | Architecture notifications unifiées |
| [10-manuel-utilisateur/](./10-manuel-utilisateur/) | Manuel complet (utilisateur + admin + dev) |

---

## Documents par sous-dossier

### 01 — Architecture
- `ARCHITECTURE.md` — Architecture globale, stack, flux, Edge Functions
- `FRONTEND_STRUCTURE.md` — Arborescence src/, navigation, guards, conventions
- `DATABASE_SCHEMA.md` — Tables, relations, RLS, fonctions SQL

### 02 — Permissions
- `MOTEUR_PERMISSIONS_V1.md` — Système actuel (RPC, cascade, limites)
- `DOC_PERMISSIONS_V2.md` — Architecture V2 cible (9 tables, RPC unique)
- `SCHEMA_DB_V2.md` — Schéma détaillé des 9 tables V2
- `ROLES_ET_HIERARCHIE.md` — N0-N6, postes N1, interfaces de rôle
- `PATCH_V1_CHANGELOG.md` — Correctifs RPC V1

### 03 — Modules
- `MODULES_CATALOG.md` — Catalogue actuel (arbre, plans, options, presets)
- `MODULES_CATALOG_V2.md` — Distribution V2 cible
- `LEGACY_V1_REFERENCE.md` — Référence keys legacy, fichiers à supprimer

### 04 — Sécurité
- `SECURITE_GLOBALE.md` — RLS, auth, chiffrement, Edge, audit
- `SECURITE_PERMISSIONS.md` — Sécurité spécifique permissions V2

### 05 — API & Intégrations
- `APOGEE_API.md` — Endpoints, sync, shadow mirror, fiabilité
- `SERVICES_EXTERNES.md` — Resend, Mapbox, OpenAI, Gotenberg, Stripe, Sentry

### 06 — Engines métier
- `STATIA_ENGINE.md` — Statistiques centralisées, métriques, builder
- `PERFORMANCE_ENGINE.md` — Performance terrain, 51 tests
- `PROSPECTION_ENGINE.md` — CRM, scoring, pipeline
- `DOCGEN_ENGINE.md` — Génération DOCX/PDF

### 07 — SaaS Commercial
- `SAAS_COMMERCIAL.md` — Plans STARTER/PRO, options, Stripe
- `MIGRATION_PLAN_V2.md` — 15 phases, 17-20 sessions

### 08 — Déploiement
- `DEPLOIEMENT.md` — Build, Docker, env vars, setup local
- `CONVENTIONS.md` — Nommage, NO_POPUP, logger, règles
- `TESTS.md` — Vitest, Playwright, seed users, scénarios

### 09 — Notifications
- `NOTIFICATIONS.md` — unified_notifications, canaux, préférences

### 10 — Manuel utilisateur
- `MANUEL_OPERIA.md` — Guide complet utilisateur + admin + développeur

---

## Décisions métier verrouillées

1. **Délégation** : N1 ⊆ enveloppe délégable de l'agence (plan + options)
2. **Sections** : structure/navigation uniquement, jamais permissionnées
3. **Ticketing** : `via_user_assignment = true` uniquement, jamais dans un plan
4. **Cumul de modes** : un module peut être via_plan + via_agency_option + via_user_assignment
5. **Deny explicite** : `granted = false` bloque tout sauf bypass N5+
6. **Stripe facture, ne décide pas** : la DB est la vérité des droits
7. **Presets poste** : les N1 reçoivent des modules par défaut selon leur poste
