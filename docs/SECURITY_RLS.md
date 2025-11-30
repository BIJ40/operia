# Documentation RLS - Sécurité Multi-tenant

> Dernière mise à jour : 2025-11-30

## Vue d'ensemble

Ce document décrit les Row Level Security (RLS) policies appliquées aux tables sensibles de l'application. Toutes les tables utilisent RLS pour garantir l'isolation des données entre utilisateurs, agences et rôles.

## Modèle de rôles globaux (N0-N6)

| Niveau | Rôle | Description |
|--------|------|-------------|
| N0 | `base_user` | Utilisateur de base |
| N1 | `franchisee_user` | Utilisateur franchisé |
| N2 | `franchisee_admin` | Admin franchisé (dirigeant agence) |
| N3 | `franchisor_user` | Utilisateur réseau (animateur) |
| N4 | `franchisor_admin` | Admin réseau (directeur) |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Super administrateur |

## Fonctions de sécurité

```sql
-- Vérifie si un utilisateur a au moins le niveau de rôle spécifié
has_min_global_role(user_id uuid, min_level integer) → boolean

-- Vérifie l'accès au module support
has_support_access(user_id uuid) → boolean

-- Vérifie l'accès franchiseur
has_franchiseur_access(user_id uuid) → boolean

-- Récupère l'agence d'un utilisateur
get_user_agency(user_id uuid) → text
```

---

## Tables et policies RLS

### 1. `profiles` (Profils utilisateurs)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Propre profil OU N3+ | Tous (self), N3+ (global) |
| UPDATE | Propre profil OU N5+ | Tous (self), N5+ (global) |
| INSERT | Via trigger auth.users | Système uniquement |
| DELETE | Non autorisé | Aucun |

### 2. `apogee_agencies` (Agences)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Propre agence OU N5+ OU support OU franchiseur | N0-N2 (propre), N3+ (global) |
| INSERT | N5+ uniquement | platform_admin+ |
| UPDATE | N5+ uniquement | platform_admin+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 3. `agency_collaborators` (Collaborateurs agence)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Propre agence OU N3+ | N0-N2 (propre), N3+ (global) |
| INSERT | Propre agence (N2+) OU N3+ | franchisee_admin+, franchisor+ |
| UPDATE | Propre agence (N2+) OU N3+ | franchisee_admin+, franchisor+ |
| DELETE | N3+ uniquement | franchisor_user+ |

### 4. `apogee_guides` (Guides Apogée) ✅ CORRIGÉ

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Utilisateur authentifié | Tous authentifiés |
| INSERT | N4+ uniquement | franchisor_admin+ |
| UPDATE | N4+ uniquement | franchisor_admin+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 5. `planning_signatures` (Signatures planning) ✅ CORRIGÉ

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Utilisateur authentifié | Tous authentifiés |
| INSERT | Signataire concerné OU N3+ | Self, franchisor_user+ |
| UPDATE | Signataire concerné OU N3+ | Self, franchisor_user+ |
| DELETE | Signataire concerné OU N3+ | Self, franchisor_user+ |

### 6. `support_tickets` (Tickets support)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Propre ticket OU support OU N3+ | Créateur, support, franchisor+ |
| INSERT | Utilisateur authentifié | Tous authentifiés |
| UPDATE | Propre ticket OU support | Créateur, support+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 7. `support_messages` (Messages support)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Messages de ses tickets OU support | Créateur ticket, support+ |
| INSERT | Créateur ticket OU support | Créateur ticket, support+ |
| UPDATE | Non autorisé | Aucun |
| DELETE | Non autorisé | Aucun |

### 8. `support_attachments` (Pièces jointes support) ✅ CORRIGÉ

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Attachments de ses tickets OU support | Créateur ticket, support+ |
| INSERT | Créateur du ticket OU N3+ | Créateur ticket, franchisor_user+ |
| UPDATE | Non autorisé | Aucun |
| DELETE | Non autorisé | Aucun |

### 9. `apogee_tickets` (Tickets Apogée)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| INSERT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| UPDATE | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| DELETE | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |

### 10. `apogee_ticket_attachments` (Pièces jointes Apogée) ✅ CORRIGÉ

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| INSERT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| UPDATE | Non autorisé | Aucun |
| DELETE | Propriétaire OU N5+ | Uploader, platform_admin+ |

