# Sprint 1 - Sécurité RLS (PRIORITÉ 1)

**Status**: ✅ COMPLÉTÉ

**Date**: 2025-12-01

---

## P1.1 - RLS Franchiseur ✅

### Objectif
Remplacer `has_franchiseur_role()` par une logique basée uniquement sur `global_role` + `franchiseur_agency_assignments`.

### Décisions clés
- **Authorization** = `global_role` (N3+) + `franchiseur_agency_assignments` (scope agences)
- **Rôle métier** = conservé dans `franchiseur_roles` pour UX uniquement (pas RLS)

### Changements DB

#### Nouvelles fonctions SQL
1. **`get_user_assigned_agencies(_user_id)`**
   - Retourne les UUIDs des agences assignées à un utilisateur via `franchiseur_agency_assignments`

2. **`can_access_agency(_user_id, _agency_id)`**
   - N5+ → accès global
   - N3/N4 sans assignments → accès global (legacy)
   - N3/N4 avec assignments → accès limité aux agences assignées

#### Policies réécrites
- **`animator_visits`**: 4 policies (SELECT/INSERT/UPDATE/DELETE) utilisant `can_access_agency()`
- **`expense_requests`**: 2 policies (SELECT/UPDATE) utilisant `has_min_global_role(auth.uid(), 3)`
- **`agency_royalty_calculations`**: 2 policies utilisant `can_access_agency()`
- **`agency_royalty_config`**: 2 policies utilisant `can_access_agency()`
- **`agency_royalty_tiers`**: 2 policies utilisant `can_access_agency()` via JOIN config

### Impact code
- Aucun changement code frontend nécessaire (transparence totale)
- Les checks d'accès restent identiques côté UI
- La sécurité est renforcée au niveau DB uniquement

---

## P1.2 - RLS Support Console ✅

### Objectif
Aligner les RLS `support_tickets` avec la politique Option B :
- Console Support accessible à `support.agent=true` + N5+

### Décisions clés
**Option B retenue** :
- `/support/console` accessible à tous les utilisateurs avec `enabled_modules.support.options.agent = true`
- N5+ (platform_admin) ont accès par défaut

### Changements DB

#### Nouvelle fonction SQL
**`is_support_agent(_user_id)`**
- Vérifie `enabled_modules->'support'->'options'->>'agent' = true`
- Retourne boolean
- SECURITY DEFINER pour éviter RLS récursion

#### Policies réécrites sur `support_tickets`
1. **SELECT** : créateur OU assigned_to OU support.agent OU N5+
2. **INSERT** : tout utilisateur authentifié (user_id = auth.uid())
3. **UPDATE** : créateur OU assigned_to OU support.agent OU N5+
4. **DELETE** : N5+ uniquement

### Impact code

#### AuthContext.tsx
- Refactoring flags support pour clarté sémantique :
  ```ts
  const hasSupportAgentRole = supportOptions.agent === true;
  const isSupportAgent = hasSupportAgentRole; // Alias
  const canAccessSupportConsole = hasSupportAgentRole || isAdmin;
  ```

#### SupportConsoleGuard.tsx
- Message d'erreur mis à jour : "agents support et administrateurs plateforme"
- Documentation clarifiée : Option B explicite

---

## P1.3 - Migration agency_id ✅

### Objectif
Établir `profiles.agency_id` (UUID) comme source unique de vérité, éliminer `profiles.agence` (slug text).

### Décisions clés
- **Source de vérité** = `profiles.agency_id` (FK vers `apogee_agencies.id`)
- **Legacy** = `profiles.agence` (à supprimer après migration complète)

### Changements DB

#### Migration de données
```sql
UPDATE profiles p
SET agency_id = (
  SELECT a.id FROM apogee_agencies a WHERE a.slug = p.agence
)
WHERE p.agency_id IS NULL AND p.agence IS NOT NULL;
```

#### Nouvelle fonction SQL
**`get_user_agency_id(_user_id)`**
- Retourne `agency_id` du profil
- SECURITY DEFINER pour éviter RLS récursion

#### Policies réécrites
1. **`apogee_agencies`** - SELECT policy :
   - N5+ OU has_support_access OU has_franchiseur_access OU agency_id match

2. **`agency_collaborators`** - 3 policies :
   - SELECT : N3+ OU agency_id match
   - INSERT : N3+ OU (N2 ET agency_id match)
   - UPDATE : N3+ OU (N2 ET agency_id match)

### Impact code
- **Immédiat** : Aucun (profil conserve les deux champs temporairement)
- **À venir Phase 2** :
  1. Réécrire tout le code utilisant `profiles.agence` pour utiliser `agency_id` + JOIN
  2. Supprimer la colonne `profiles.agence`

---

## Résultat Sprint 1

### Sécurité renforcée
✅ Franchiseur : RLS basée sur global_role + assignments (pas franchiseur_roles)  
✅ Support : Console accessible aux agents support (pas seulement N5+)  
✅ Agencies : Unification vers agency_id (UUID) comme source unique  

### Fonctions SQL créées
- `get_user_assigned_agencies(_user_id)`
- `can_access_agency(_user_id, _agency_id)`
- `is_support_agent(_user_id)`
- `get_user_agency_id(_user_id)`

### Policies consolidées
- 4 tables franchiseur (animator_visits, expense_requests, royalty_*)
- 1 table support (support_tickets)
- 2 tables agencies (apogee_agencies, agency_collaborators)

### Tests de validation
- [ ] User N3 sans assignments voit toutes les agences
- [ ] User N3 avec assignments ne voit que ses agences
- [ ] User avec support.agent accède à /support/console
- [ ] User N5 accède à /support/console sans support.agent
- [ ] Collaborateurs isolés par agency_id

---

## Next Steps - Sprint 2

**P2.1** - Refactoring flags support (hasSupportAgentRole vs isSupportAgent)  
**P2.2** - Centralisation guards dans App.tsx  
**P2.3** - Unification moteur d'accès navigation  
