# Refonte du système de modules/permissions

## Étape 1 : Source unique consolidée ✅ FAIT

### Changements effectués

1. **`src/types/modules.ts`** :
   - Ajout `category: ModuleCategory` (type union: agence, rh, parc, outils, documents, guides, ticketing, support, commercial, reseau, admin)
   - Ajout `deployed?: boolean` — si `false`, le module est masqué des permissions ET des plans
   - `planning_augmente` → `deployed: false` (en développement)
   - `prospection` → `deployed: false` (pas encore déployé officiellement)
   - Export `DEPLOYED_MODULES` = modules filtrés par `deployed !== false`
   - `PLAN_VISIBLE_MODULES` filtre aussi les non-déployés

2. **`src/components/users/UserModulesTab.tsx`** :
   - Suppression de TOUTES les maps hardcodées
   - Dérivation complète depuis `DEPLOYED_MODULES` + `MODULE_DEFINITIONS`
   - Affichage en arbre : Module → Options (en escalier avec └)
   - Catégories basées sur `moduleDef.category`

3. **`src/components/admin/views/PlansManagerView.tsx`** :
   - Affichage en arbre avec catégories groupées
   - Options expandables par module (chevron)
   - Filtrage des modules non déployés

## Étape 2 : Gestion fine des options dans les plans ✅ FAIT

### Changements effectués

1. **`PlansManagerView.tsx`** : Options togglables individuellement par plan via `options_override` JSONB
2. Logique 3 états: hérité | activé | exclu. Toggle parent reset les overrides.

## Étape 3 : Cascade Plan → Rôle → Override utilisateur ✅ FAIT

### Changements effectués

1. **RPC `get_user_effective_modules`** (migration SQL) :
   - Cascade serveur: Plan agence (`plan_tier_modules`) → User overrides (`user_modules`)
   - Récupère le plan actif de l'agence via `agency_subscription`
   - Fusionne options plan + options user (user gagne)
   - Modules user hors plan aussi retournés (grants explicites)

2. **`src/hooks/access-rights/useEffectiveModules.ts`** :
   - Ajout filtre par rôle côté client via `MODULE_DEFINITIONS.minRole`
   - Fonction `filterByRole()` : compare `GLOBAL_ROLES[userRole]` vs `GLOBAL_ROLES[moduleDef.minRole]`
   - N5+ bypass le filtre rôle (accès total)
   - Modules legacy sans définition passent le filtre (rétrocompat)

3. **Cascade complète** :
   ```
   Plan agence (plan_tier_modules)
     → Merge user overrides (user_modules prennent le dessus)  [serveur]
     → Filtre par rôle (MODULE_DEFINITIONS.minRole)            [client]
     → N5+ bypass complet                                      [client]
   ```

## Étape 4 : TODO — Fusionner/nettoyer feature flags
- Décider du sort de la table `feature_flags` vs `MODULE_DEFINITIONS`
