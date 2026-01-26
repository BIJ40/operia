# Architecture de synchronisation des utilisateurs

> **Dernière mise à jour** : 26 Janvier 2026

## Principe fondamental

**Toute modification d'un utilisateur, quel que soit le point d'entrée, doit être visible instantanément partout.**

## Points d'entrée de modification

| Point d'entrée | Route | Hook/Composant | Qui peut modifier |
|---|---|---|---|
| Console Droits & Accès | `/admin/droits` | `useAccessRightsUsers` | N3+ (selon capabilities) |
| Admin Utilisateurs | `/admin/utilisateurs` | `useUserManagement` | N3+ (selon capabilities) |
| Franchiseur Utilisateurs | `/hc-reseau/utilisateurs` | `useUserManagement` | N3/N4 (agences assignées) |
| Équipe Agence | `/equipe` | `useUserManagement` | N2+ (propre agence) |
| Profil Personnel | `/profile` | Direct Supabase | L'utilisateur lui-même |
| Demandes création (legacy) | N/A | `useUserCreationRequests` | Workflow approbation |

## Query Keys synchronisées

Fichier source: `src/lib/queryKeys.ts`

```typescript
ALL_USER_QUERY_PATTERNS = [
  'user-management',        // Listes de gestion
  'access-rights-users',    // Console Droits
  'admin-users-unified',    // Legacy backward compat
  'user-modules',           // Modules utilisateurs
  'agency-users',           // Utilisateurs par agence (paramétré)
  'user-profile',           // Profils individuels (paramétré)
]
```

## Fonction d'invalidation centralisée

Toute mutation utilisateur doit appeler cette fonction après succès:

```typescript
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

function invalidateAllUserQueries(queryClient) {
  // Invalide toutes les patterns fixes
  ALL_USER_QUERY_PATTERNS.forEach(pattern => {
    queryClient.invalidateQueries({ queryKey: [pattern] });
  });
  
  // Invalide les queries préfixées (avec paramètres)
  queryClient.invalidateQueries({ predicate: (query) => 
    query.queryKey[0] === 'agency-users' || 
    query.queryKey[0] === 'user-profile'
  });
}
```

## Hiérarchie des rôles (qui peut modifier qui)

| Éditeur | Peut modifier |
|---|---|
| N2 (franchisee_admin) | N0, N1 de sa propre agence |
| N3 (franchisor_user) | N0, N1, N2 des agences assignées |
| N4 (franchisor_admin) | N0, N1, N2, N3 + assigner agences aux N3 |
| N5 (platform_admin) | Tous sauf N6 |
| N6 (superadmin) | Tous + lui-même (exception self-edit) |

## Règles de visibilité

- N1 modifié par N2 → visible par N1, N2, N3, N4, N5, N6
- N3 modifié par N4 → visible par N3, N4, N5, N6
- N1 se modifie lui-même → remonte partout (N2+)
- N6 se modifie lui-même → visible partout

## Champs modifiables

### Par l'utilisateur lui-même (`/profile`)
- `first_name`
- `last_name`
- `phone`
- `avatar_url`

### Par les N+ (admin)
- Tous les champs ci-dessus
- `email` (via Edge Function)
- `global_role`
- `agence` / `agency_id`
- `role_agence`
- `enabled_modules` (via `user_modules` table)
- `is_active` (désactivation)
- `password` (via Edge Function)

## Fichiers clés

- `src/lib/queryKeys.ts` - Définition centralisée des query keys
- `src/hooks/access-rights/useAccessRightsUsers.ts` - Hook Console Droits
- `src/hooks/use-user-management.ts` - Hook principal gestion utilisateurs
- `src/hooks/user-management/useUserMutations.ts` - Mutations séparées
- `src/pages/Profile.tsx` - Page profil personnel

## Test de synchronisation

Pour vérifier que la synchro fonctionne:
1. Ouvrir `/admin/droits` dans un onglet (N5/N6)
2. Ouvrir `/hc-reseau/utilisateurs` dans un autre onglet (N4)
3. Modifier un utilisateur dans un onglet
4. Vérifier que la modification apparaît dans l'autre onglet sans rechargement