### 11. `apogee_ticket_comments` (Commentaires tickets)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| INSERT | Module apogee_tickets activé OU N5+ | Module users, platform_admin+ |
| UPDATE | Non autorisé | Aucun |
| DELETE | Non autorisé | Aucun |

### 12. `blocks` / `apporteur_blocks` (Contenus guides)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Utilisateur authentifié | Tous authentifiés |
| INSERT | N5+ uniquement | platform_admin+ |
| UPDATE | N5+ uniquement | platform_admin+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 13. `guide_chunks` (Index RAG)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Utilisateur authentifié | Tous authentifiés |
| INSERT | N5+ uniquement | platform_admin+ |
| UPDATE | N5+ uniquement | platform_admin+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 14. `documents` (Documents)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Utilisateur authentifié | Tous authentifiés |
| INSERT | N5+ uniquement | platform_admin+ |
| UPDATE | N5+ uniquement | platform_admin+ |
| DELETE | N5+ uniquement | platform_admin+ |

### 15. `franchiseur_roles` / `franchiseur_agency_assignments` (Rôles réseau)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Propre rôle OU N5+ OU directeur/DG | Self, platform_admin+, directeur, DG |
| INSERT | N5+ OU directeur/DG | platform_admin+, directeur, DG |
| UPDATE | N5+ OU directeur/DG | platform_admin+, directeur, DG |
| DELETE | N5+ uniquement | platform_admin+ |

### 16. `agency_royalty_*` (Redevances)

| Opération | Règle | Rôles autorisés |
|-----------|-------|-----------------|
| SELECT | Directeur/DG OU N5+ | directeur, DG, platform_admin+ |
| INSERT | Directeur/DG OU N5+ | directeur, DG, platform_admin+ |
| UPDATE | Directeur/DG OU N5+ | directeur, DG, platform_admin+ |
| DELETE | Directeur/DG OU N5+ | directeur, DG, platform_admin+ |

---

## Tables de configuration (lecture globale)

Ces tables contiennent des données de référence accessibles en lecture à tous les utilisateurs avec le module `apogee_tickets` activé :

- `apogee_ticket_statuses`
- `apogee_ticket_transitions`
- `apogee_modules`
- `apogee_priorities`
- `apogee_impact_tags`
- `apogee_owner_sides`
- `apogee_reported_by`

| Opération | Règle |
|-----------|-------|
| SELECT | Module apogee_tickets activé OU N5+ |
| INSERT/UPDATE/DELETE | N5+ uniquement |

---

## Isolation par agence

Les tables suivantes appliquent une isolation stricte par `agency_id` :

| Table | Champ | Isolation |
|-------|-------|-----------|
| `agency_collaborators` | `agency_id` | N0-N2 voient leur agence, N3+ voient tout |
| `profiles` | `agency_id` / `agence` | Via get_user_agency() |
| `support_tickets` | `agency_slug` | Filtrage par agence pour support |

---

## Vérifications de sécurité

### Test N2 (franchisee_admin)
- ✅ Ne peut PAS lire les données d'une autre agence
- ✅ Ne peut PAS modifier les guides Apogée
- ✅ Peut voir ses propres tickets support
- ✅ Ne peut PAS accéder aux tickets Apogée (sauf si module activé)

### Test N3 (franchisor_user)
- ✅ Peut lire toutes les agences
- ✅ Ne peut PAS modifier les guides (réservé N4+)
- ✅ Peut voir tous les tickets support
- ✅ Peut accéder aux tickets Apogée si module activé

### Test N5 (platform_admin)
- ✅ Accès global à toutes les données
- ✅ Peut modifier/supprimer les guides
- ✅ Peut gérer les utilisateurs et rôles

---

## Changelog

| Date | Modification |
|------|--------------|
| 2025-11-30 | Correction `apogee_guides` - suppression "Temporary full access" |
| 2025-11-30 | Correction `planning_signatures` - restriction INSERT/DELETE |
| 2025-11-30 | Correction `support_attachments` - restriction INSERT |
| 2025-11-30 | Correction `apogee_ticket_attachments` - restriction SELECT/INSERT |
