

## Audit complet : Sources de permissions en conflit

### Diagnostic

Il y a actuellement **4 systèmes parallèles** qui vérifient les droits, au lieu d'un seul :

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  SOURCE 1: RPC get_user_effective_modules (✅ SOURCE DE VÉRITÉ)        │
│  → Cascade: module_registry + plan_tier_modules + user_modules         │
│  → Utilisé par AuthContext côté frontend                               │
│  → C'est l'onglet "Droits" qui écrit dans user_modules                 │
├──────────────────────────────────────────────────────────────────────────┤
│  SOURCE 2: profiles.enabled_modules JSONB (❌ LEGACY MORT)             │
│  → Vidé par migration mais encore lu par :                             │
│     • 7 fonctions SQL (has_apogee_tickets_access, has_franchiseur_     │
│       access, has_support_access, is_support_agent,                    │
│       get_collaborator_sensitive_data, handle_document_request)         │
│     • ~20 politiques RLS (apogee_tickets, ticket_embeddings,           │
│       ticket_tags, ticket_history, salary_history,                     │
│       collaborator_sensitive_data, etc.)                               │
│     • Edge Function _shared/auth.ts → encore SELECT enabled_modules    │
│     • Edge Function _shared/permissionsEngine.ts → extractPermission   │
│     • Edge Function create-user → écrit encore dans le JSONB           │
├──────────────────────────────────────────────────────────────────────────┤
│  SOURCE 3: types/accessControl.ts (❌ DOUBLON CODE)                    │
│  → Fichier de guards qui réimplémente hasModule/hasModuleOption        │
│  → En doublon avec permissions/permissionsEngine.ts                    │
│  → Utilisé uniquement dans AuthContext.tsx                             │
├──────────────────────────────────────────────────────────────────────────┤
│  SOURCE 4: moduleRegistry.ts fonctions legacy (❌ DEAD CODE)           │
│  → hasProjectManagementAccess() / hasKanbanAccess()                    │
│  → Vérifient enabledModules JSONB directement                          │
│  → Exportées mais jamais appelées                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Plan de correction — 3 blocs

#### Bloc 1 : SQL — Migrer toutes les fonctions et RLS vers `user_modules`

**Fonctions SQL à réécrire** (supprimer toute référence à `profiles.enabled_modules`) :

| Fonction | Remplacement |
|----------|-------------|
| `has_apogee_tickets_access` | Ne garder que `user_modules` + N5+ bypass (supprimer le check `profiles.enabled_modules`) |
| `has_franchiseur_access` | Remplacer par `has_module_v2(_user_id, 'reseau_franchiseur') OR global_role >= N3` |
| `has_support_access` | Remplacer par `has_module_v2(_user_id, 'aide') OR N5+` |
| `is_support_agent` | Remplacer par `has_module_option_v2(_user_id, 'aide', 'agent')` |
| `get_collaborator_sensitive_data` | Remplacer le check `enabled_modules->'rh'` par `has_module_option_v2(v_user_id, 'rh', 'rh_admin')` |
| `handle_document_request` | Idem — remplacer par `has_module_option_v2` |

**Politiques RLS à réécrire** (~20 policies sur 8 tables) :

Toutes les policies qui font `(SELECT (profiles.enabled_modules->...) FROM profiles WHERE id = auth.uid())` seront remplacées par `has_apogee_tickets_access(auth.uid())` (qui elle-même ne vérifiera plus que `user_modules` + N5+) ou par `has_module_option_v2()`.

Tables impactées : `apogee_ticket_attachments`, `apogee_ticket_comments`, `apogee_ticket_tags`, `apogee_ticket_history`, `apogee_impact_tags`, `apogee_ticket_field_permissions`, `apogee_reported_by`, `ticket_embeddings`, `ticket_duplicate_suggestions`, `salary_history`, `collaborator_sensitive_data`.

#### Bloc 2 : Edge Functions — Supprimer `enabled_modules` du contexte

| Fichier | Action |
|---------|--------|
| `supabase/functions/_shared/auth.ts` | Supprimer `enabled_modules` du SELECT et du UserContext. Utiliser la RPC `get_user_effective_modules` ou `has_module_v2` SQL |
| `supabase/functions/_shared/permissionsEngine.ts` | Supprimer `enabledModules` de `extractPermissionContext()`. Mettre à jour `validateUserPermissions()` |
| `supabase/functions/create-user/index.ts` | Supprimer le bloc qui écrit `enabled_modules` JSONB dans profiles (lignes 280-288) |

#### Bloc 3 : Frontend — Supprimer les doublons de code

| Fichier | Action |
|---------|--------|
| `src/types/accessControl.ts` | **Supprimer** — doublon de `permissionsEngine.ts`. Migrer les 5 imports dans `AuthContext.tsx` vers `@/permissions` |
| `src/permissions/moduleRegistry.ts` | Supprimer `hasProjectManagementAccess()` et `hasKanbanAccess()` (dead code, lisent le JSONB) |
| `src/permissions/index.ts` | Retirer les exports correspondants |
| `src/permissions/types.ts` | Mettre à jour le commentaire (ne plus mentionner `profiles.enabled_modules`) |

### Résultat attendu

```text
Un seul chemin de vérification, partout :

Frontend:  AuthContext → RPC get_user_effective_modules → state
           → hasModule() / hasModuleOption() via permissions/

SQL/RLS:   has_apogee_tickets_access()  → user_modules + N5+
           has_module_v2()              → user_modules
           has_module_option_v2()       → user_modules + options
           
Edge Fn:   global_role + has_module_v2() SQL (pas de JSONB)

Écriture:  Onglet Droits → INSERT/UPDATE user_modules → seule source
```

Aucune référence à `profiles.enabled_modules` ne subsistera dans le code actif.

