

# Analyse du systeme de permissions et plan d'action

## Reponse a ta question : qui a acces par defaut ?

Le systeme actuel fonctionne ainsi :
- **N5+ (platform_admin, superadmin)** : bypass total, acces a tout sans verifier les modules
- **Autres roles** : acces uniquement si le module est dans `defaultForRoles` du role OU explicitement active dans `user_modules`
- **Par defaut pour un utilisateur normal (franchisee_admin)** : `agence`, `stats`, `rh`, `parc`, `divers_*`, `guides`, `aide` sont actifs. `ticketing`, `prospection`, `planning_augmente` sont desactives.

## Le probleme identifie

Il y a **deux catalogues de modules desynchronises** :

1. **`MODULE_DEFINITIONS`** dans `src/types/modules.ts` : la source de verite avec 15+ modules et toutes leurs options
2. **`MODULE_CATALOG`** dans `PlansManagerView.tsx` : une liste **hardcodee de 10 modules seulement**, qui manque `ticketing`, `prospection`, `planning_augmente`
3. **`PLAN_VISIBLE_MODULES`** dans `types/modules.ts` : encore une autre liste de 11 modules

Quand on ajoute une fonctionnalite, il faut modifier **3 endroits manuellement**. C'est la source du probleme.

## Plan de correction

### 1. Supprimer `MODULE_CATALOG` hardcode de `PlansManagerView.tsx`
Remplacer par une generation automatique depuis `MODULE_DEFINITIONS` :
- Filtrer les modules ou `adminOnly !== true` (exclut reseau, admin)
- Generer le `group` depuis la cle (`divers_*` → groupe "Divers")
- Resultat : tout nouveau module dans `MODULE_DEFINITIONS` apparait automatiquement dans les plans

### 2. Remplacer `PLAN_VISIBLE_MODULES` hardcode
Le transformer en derivation automatique :
```text
PLAN_VISIBLE_MODULES = MODULE_DEFINITIONS
  .filter(m => !m.adminOnly)
  .map(m => m.key)
```

### 3. S'assurer que `UserModulesTab` (permissions individuelles) utilise aussi `MODULE_DEFINITIONS`
Verifier qu'il n'y a pas un 3eme catalogue hardcode pour l'edition des permissions utilisateur.

### Fichiers modifies
- `src/types/modules.ts` : `PLAN_VISIBLE_MODULES` devient derive
- `src/components/admin/views/PlansManagerView.tsx` : suppression `MODULE_CATALOG`, utilisation `MODULE_DEFINITIONS`

### Resultat
Ajouter un module = **1 seul endroit** (`MODULE_DEFINITIONS`). Il apparait automatiquement dans :
- La configuration des plans
- Les permissions individuelles
- Les badges inline
- Les guards de route

