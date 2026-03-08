# AXE 5 — Données et Intégrité

> Audit production-grade Operia — 2026-03-08

---

## 1. Tables critiques

| Table | Rôle | RLS | FK | Risque |
|---|---|---|---|---|
| `profiles` | Identité utilisateur | ✅ | → auth.users(id) implicite | Trigger sync bidirectionnel fragile |
| `collaborators` | Fiches salariés | ✅ | → profiles, agencies | Doublon possible si trigger auto_create échoue |
| `collaborator_sensitive_data` | NIR, urgence (chiffré) | ✅ | → collaborators | Perte clé = perte données 🔴 |
| `apogee_agencies` | Agences réseau | ✅ | — | Table pivot, suppression cascade danger |
| `apogee_tickets` | Tickets dev/support | ✅ | → profiles, statuses | Historique critique |
| `user_modules` | Droits modules | ✅ | → profiles | Source de vérité permissions |
| `activity_log` | Audit trail | ✅ | → agencies | Volume croissant, purge à 6 mois |
| `rate_limits` | Anti brute-force | ✅ | — | Purge à 1 jour |
| `apporteur_sessions` | Sessions portail | ✅ | → managers | Purge 7 jours après expiration |

## 2. Triggers critiques

### 2.1 Sync profiles ↔ collaborators (bidirectionnel)

```
profiles UPDATE → sync_profile_on_collaborator_update()
collaborators UPDATE → sync inverse
```

**Protection anti-récursion**: `current_setting('app.syncing_from_profile', true)` ✅

**Risque**: Si un trigger échoue silencieusement, les deux tables divergent. Le health check ne vérifie pas cette cohérence.

### 2.2 Auto-création collaborateur

```
profiles INSERT → auto_create_collaborator()
```

Crée automatiquement un collaborateur quand un profil est créé avec une agence. Utilise `ON CONFLICT ... DO UPDATE`.

**Risque**: Mapping `role_agence` → `type` via pattern matching (`LIKE '%technic%'` etc.) est fragile si les libellés changent.

### 2.3 Activity log auto

```
collaborators / fleet_vehicles / tickets / apporteurs INSERT/UPDATE/DELETE
  → track_entity_changes()
```

**Risque**: Ce trigger SECURITY DEFINER utilise `auth.uid()` — dans un contexte CRON ou service_role, `auth.uid()` est null → le log sera incomplet.

### 2.4 Media folder sync

```
collaborator_document_folders INSERT → sync_collaborator_folder_to_media()
collaborator_document_folders DELETE → unsync...()
```

**Risque**: Logique complexe de navigation de l'arbre de dossiers — fragile si la hiérarchie est modifiée.

## 3. Relations fragiles

### 3.1 profiles.agency_id vs profiles.agence (slug)
Deux colonnes pour la même info (UUID vs slug). Certaines Edge Functions utilisent l'un, d'autres l'autre. Risque d'incohérence si l'une est mise à jour sans l'autre.

### 3.2 user_modules vs get_user_effective_modules (RPC)
La RPC combine `module_registry` + `plan_tier_modules` + `user_modules`. Si `module_registry` est mal configuré, les permissions effectives changent pour tous les utilisateurs.

### 3.3 Pas de contrainte FK sur certaines colonnes critiques
- `apogee_tickets.kanban_status` → FK vers `apogee_ticket_statuses` ✅
- `profiles.global_role` → **Pas de FK**, juste une convention string → risque de valeur invalide

## 4. RLS (Row Level Security)

### 4.1 Couverture
- **Toutes les tables listées ont RLS activé** (vérifié via la DB function `get_schema_ddl`)
- Policies non auditées individuellement dans ce scope (70+ tables × policies)

### 4.2 Risques RLS
- **SECURITY DEFINER functions** (`has_role`, `has_min_global_role`, etc.) — si compromises, bypass total de RLS
- **Service Role Key** dans Edge Functions bypass RLS par design → correctement utilisé pour admin ops

## 5. Migrations

- Migrations stockées dans `supabase/migrations/` (lecture seule, gérées par Supabase CLI)
- Pas de rollback automatique visible
- Pas de versionning des migrations documenté

## 6. Purge et rétention

| Données | Rétention | Mécanisme |
|---|---|---|
| `activity_log` | 6 mois | `purge_old_activity_logs()` |
| `rate_limits` | 1 jour | `purge_expired_rate_limits()` |
| `apporteur_sessions` | 7 jours post-expiration | `purge_expired_apporteur_sessions()` |
| `apporteur_otp_codes` | 1 heure | `cleanup_expired_apporteur_otps()` |
| `ticket_history` | 12 mois | `purge_old_ticket_history()` |
| `ai_search_cache` | TTL configurable | `purge_expired_ai_cache()` |

**Risque**: Ces fonctions de purge existent mais **aucun CRON job visible dans config.toml pour les exécuter automatiquement**. Si non appelées, les tables grossissent indéfiniment.

## 7. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Documenter et sauvegarder `SENSITIVE_DATA_ENCRYPTION_KEY` hors Supabase |
| 🔴 Critique | Vérifier que les CRONs de purge sont effectivement planifiés |
| 🟠 Important | Ajouter un health check de cohérence profiles↔collaborators |
| 🟠 Important | Ajouter une contrainte CHECK ou ENUM sur `profiles.global_role` |
| 🟡 Confort | Unifier `agency_id` et `agence` (slug) — utiliser uniquement UUID |
