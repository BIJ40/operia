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
   - Suppression de TOUTES les maps hardcodées (MODULE_CATEGORY_MAP, MODULE_ICONS, OPTIONS_BY_ROLE, OPTION_FEATURES, OPTION_TARGET_USERS)
   - Dérivation complète depuis `DEPLOYED_MODULES` + `MODULE_DEFINITIONS`
   - Affichage en arbre : Module → Options (en escalier avec └)
   - Filtrage automatique des modules legacy et non déployés
   - Catégories basées sur `moduleDef.category`

3. **`src/components/admin/views/PlansManagerView.tsx`** :
   - Affichage en arbre avec catégories groupées
   - Options expandables par module (chevron)
   - Options héritent du toggle parent pour l'instant
   - Filtrage des modules non déployés

## Étape 2 : Gestion fine des options dans les plans ✅ FAIT

### Changements effectués

1. **`src/components/admin/views/PlansManagerView.tsx`** :
   - Chaque option peut maintenant être togglée individuellement par plan
   - Utilise `options_override` JSONB dans `plan_tier_modules` (colonne existante)
   - Logique 3 états: hérité (du parent) | activé explicitement | exclu
   - Cocher le module parent propage aux enfants (reset les overrides)
   - Cliquer sur une option l'exclut individuellement
   - Re-cliquer supprime l'override (retour à héritage)
   - Légende claire avec labels "hérité" / "exclu"

2. **`src/hooks/access-rights/usePlanTiers.ts`** :
   - Le hook `useUpdatePlanTierModule` supporte déjà `optionsOverride`
   - La table `plan_tier_modules` a déjà la colonne `options_override` JSONB

## Étape 3 : TODO — Cascade Plan → Rôle → Override utilisateur
- `useEffectiveModules` doit calculer : Plan agence → filtre rôle → override utilisateur
- Montrer dans UserModulesTab ce qui vient du plan (lecture seule) vs override (éditable)

## Étape 4 : TODO — Fusionner/nettoyer feature flags
- Décider du sort de la table `feature_flags` vs `MODULE_DEFINITIONS`
