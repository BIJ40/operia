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

---

## Audit Remédiation — Sprint 1 ✅ FAIT (P0)
- P0-1: Secret migrate-export → `Deno.env.get('MIGRATION_SECRET')`
- P0-2: XSS HcServicesSection → `createSanitizedHtml()`
- P0-3: Session OTP 365j → 90j
- P0-4: CORS `*` create-dev-account → `_shared/cors.ts`
- P0-5: `useMemo` AuthContext provider value
- P0-6: `useMemo` accessContext
- P0-7: Onglet TEST → `import.meta.env.DEV` only
- P1-1: `Promise.all` loadUserData (profil + modules en parallèle)

## Audit Remédiation — Sprint 2 ✅ FAIT (P1 + P2-4)
- P1-2: CRON_SECRET sur compute-apporteur-metrics + media-garbage-collector
- P1-3: Dynamic import xlsx (−200KB bundle)
- P1-4: Guides disabled tabs masqués (non plus grisés)
- P1-5: Table dupliquée sensitive_data_access_log supprimée
- P1-6: 10 index FK créés (tickets, comments, history, attachments, activity_log, collaborators)
- P2-4: CORS migrate-export → `_shared/cors.ts` + `withCors`
