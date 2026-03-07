# Refonte du système de modules/permissions

## Étape 1 : Source unique consolidée ✅ FAIT
- `MODULE_DEFINITIONS` dans `src/types/modules.ts` = source unique
- `category: ModuleCategory` + `deployed?: boolean` par module
- `DEPLOYED_MODULES` / `PLAN_VISIBLE_MODULES` auto-dérivés

## Étape 2 : Gestion fine des options dans les plans ✅ FAIT
- `PlansManagerView` : options togglables individuellement via `options_override` JSONB
- Logique 3 états: hérité | activé | exclu

## Étape 3 : Cascade Plan → Rôle → Override utilisateur ✅ FAIT
- RPC `get_user_effective_modules` : Plan agence → User overrides (serveur)
- `useEffectiveModules` : filtre par `minRole` (client)
- N5+ bypass complet

## Étape 4 : Nettoyage legacy ✅ FAIT

### Changements effectués

1. **`src/permissions/constants.ts`** :
   - Réécrit proprement avec modules V3 comme source principale
   - Legacy entries conservées en section `// Legacy compat` annotée
   - `@deprecated` sur MODULE_MIN_ROLES et MODULE_LABELS (utiliser MODULE_DEFINITIONS)

2. **`src/contexts/AuthContext.tsx`** :
   - `isSupport` vérifie maintenant `aide` ET `support` (legacy compat)
   - Support agent/admin detection cherche `aide` en priorité, `support` en fallback

3. **`src/types/accessControl.ts`** :
   - `isSupportAgent()` et `isSupportAdmin()` vérifient `aide` + `support`

4. **`src/contexts/DataPreloadContext.tsx`** :
   - Suppression fallback `pilotage_agence.stats_hub` (utilise `stats.stats_hub` uniquement)

5. **`src/hooks/useGlobalFeatureFlags.ts`** :
   - Simplifié : plus de mapping legacy complexe
   - Note claire : "outil de dev tracking, pas de permissions"

6. **`src/hooks/access-rights/useEffectiveModules.ts`** :
   - `MODULE_COMPAT_MAP` conservé (seul endroit de rétrocompat runtime)
   - Sera supprimé quand `user_modules` sera migré en base

### Ce qui reste legacy (volontairement conservé)
- `MODULES` const dans `types/modules.ts` : clés legacy (help_academy, etc.) pour le type ModuleKey
- `EnabledModules` interface : propriétés legacy pour rétrocompat
- `MODULE_COMPAT_MAP` dans `useEffectiveModules` : mapping runtime
- `sitemapData.ts` : guards legacy (à migrer vers nouveaux module keys)
