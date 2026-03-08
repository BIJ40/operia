# LOT 2 — Rapport d'industrialisation avancée

> Date : 2026-03-08  
> Statut : ✅ Complété  
> Principe : Aucune modification de comportement métier

---

## 1. Ce qui a été ajouté

### AXE 1 — Tests E2E (Playwright)
- **Dossier** : `tests/e2e/`
- **5 suites de tests** couvrant les parcours critiques :
  - `auth.spec.ts` : login valide, login refusé, persistance session
  - `permissions.spec.ts` : accès base_user, franchisee_admin, platform_admin
  - `tickets.spec.ts` : liste, détail, commentaire
  - `admin-users.spec.ts` : liste utilisateurs, dialog détail
  - `backup.spec.ts` : export JSON/TXT
- **Infrastructure** : config Playwright, helpers partagés, credentials test

### AXE 2 — Tests d'intégration Edge Functions
- **Dossier** : `supabase/functions/tests/`
- **4 suites Deno** :
  - `sensitive-data.test.ts` : auth refusée, action invalide, CORS
  - `create-user.test.ts` : auth refusée, body vide, CORS
  - `export-all-data.test.ts` : auth refusée, non-admin rejeté, CORS
  - `media-get-signed-url.test.ts` : auth, path manquant, CORS, origin malveillante

### AXE 3 — Observabilité backend
- **Module** : `src/lib/observability/index.ts`
- **API** : `createLogger({ module, userId, agencyId })` → `.info()`, `.warn()`, `.error()`, `.debug()`
- Logs structurés avec timestamp, module, userId, agencyId, requestId
- Intégration Sentry automatique pour les erreurs
- Production : warn/error uniquement. Dev : tous niveaux.

### AXE 4 — Monitoring DB
- **Fichier** : `supabase/health-checks.sql`
- **7 catégories de vérifications** :
  - Orphelins collaborators/profiles
  - Références modules/statuts invalides
  - Désynchronisation profiles↔collaborators
  - Anomalies rate limits (spikes >50/h)
  - Sessions apporteur expirées non révoquées
  - Documents orphelins
  - Résumé santé global (requête unique)

### AXE 5 — Monitoring Edge Functions
- **Module** : `src/lib/edge-monitor.ts`
- `monitorEdgeCall()` : wrapper pour mesurer durée, capturer erreurs
- Détection appels lents (>3s par défaut)
- Buffer métriques in-memory (dev)
- `getEdgeMetricsSummary()` : stats agrégées par fonction

### AXE 6 — Hardening Self-host
- **Module** : `src/lib/observability/security-headers-check.ts`
- `verifySecurityHeaders()` : vérifie CSP, X-Frame-Options, X-Content-Type-Options
- `auditExposedSecrets()` : détecte service_role_key, clés privées exposées
- Détection `unsafe-eval` dans CSP
- Vérifie localStorage pour patterns de secrets

### AXE 7 — Documentation architecture
- **Fichier** : `docs/operia-architecture.md`
- Architecture complète : stack, permissions, edge functions, DB, sécurité
- Hiérarchie rôles documentée (N0→N6)
- Tables critiques, triggers, RPC
- Organisation code source
- Dette technique identifiée

---

## 2. Tests ajoutés

| Type | Fichiers | Parcours couverts |
|------|----------|-------------------|
| E2E Playwright | 5 specs | Auth, Permissions, Tickets, Admin, Backup |
| Edge Function Deno | 4 tests | sensitive-data, create-user, export-all-data, media-get-signed-url |
| **Total** | **9 fichiers** | **~25 test cases** |

---

## 3. Points instrumentés

| Couche | Instrumentation |
|--------|-----------------|
| Frontend logging | Logger structuré (module, userId, agencyId, timestamp) |
| Edge calls client | Durée, erreurs, appels lents |
| DB santé | 7 catégories de health checks SQL |
| Sécurité | Headers, secrets, CSP audit |

---

## 4. Hardening ajouté

- ✅ Vérification headers sécurité (CSP, X-Frame-Options, X-Content-Type-Options)
- ✅ Audit secrets exposés (service_role_key, clés privées, localStorage)
- ✅ Détection unsafe-eval dans CSP
- ✅ Tests CORS origin malveillante sur edge functions
- ✅ Rate limit consolidé documenté (`rateLimit.ts` préféré)

---

## 5. Dette restante

| Zone | Description | Priorité |
|------|-------------|----------|
| Logger legacy | `src/lib/logger.ts` coexiste avec le nouveau `observability/` | Faible |
| Rate limiter dual | `rateLimiter.ts` + `rateLimit.ts` — legacy documenté | Faible |
| Sync triggers | profiles↔collaborators fragile — health checks en place | Moyen |
| Edge functions non testées | ~56 fonctions sans tests dédiés | Moyen |
| E2E : données de test | Nécessite seed-test-users pour fonctionner | Moyen |
| CSP via meta tag | Header serveur serait plus robuste | Faible |
| Monitoring centralisé | Pas de dashboard unifié (dépend de Sentry) | Faible |
