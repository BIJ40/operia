# Refonte du système de modules/permissions

## Étape 1 : Source unique consolidée ✅ FAIT
## Étape 2 : Gestion fine des options dans les plans ✅ FAIT
## Étape 3 : Cascade Plan → Rôle → Override utilisateur ✅ FAIT
## Étape 4 : Nettoyage legacy ✅ FAIT

## Audit Remédiation — Sprint 1 ✅ FAIT (P0)
## Audit Remédiation — Sprint 2 ✅ FAIT (P1 + P2-4)
## Audit Remédiation — Sprint 3 ✅ FAIT (Archi + Perf)
## Audit Remédiation — Sprint 4 ✅ FAIT (Sécurité + Hygiène)
## Audit Remédiation — Sprint 5 ✅ FAIT (Qualité code)

---

# AUDIT FINAL — Plan de Correction V2

## Sprint 6 — Code Hygiene & Dead Code ✅ FAIT

### S6-1: ✅ Supprimé `getAssignableRoles()` et le `require()` ESM
### S6-2: ✅ Synchronisé permissionsEngine Edge — 16 ModuleKey V3 + MODULE_COMPAT_MAP legacy
### S6-3: ✅ `vite-plugin-pwa` → 0.21.1 (xlsx reste 0.18.5 — pas de fix publié)

## Sprint 7 — Tests & Fiabilité ✅ FAIT

### S7-1: ✅ 31 tests unitaires du moteur de permissions (hasAccess, getEffectiveModules, validateUserPermissions, getUserManagementCapabilities)

### S7-2: Tests du module registry
- **Fichier:** `src/permissions/__tests__/moduleRegistry.test.ts` (à créer)
- **Couverture:** Validation des définitions, options valides, modules déployés

## Sprint 8 — Performance & Scalabilité (P1)

### S8-1: Pagination cursor-based sur les listes volumineuses
- **Modules concernés:** Tickets Apogée, Collaborateurs, Activity Log
- **Cause:** Chargement complet en mémoire → problème dès >500 items
- **Action:** Implémenter `useInfiniteQuery` avec cursor-based pagination

### S8-2: Memoization `usePersonalKpis`
- **Fichier:** `src/hooks/usePersonalKpis.ts`
- **Cause:** Calculs lourds (CA, heures, dossiers) recalculés à chaque render
- **Action:** Wrapper les calculs intermédiaires dans `useMemo`

### S8-3: Purge automatique tables temporaires
- **Tables:** `rate_limits`, `ai_search_cache`
- **Cause:** Accumulation sans nettoyage (cleanup probabiliste 1% insuffisant)
- **Action:** Créer un cron SQL quotidien de purge

## Sprint 9 — Observabilité & DevOps (P2)

### S9-1: Health check endpoint
- **Fichier:** `supabase/functions/health-check/index.ts` (à créer)
- **Action:** Edge function qui vérifie DB connectivity + auth service
- **Impact:** Monitoring basique de disponibilité

### S9-2: Centraliser `console.error` → logger
- **Fichier:** 95+ fichiers concernés
- **Cause:** `console.error()` dans catch blocks expose stack traces en production
- **Action:** Migration progressive vers `logError()` du logger centralisé (`src/lib/logger.ts`)
- **Priorité:** Commencer par les fichiers services/hooks critiques

### S9-3: Sentry côté Edge Functions
- **Fichier:** `supabase/functions/_shared/sentry.ts` (existe déjà)
- **Cause:** Utilisation non systématique dans toutes les edge functions
- **Action:** Wrapper toutes les edge functions avec `withSentry()` ou try/catch + reportError

## Sprint 10 — UX & Polish (P2)

### S10-1: Tokens sémantiques pour badges de rôles
- **Fichier:** `src/types/globalRoles.ts:46-54`
- **Cause:** Classes Tailwind hardcodées (`bg-gray-100 text-gray-800`)
- **Action:** Utiliser des tokens sémantiques du design system

### S10-2: Transition CSS sur changement de thème
- **Fichier:** `src/index.css` ou composant ThemeProvider
- **Cause:** Changement de thème instantané sans animation
- **Action:** Ajouter `transition: background-color 0.3s, color 0.3s` sur `body`

### S10-3: Option `faq_admin` manquante dans admin_plateforme
- **Fichier:** `src/types/modules.ts` (MODULE_DEFINITIONS)
- **Cause:** `admin_plateforme.faq_admin` défini dans constants.ts mais absent de MODULE_DEFINITIONS
- **Action:** Ajouter l'option dans MODULE_DEFINITIONS pour cohérence

---

## Actions manuelles (hors code)

### M-1: Activer Leaked Password Protection
- **Où:** Supabase Dashboard → Auth → Settings → Leaked Password Protection
- **Impact:** Bloque la création de comptes avec mots de passe compromis

### M-2: Partitionnement tables d'audit (>100 orgs)
- **Tables:** `activity_log`, `apogee_ticket_history`
- **Quand:** Quand volume > 1M lignes
- **Action:** Partitionner par mois avec `pg_partman`

---

## Priorités d'exécution

| Sprint | Priorité | Effort estimé | Risque résolu |
|--------|----------|---------------|---------------|
| **S6** | P0 | 1-2h | Dead code, sync permissions, vulnérabilités |
| **S7** | P1 | 2-3h | Absence de tests permissions |
| **S8** | P1 | 3-4h | Scalabilité listes, calculs lourds |
| **S9** | P2 | 2-3h | Observabilité, logs production |
| **S10** | P2 | 1-2h | Polish UX, cohérence design system |

## Score cible après correction

| Dimension | Actuel | Cible |
|-----------|--------|-------|
| Architecture | 7.5 | 8.5 |
| Sécurité | 8.0 | 9.0 |
| Performance | 7.5 | 8.5 |
| Permissions | 8.5 | 9.5 |
| Scalabilité | 6.5 | 8.0 |
| DevOps | 7.0 | 8.5 |
| **Global** | **7.4** | **8.5** |
