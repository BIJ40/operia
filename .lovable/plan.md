

## Plan : Onglet Relations visible par altModules uniquement

### Problème
Actuellement, `isWorkspaceTabVisible` (ligne 34) retourne `true` immédiatement si `requiresOption` est absent — l'onglet serait toujours visible. Il faut aussi gérer le cas d'un onglet sans `requiresOption` mais avec `altModules`.

### Changements

**1. `src/components/layout/WorkspaceNavLinks.tsx` (ligne 50)**
- Retirer `requiresOption: { module: 'relations' }`, garder uniquement `altModules`

```ts
{ id: 'relations', label: getShortLabel('relations', 'Relations'), icon: Handshake, altModules: ['relations.suivi_client', 'relations.apporteurs', 'relations.echanges'] },
```

**2. `src/lib/filterNavigationByPermissions.ts` (ligne 33-34)**
- Modifier la condition "no guard" pour aussi vérifier `altModules` : un onglet sans `requiresOption` ET sans `altModules` est toujours visible, mais un onglet avec `altModules` doit passer la vérification

```ts
// No guard = always visible (accueil, support)
if (!tab.requiresOption && !tab.altModules) return true;

// Platform admin bypass
if (perms.isPlatformAdmin) return true;

// Admin tab: role-only guard
if (tab.id === 'admin') return false;

// Ticketing
if (tab.id === 'ticketing') return perms.hasModule('ticketing' as ModuleKey);

// Check primary module (if defined)
if (tab.requiresOption) {
  const { module, option } = tab.requiresOption;
  if (option) {
    if (perms.hasModuleOption(module as ModuleKey, option)) return true;
  } else {
    if (perms.hasModule(module as ModuleKey)) return true;
  }
}

// Check alternative modules
if (tab.altModules) {
  for (const altModule of tab.altModules) {
    if (perms.hasModule(altModule as ModuleKey)) return true;
  }
}

return false;
```

**3. Vérifier `UnifiedWorkspace.tsx`** — appliquer le même changement si l'onglet Relations y est aussi défini avec `requiresOption`.

