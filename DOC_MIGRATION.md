# Guide de Migration - Permissions V2.0

## Objectif

Migrer progressivement de l'ancien système de permissions vers le nouveau système simplifié, sans interruption de service et sans perte de données.

## Ancien Système (Legacy)

### Composants
- `profiles.system_role` - Rôle système (visiteur, utilisateur, support, admin)
- `user_roles` - Table des rôles applicatifs (admin, user, support, franchiseur)
- `groups` + `group_permissions` - Groupes avec permissions par scope
- `user_permissions` - Overrides individuels par scope
- `user_capabilities` - Capacités spéciales (ex: support)
- `scopes` - Définition des périmètres d'accès
- `franchiseur_roles` - Rôles franchiseur (animateur, directeur, dg)

### Fonctions existantes
- `has_role(_user_id, _role)` - Vérifie un rôle applicatif
- `has_franchiseur_role(_user_id, _role)` - Vérifie un rôle franchiseur
- `get_effective_permission_level(_user_id, _scope_slug)` - Calcule le niveau effectif

## Nouveau Système (V2.0)

### Composants
- `profiles.global_role` - UN rôle unique hiérarchique (N0-N6)
- `profiles.enabled_modules` - JSONB des modules et options activés

### Fonctions TypeScript
- `hasGlobalRole(ctx, role)` - Vérifie le niveau minimum
- `hasModule(ctx, module)` - Vérifie l'accès à un module
- `hasModuleOption(ctx, module, option)` - Vérifie une option

## Mapping Legacy → V2.0

### Rôle Global

```typescript
function getGlobalRoleFromLegacy(params) {
  // N6 - superadmin
  if (hasAdminRole && systemRole === 'admin') return 'superadmin';
  
  // N5 - platform_admin  
  if (hasAdminRole || (hasSupportRole && supportLevel >= 3)) return 'platform_admin';
  
  // N4 - franchisor_admin
  if (hasFranchiseurRole && ['directeur', 'dg'].includes(franchiseurRole)) return 'franchisor_admin';
  
  // N3 - franchisor_user
  if (hasFranchiseurRole && franchiseurRole === 'animateur') return 'franchisor_user';
  
  // N2 - franchisee_admin
  if (roleAgence === 'dirigeant') return 'franchisee_admin';
  
  // N1 - franchisee_user
  if (systemRole === 'utilisateur' || roleAgence) return 'franchisee_user';
  
  // N0 - base_user
  return 'base_user';
}
```

### Modules Activés

| Condition Legacy | Module V2.0 |
|-----------------|-------------|
| Accès guides (apogee, apporteurs, helpconfort) | `help_academy` |
| Scope mes_indicateurs, actions_a_mener | `pilotage_agence` |
| Rôle franchiseur | `reseau_franchiseur` |
| Tout utilisateur + capability support | `support` |
| Rôle admin | `admin_plateforme` |

## Plan de Migration

### Étape 1 : Préparation (FAIT)
- [x] Créer les types TypeScript
- [x] Ajouter les colonnes DB (nullables)
- [x] Documenter le mapping

### Étape 2 : Double lecture
- [ ] Modifier AuthContext pour lire les deux systèmes
- [ ] Utiliser V2.0 si `global_role` est défini, sinon calculer depuis legacy
- [ ] Logger les différences pour validation

### Étape 3 : Migration des données
- [ ] Script SQL pour calculer `global_role` pour tous les users
- [ ] Script SQL pour calculer `enabled_modules` pour tous les users
- [ ] Validation par échantillonnage

### Étape 4 : Bascule progressive
- [ ] Activer V2.0 pour les admins d'abord
- [ ] Étendre progressivement
- [ ] Monitorer les erreurs

### Étape 5 : Nettoyage (optionnel)
- [ ] Marquer l'ancien système comme deprecated
- [ ] Supprimer les références legacy après stabilisation

## Script de Migration SQL

```sql
-- Étape 3a : Calculer global_role
UPDATE profiles p
SET global_role = CASE
  WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'admin') 
       AND p.system_role = 'admin' THEN 'superadmin'::global_role
  WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'admin')
       OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'support') 
           AND COALESCE(p.support_level, 1) >= 3) THEN 'platform_admin'::global_role
  WHEN EXISTS (SELECT 1 FROM franchiseur_roles WHERE user_id = p.id 
               AND franchiseur_role IN ('directeur', 'dg')) THEN 'franchisor_admin'::global_role
  WHEN EXISTS (SELECT 1 FROM franchiseur_roles WHERE user_id = p.id 
               AND franchiseur_role = 'animateur') THEN 'franchisor_user'::global_role
  WHEN p.role_agence IN ('dirigeant', 'Dirigeant') THEN 'franchisee_admin'::global_role
  WHEN p.system_role = 'utilisateur' OR p.role_agence IS NOT NULL THEN 'franchisee_user'::global_role
  ELSE 'base_user'::global_role
END
WHERE p.global_role IS NULL;
```

## Cohabitation

Pendant la transition, les deux systèmes coexistent :

```typescript
// AuthContext.tsx - Exemple de double lecture
const accessCtx = createAccessContext({
  // Priorité au nouveau système si défini
  globalRole: profile.global_role,
  enabledModules: profile.enabled_modules,
  
  // Fallback sur legacy
  systemRole: profile.system_role,
  roleAgence: profile.role_agence,
  hasAdminRole: roles.includes('admin'),
  // ...
});

// Les guards fonctionnent dans les deux cas
if (hasModule(accessCtx, 'pilotage_agence')) {
  // Accessible
}
```

## Rollback

En cas de problème :
1. Remettre `global_role` et `enabled_modules` à NULL
2. Le système utilise automatiquement le legacy
3. Aucune perte de données

## Validation

Checklist avant bascule complète :
- [ ] Tous les admins ont accès admin
- [ ] Tous les supports ont accès support
- [ ] Tous les franchiseurs ont accès réseau
- [ ] Aucun utilisateur n'a perdu d'accès
- [ ] Les pages protégées restent protégées
