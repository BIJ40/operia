

## Diagnostic : Pourquoi le ticketing est incohérent

### Le problème

Il existe **3 mécanismes d'accès distincts** pour le ticketing, dont 2 sont invisibles depuis l'onglet "Droits" :

```text
┌─────────────────────────────────────────────────────────┐
│  1. module_registry + plan_tier_modules                 │
│     ticketing → required_plan: NONE, enabled: false     │
│     ✅ Correct : personne n'y a accès via le plan       │
├─────────────────────────────────────────────────────────┤
│  2. user_modules (= onglet "Privilèges")                │
│     0 entrées pour ticketing                            │
│     ✅ Correct : aucun override visible                 │
├─────────────────────────────────────────────────────────┤
│  3. protected_user_access (INVISIBLE dans Droits)       │  ← LE PROBLÈME
│     + hardcode dans useProtectedAccess.ts               │
│     6 utilisateurs whitelistés en dur :                 │
│     Hugo, Gregory, Philippe, Florian, Eric, Jérôme      │
│     → AuthContext.tsx force ticketing.enabled = true     │
└─────────────────────────────────────────────────────────┘
```

En plus, la fonction SQL `has_apogee_tickets_access()` vérifie encore `profiles.enabled_modules` (legacy JSONB supprimé).

### Ce qui se passe concrètement

1. L'utilisateur se connecte
2. `AuthContext` appelle la RPC `get_user_effective_modules` → **pas de ticketing** (correct)
3. Puis `AuthContext` vérifie `protected_user_access` / hardcode → **force ticketing = true** (invisible)
4. La fiche utilisateur affiche "ticketing ✅" mais l'onglet Privilèges ne montre rien

### Plan de correction

**Objectif** : Un seul système, tout visible dans "Droits/Privilèges"

#### 1. Migrer les 6 accès protégés vers `user_modules`

Insérer dans `user_modules` les 6 utilisateurs avec `module_key = 'ticketing'` et les options `kanban, create, history`. Cela les rend visibles dans l'onglet Privilèges.

#### 2. Supprimer le système `protected_user_access`

- **`src/hooks/access-rights/useProtectedAccess.ts`** : Supprimer le fichier
- **`src/contexts/AuthContext.tsx`** : Supprimer le bloc "PHASE 0" (lignes 300-320) qui force le ticketing
- **`src/components/admin/users/UserFullDialog.tsx`** : Retirer l'import et l'usage de `isHardcodedProtectedUser`
- **`src/components/admin/users/UserAccessSimple.tsx`** : Idem

#### 3. Corriger la fonction SQL `has_apogee_tickets_access`

Supprimer la vérification legacy `profiles.enabled_modules`, ne garder que :
- `user_modules` (source de vérité)
- N5+ bypass

```sql
CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_modules
      WHERE user_id = _user_id AND module_key = 'ticketing'
    )
    OR public.has_min_global_role(_user_id, 5);
$$;
```

#### 4. Nettoyer la table `protected_user_access`

Supprimer les données (ou garder la table vide comme archive). Plus aucun code ne la référencera.

### Résultat attendu

- Un seul chemin d'accès : `get_user_effective_modules` (RPC) qui lit `module_registry` + `plan_tier_modules` + `user_modules`
- Les 6 utilisateurs apparaissent dans "Privilèges" avec le badge ticketing
- Plus aucun hardcode ni whitelist cachée

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/hooks/access-rights/useProtectedAccess.ts` | Supprimer |
| `src/contexts/AuthContext.tsx` | Retirer PHASE 0 + import |
| `src/components/admin/users/UserFullDialog.tsx` | Retirer import protectedUser |
| `src/components/admin/users/UserAccessSimple.tsx` | Retirer import protectedUser |
| Migration SQL | INSERT user_modules + UPDATE has_apogee_tickets_access |

