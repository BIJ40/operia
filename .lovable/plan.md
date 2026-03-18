

# Analyse et plan : Accessibilité des modules dans la navigation

## Fonctionnement actuel

### Modules "En cours de développement" (`is_deployed = false`)

**Ce qui se passe aujourd'hui** : La RPC `get_user_effective_modules` ne retourne que les modules avec `is_deployed = true`. Donc pour un utilisateur lambda, ces modules n'apparaissent pas — correct.

**Probleme pour les admins N5+** : Le moteur de permissions (`permissionsEngine.ts` ligne 84) fait un bypass total : `hasAccess()` retourne `true` pour TOUS les modules, y compris les non-deployes. Et `getEffectiveModules()` (ligne 216-237) ajoute TOUS les modules de `MODULE_DEFINITIONS` avec `enabled: true` et `source: 'bypass'`, sans verifier `is_deployed`.

Consequence : dans `PilotageTabContent`, `hasModule('pilotage.rentabilite')` retourne `true` pour un admin → l'onglet est visible et cliquable dans la navigation. **Ce n'est pas le comportement souhaite.**

### Modules deployes (`is_deployed = true`)

**Si le plan/overwrite autorise** : Le sous-onglet est cliquable. Correct.

**Si le plan/overwrite n'autorise pas** : Dans `PilotageTabContent` (ligne 57-60), les sous-onglets ont `disabled: !hasModule(...)` → ils apparaissent **grisés mais visibles**. C'est le comportement souhaite.

**Dans le header dropdown** : Les enfants de chaque groupe sont filtres par `visibleIds.has(child.tab)` (MainHeader ligne 28). Ce filtre ne porte que sur le **tab parent** (pilotage, commercial...), pas sur le sous-module individuel. Donc si l'onglet Pilotage est visible, TOUS ses enfants dans le dropdown apparaissent cliquables, sans etat grise. **Ce n'est pas le comportement souhaite** pour les sous-modules inaccessibles.

## Modifications necessaires

### 1. Cacher les modules non deployes de la navigation, y compris pour les admins

**Probleme racine** : Le bypass N5+ dans `getEffectiveModules` ne distingue pas "deploye" de "non deploye".

**Solution** : Ajouter un Set `deployedModuleKeys` dans le `PermissionsContext`, alimente par les cles retournees par la RPC (qui ne contient que les modules deployes). Pour les N5+, completer avec les cles de `MODULE_DEFINITIONS` qui sont marquees `is_deployed = true` dans le registre.

Concretement :
- **`AuthContext.tsx`** : Stocker les cles brutes retournees par la RPC dans un `Set<string>` (`rpcModuleKeys`)
- **`PermissionsContext.tsx`** : Exposer un nouveau `isDeployedModule(key: ModuleKey): boolean` qui verifie si la cle est dans le Set RPC (pour les non-admins) ou dans le registre deploye (pour les admins)
- **`PilotageTabContent.tsx`** et les autres TabContent : Utiliser `isDeployedModule` en plus de `hasModule` pour determiner la visibilite :
  - `!isDeployedModule(key)` → **cache** (pas dans la liste)
  - `isDeployedModule(key) && !hasModule(key)` → **visible grise**
  - `isDeployedModule(key) && hasModule(key)` → **visible cliquable**

Approche alternative plus simple : Charger les cles deployees via une requete legere `select key from module_registry where is_deployed = true` dans le contexte auth, et l'exposer dans `PermissionsContext`.

### 2. Greyer les sous-modules inaccessibles dans le header dropdown

**`HeaderNavDropdown.tsx`** : Les enfants avec `scope` doivent etre rendus en grise + non-cliquables si le module est deploye mais pas accessible.

- Passer `hasModule` et `isDeployedModule` en props au dropdown
- Pour chaque `child` avec `scope` :
  - Si non deploye → masquer
  - Si deploye mais `!hasModule(scope)` → afficher grise, `pointer-events-none`, opacity reduite
  - Sinon → afficher normalement

### 3. L'acces admin via le lien dans la page Droits reste inchange

`ModuleGuard` (qui protege les routes) continue d'utiliser `hasAccess()` avec le bypass N5+. Donc quand un admin clique sur le lien dans la page Droits, il accede au module meme s'il n'est pas deploye. C'est le comportement souhaite.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `AuthContext.tsx` | Stocker les cles deployees (depuis RPC ou requete supplementaire) |
| `PermissionsContext.tsx` | Exposer `isDeployedModule(key)` |
| `PilotageTabContent.tsx` | Filtrer les onglets : cacher non-deployes, greyer non-accessibles |
| `CommercialTabContent.tsx` | Idem |
| `OrganisationTabContent.tsx` | Idem |
| `MainHeader.tsx` | Passer les checkers de deploiement au dropdown |
| `HeaderNavDropdown.tsx` | Supporter l'etat grise pour les enfants non-accessibles, cacher les non-deployes |
| `filterNavigationByPermissions.ts` | Ajouter `isDeployedModule` aux `PermissionCheckers` |

## Resume du comportement cible

```text
                          Non deploye          Deploye + pas acces     Deploye + acces
Navigation (tous)         CACHE                VISIBLE GRISE           VISIBLE CLIQUABLE
Navigation (admins)       CACHE                VISIBLE CLIQUABLE       VISIBLE CLIQUABLE
Acces direct (admins)     OUI (via lien)       OUI                     OUI
Acces direct (lambda)     NON                  NON (ModuleGuard)       OUI
```

