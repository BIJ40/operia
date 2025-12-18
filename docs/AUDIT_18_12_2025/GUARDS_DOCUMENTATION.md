# DOCUMENTATION DES GUARDS

## Vue d'ensemble

Les guards sont des composants React qui protègent les routes et contrôlent l'accès aux différentes sections de l'application.

---

## Guards Disponibles

### 1. `RoleGuard`

**Fichier:** `src/components/guards/RoleGuard.tsx`

**Usage:** Protection des routes basée sur le rôle global minimum requis.

```tsx
<RoleGuard minRole="franchisor_user">
  <ProtectedPage />
</RoleGuard>
```

**Props:**
- `minRole: GlobalRole` - Rôle minimum requis (N0-N6)
- `children: ReactNode` - Contenu à protéger
- `fallback?: ReactNode` - Contenu alternatif si non autorisé (optionnel)

**Comportement:**
- Vérifie `hasMinimumRole(userRole, minRole)` via `roleMatrix.ts`
- Redirige vers `/` si accès refusé (ou affiche fallback)
- N6 (superadmin) a toujours accès

---

### 2. `ModuleGuard`

**Fichier:** `src/components/guards/ModuleGuard.tsx`

**Usage:** Protection des routes basée sur l'activation d'un module.

```tsx
<ModuleGuard moduleKey="apogee_tickets">
  <TicketsPage />
</ModuleGuard>
```

**Props:**
- `moduleKey: string` - Clé du module à vérifier
- `requiredOptions?: string[]` - Options spécifiques requises (optionnel)
- `children: ReactNode` - Contenu à protéger

**Comportement:**
- Vérifie `enabled_modules[moduleKey].enabled === true`
- Si `requiredOptions`, vérifie aussi `options[option] === true`
- N5+ bypass automatique (admins voient tout)
- Redirige vers `/` si module non activé

---

### 3. `SupportConsoleGuard`

**Fichier:** `src/components/guards/SupportConsoleGuard.tsx`

**Usage:** Protection stricte de la console support (N5+ uniquement).

```tsx
<SupportConsoleGuard>
  <SupportConsolePage />
</SupportConsoleGuard>
```

**Props:**
- `children: ReactNode` - Contenu à protéger

**Comportement:**
- Vérifie `canAccessSupportConsole` depuis `AuthContext`
- **Strictement N5+** - Pas de bypass via module option
- Redirige vers `/support` si non autorisé

---

## Usage dans App.tsx

```tsx
// Route protégée par rôle
<Route 
  path="/admin/*" 
  element={
    <RoleGuard minRole="franchisor_user">
      <AdminLayout />
    </RoleGuard>
  } 
/>

// Route protégée par module
<Route 
  path="/pilotage/*" 
  element={
    <ModuleGuard moduleKey="pilotage_agence">
      <PilotageLayout />
    </ModuleGuard>
  } 
/>

// Route avec double protection
<Route 
  path="/support/console" 
  element={
    <SupportConsoleGuard>
      <SupportConsolePage />
    </SupportConsoleGuard>
  } 
/>
```

---

## Vérifications dans AuthContext

Le `AuthContext` expose plusieurs flags calculés pour les guards :

| Flag | Description | Source |
|------|-------------|--------|
| `canAccessSupport` | Peut créer tickets support | Toujours `true` pour authentifiés |
| `canAccessSupportConsole` | Accès console support | `global_role >= N5` |
| `isFranchisor` | Est franchiseur | `global_role >= N3` |
| `isAdmin` | Est admin plateforme | `global_role >= N5` |

---

## Fonctions Utilitaires (roleMatrix.ts)

```typescript
// Vérifier si l'utilisateur a le rôle minimum
hasMinimumRole(userRole: GlobalRole, requiredRole: GlobalRole): boolean

// Vérifier si un module est activé
hasModule(moduleKey: string): boolean

// Vérifier une option de module
hasModuleOption(moduleKey: string, optionKey: string): boolean

// Obtenir les capacités de gestion utilisateur
getUserManagementCapabilities(userRole: GlobalRole): {
  canManage: boolean;
  manageableRoles: GlobalRole[];
  manageScope: 'ownAgency' | 'assignedAgencies' | 'all';
}
```

---

## Filtrage Navigation (Sidebar & Dashboard)

### Sidebar (`UnifiedSidebar.tsx`)

```typescript
// Filtrage des groupes de navigation
const filteredGroups = NAVIGATION_GROUPS.filter(group => {
  // Vérifier le rôle minimum
  if (group.minRole && !hasMinimumRole(globalRole, group.minRole)) return false;
  
  // Vérifier le module requis
  if (group.requiresModule && !hasModule(group.requiresModule)) return false;
  
  return true;
});
```

### Dashboard (`Landing.tsx`)

```typescript
// Filtrage des tiles
const visibleTiles = DASHBOARD_TILES.filter(tile => {
  // Vérifier le module
  if (tile.requiresModule && !hasModule(tile.requiresModule)) return false;
  
  // Vérifier requiresFranchisor
  if (tile.requiresFranchisor && !isFranchisor) return false;
  
  // Vérifier requiresAdmin (N5+)
  if (tile.requiresAdmin && !hasMinimumRole(globalRole, 'platform_admin')) return false;
  
  return true;
});
```

---

## Bonnes Pratiques

1. **Utiliser le guard approprié** - `RoleGuard` pour les rôles, `ModuleGuard` pour les modules
2. **Ne pas dupliquer les vérifications** - Si un guard protège la route, pas besoin de revérifier dans le composant
3. **Fallback explicite** - Toujours prévoir un comportement en cas d'accès refusé
4. **Logs pour debug** - Les guards loggent les refus d'accès en développement
5. **Tests** - Vérifier les guards avec différents profils utilisateur

---

*Dernière mise à jour : 2025-12-04*
