# Sécurité du Système de Permissions — V2

> **Date** : 28 mars 2026

---

## 1. Principes de sécurité

### Fail-closed

Tout module absent de `module_catalog` ou non résolu par la RPC = **refusé**.  
Aucun fallback permissif. Aucun `COALESCE(..., true)`.

### Bypass limité

Seuls les rôles N5+ (`platform_admin`, `superadmin`) contournent le système de modules.  
Aucun autre rôle ne peut bypasser les contrôles.

### Deny explicite

Un `user_access.granted = false` retire tout accès, quelle que soit la source (plan, option, preset).  
**Exception** : les N5+ sont immunisés contre les deny explicites.

### Rôles séparés

Les rôles ne sont **jamais** stockés directement dans la table `profiles`.  
Si des rôles supplémentaires sont nécessaires, ils utilisent une table séparée (anti-escalade de privilèges).

---

## 2. RLS (Row Level Security)

### Tables V2 — Politiques prévues

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|---------------------|
| `module_catalog` | Tous (authentifiés) | N4+ uniquement |
| `module_distribution_rules` | Tous (authentifiés) | N4+ uniquement |
| `plan_catalog` | Tous (authentifiés) | N4+ uniquement |
| `plan_module_grants` | Tous (authentifiés) | N4+ uniquement |
| `agency_plan` | Membres agence ou N4+ | N4+ uniquement |
| `agency_module_entitlements` | Membres agence ou N4+ | N4+ uniquement |
| `user_access` | L'utilisateur lui-même ou N2+ même agence ou N4+ | N2+ même agence (délégation) ou N4+ |
| `job_profile_presets` | Tous (authentifiés) | N4+ uniquement |
| `billing_catalog` | N4+ uniquement | N4+ uniquement |

### Principe directeur

- **Lecture** : large (le frontend a besoin de connaître le catalogue pour afficher correctement)
- **Écriture** : strictement réservée aux admins

---

## 3. Protection contre les attaques

### Escalade de privilèges

| Vecteur | Protection |
|---------|-----------|
| Modifier son propre `global_role` | RLS interdit UPDATE sur `profiles.global_role` sauf N4+ |
| Créer un `user_access` pour soi-même | RLS : seul N2+ de la même agence ou N4+ peut INSERT |
| Contourner un deny explicite | Impossible côté DB — la RPC applique le deny avant tout |
| Accéder aux modules d'une autre agence | `agency_id` vérifié dans la RPC |

### Injection de données

| Vecteur | Protection |
|---------|-----------|
| `module_key` invalide dans `user_access` | FK vers `module_catalog` — rejeté si inexistant |
| `plan_key` invalide dans `agency_plan` | FK vers `plan_catalog` — rejeté si inexistant |
| `source` non standard dans `user_access` | CHECK constraint — valeurs énumérées |

---

## 4. Audit trail

### Traçabilité des modifications

| Action | Tracé par |
|--------|-----------|
| Modification `user_access` | `granted_by`, `granted_at` |
| Activation option agence | `activated_by`, `activated_at` |
| Changement de plan agence | `activity_log` |
| Délégation N2→N1 | `delegated_by` dans `user_access` |

### Recommandations futures

- [ ] Trigger `activity_log` sur INSERT/UPDATE/DELETE de `user_access`
- [ ] Trigger `activity_log` sur changement de `agency_plan.plan_key`
- [ ] Alerte si un N4+ modifie les droits d'un autre N4+

---

## 5. Rollback et continuité

### En cas de problème V2

1. Désactiver `USE_PERMISSIONS_V2` → retour immédiat à V1
2. Tables V1 intactes → aucune perte de données
3. Si nécessaire, DROP tables V2 (script prêt)

### En cas de compromission

1. `user_access.granted = false` pour bloquer un utilisateur spécifique
2. `agency_plan.status = 'suspended'` pour suspendre une agence entière
3. Logs dans `activity_log` pour investigation

---

## 6. Checklist sécurité pré-bascule

- [ ] RLS activé sur les 9 tables V2
- [ ] Aucune table sans politique RLS
- [ ] FK contraintes validées (module_key, plan_key, user_id)
- [ ] CHECK constraints validés (source, node_type, access_level)
- [ ] Matrice V1 vs V2 — aucun user ne gagne des droits non prévus
- [ ] Deny explicite testé : un `granted = false` bloque effectivement
- [ ] Bypass N5+ testé : un N5 accède à tout malgré deny
- [ ] N1 sans délégation testé : aucun module plan reçu directement
- [ ] User sans agence testé : aucun module agence reçu
