# Documentation V2 — 28 mars 2026

> Dossier de référence complet pour la refonte Permissions + Catalogue SaaS

---

## Documents

| Fichier | Contenu |
|---------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture globale Operia (stack, navigation, données, edge functions, sécurité) |
| [DOC_PERMISSIONS_V2.md](./DOC_PERMISSIONS_V2.md) | Système de permissions V2 complet (9 tables, RPC, décisions métier, frontend) |
| [SCHEMA_DB_V2.md](./SCHEMA_DB_V2.md) | Schéma détaillé des 9 tables V2 avec colonnes, types, FK, contraintes |
| [MODULES_CATALOG_V2.md](./MODULES_CATALOG_V2.md) | Catalogue des 74 modules (arbre, distribution STARTER/PRO, presets poste) |
| [ROLES_ET_HIERARCHIE.md](./ROLES_ET_HIERARCHIE.md) | Hiérarchie N0-N6, postes N1, interfaces de rôle, délégation N2→N1 |
| [SAAS_COMMERCIAL.md](./SAAS_COMMERCIAL.md) | Modèle commercial (plans, options, Stripe, facturation) |
| [MIGRATION_PLAN_V2.md](./MIGRATION_PLAN_V2.md) | Plan de migration 15 phases (17-20 sessions), rollback |
| [SECURITE_PERMISSIONS.md](./SECURITE_PERMISSIONS.md) | Sécurité (RLS, anti-escalade, audit trail, checklist) |
| [LEGACY_V1_REFERENCE.md](./LEGACY_V1_REFERENCE.md) | Référence V1 (tables, fichiers TS, problèmes, legacy keys) |

---

## Décisions métier verrouillées

1. **Délégation** : N1 ⊆ enveloppe délégable de l'agence (plan + options), pas ⊆ permissions effectives du N2
2. **Sections** : structure/navigation uniquement, jamais permissionnées
3. **Ticketing** : `via_user_assignment = true` uniquement, jamais dans un plan
4. **Cumul de modes** : un module peut être via_plan + via_agency_option + via_user_assignment
5. **Deny explicite** : `granted = false` bloque tout sauf bypass N5+
6. **Stripe facture, ne décide pas** : la DB est la vérité des droits
7. **Presets poste** : les N1 reçoivent des modules par défaut selon leur poste, ajustables par N2

---

## Estimation

**17-20 sessions** — 15 phases de la migration DB à la suppression du code legacy.

Phase la plus risquée : **Phase 11** (migration des composants consommateurs frontend, 3-5 sessions).
