# Schéma Base de Données OPERIA — État Actuel

> **Date** : 29 mars 2026
> **Moteur** : PostgreSQL 15 via Supabase
> **RLS** : Activé sur toutes les tables

---

## 1. Vue d'ensemble

OPERIA utilise ~60 tables réparties en domaines fonctionnels. Toutes les tables ont RLS activé.

---

## 2. Tables par domaine

### Auth & Profils

| Table | Rôle | Clé principale |
|-------|------|:--:|
| `auth.users` | Utilisateurs Supabase (géré automatiquement) | `id` |
| `profiles` | Profils utilisateurs étendus | `id` (FK → auth.users) |

**`profiles`** — Colonnes clés :
- `global_role` — rôle N0-N6 (protégé par trigger `protect_global_role_update`)
- `role_level` — niveau numérique (0-6)
- `role_agence` — poste métier (administratif, commercial, technicien)
- `agency_id` — agence rattachée (FK → apogee_agencies)
- `agency_slug` — slug de l'agence

### Permissions (V1 — actuel)

| Table | Rôle | Lignes |
|-------|------|:--:|
| `module_registry` | Registre des modules déployés | 74 |
| `plan_tiers` | Définition des plans (STARTER, PRO) | 2 |
| `plan_tier_modules` | Modules inclus par plan | ~54 |
| `agency_subscription` | Plan actif par agence | ~41 |
| `agency_features` | Options payantes par agence (pack Relations...) | ~6 |
| `user_modules` | Overrides individuels par utilisateur | ~17 |

**RPC clé** : `get_user_effective_modules(user_id)` — résout les modules effectifs.

### Agences

| Table | Rôle |
|-------|------|
| `apogee_agencies` | Agences du réseau (label, slug, contact, config SMS, Stripe) |
| `agency_subscription` | Abonnement plan par agence |
| `agency_features` | Options SaaS activées |
| `agency_performance_config` | Configuration seuils performance |
| `agency_stamps` | Cachets agence (signatures) |
| `agency_suivi_settings` | Configuration suivi client |
| `agency_map_zone_communes` | Zones d'intervention (communes) |

### Ticketing

| Table | Rôle |
|-------|------|
| `apogee_tickets` | Tickets (bugs, évolutions, support) |
| `apogee_ticket_comments` | Commentaires sur tickets |
| `apogee_ticket_attachments` | Pièces jointes |
| `apogee_ticket_history` | Historique modifications |
| `apogee_ticket_statuses` | Statuts Kanban |
| `apogee_ticket_transitions` | Règles de transition statut |
| `apogee_ticket_user_roles` | Rôles ticket (reporter, triager, dev) |
| `apogee_ticket_views` | Vues (lu/non lu) |
| `apogee_ticket_support_exchanges` | Échanges support |
| `apogee_ticket_field_permissions` | Permissions champs par rôle |
| `apogee_ticket_tags` | Tags personnalisés |
| `apogee_modules` | Modules Apogée (référentiel) |
| `apogee_priorities` | Priorités |
| `apogee_impact_tags` | Tags impact |
| `apogee_owner_sides` | Côté propriétaire |
| `apogee_reported_by` | Sources de signalement |

### Finance

| Table | Rôle |
|-------|------|
| `agency_financial_months` | Données financières mensuelles (CA, charges, salaires) |
| `agency_financial_charges` | Charges fixes par agence |
| `agency_royalty_config` | Configuration redevances |
| `agency_royalty_tiers` | Tranches de redevances |
| `agency_royalty_calculations` | Calculs de redevances |
| `agency_overhead_rules` | Règles de frais généraux |

### RH

| Table | Rôle |
|-------|------|
| `agency_rh_roles` | Rôles RH par agence |
| `agency_admin_documents` | Documents administratifs agence |

### Contenu

| Table | Rôle |
|-------|------|
| `apogee_guides` | Guides Help! Academy |
| `priority_announcements` | Annonces prioritaires |
| `announcement_reads` | Lecture des annonces |

### Sync Apogée

| Table | Rôle |
|-------|------|
| `apogee_sync_runs` | Historique des runs de sync |
| `apogee_sync_logs` | Logs détaillés par endpoint/agence |

### Audit & Activité

| Table | Rôle |
|-------|------|
| `activity_log` | Journal d'audit métier (actions, entités, acteurs) |

### IA & Recherche

| Table | Rôle |
|-------|------|
| `ai_search_cache` | Cache recherche IA (TTL) |

### Commercial

| Table | Rôle |
|-------|------|
| `agency_commercial_profile` | Profil commercial agence (équipe, compétences, réalisations) |
| `animator_visits` | Visites animateur réseau |

---

## 3. Fonctions SQL clés

| Fonction | Type | Rôle |
|----------|------|------|
| `get_user_effective_modules(uuid)` | RPC | Résout les modules effectifs d'un utilisateur |
| `has_module_v2(uuid, text)` | SECURITY DEFINER | Vérifie si un user a un module (RLS) |
| `has_min_global_role(text)` | SECURITY DEFINER | Vérifie le rôle minimum (RLS) |
| `protect_global_role_update` | TRIGGER | Empêche la modification de global_role via client |

---

## 4. Patterns RLS

### Lecture : membre de l'agence ou admin

```sql
CREATE POLICY "select_own_agency" ON some_table
FOR SELECT TO authenticated
USING (
  agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid())
  OR has_min_global_role('franchisor_admin')
);
```

### Écriture : admin réseau uniquement

```sql
CREATE POLICY "admin_write" ON some_table
FOR ALL TO authenticated
USING (has_min_global_role('franchisor_admin'))
WITH CHECK (has_min_global_role('franchisor_admin'));
```

### Protection module

```sql
CREATE POLICY "module_access" ON some_table
FOR SELECT TO authenticated
USING (has_module_v2(auth.uid(), 'pilotage.agence'));
```

---

## 5. Relations clés

```
profiles.agency_id ──→ apogee_agencies.id
agency_subscription.agency_id ──→ apogee_agencies.id
agency_subscription.tier_key ──→ plan_tiers.key
plan_tier_modules.tier_key ──→ plan_tiers.key
plan_tier_modules.module_key ──→ module_registry.key
user_modules.user_id ──→ profiles.id
user_modules.module_key ──→ module_registry.key
agency_features.agency_id ──→ apogee_agencies.id
activity_log.agency_id ──→ apogee_agencies.id
apogee_tickets.created_by_user_id ──→ profiles.id (implicite)
```
