# AXE 4 — Sécurité

> Audit production-grade Operia — 2026-03-08

---

## 1. Authentification

### 1.1 Sessions JWT (GoTrue)
- **Token storage**: localStorage (standard Supabase) ✅
- **Auto-refresh**: activé (`autoRefreshToken: true`) ✅
- **Session persistence**: activé ✅
- **Password recovery**: Listener `PASSWORD_RECOVERY` → redirect `/reset-password` ✅
- **Compte désactivé**: Vérification `is_active` à chaque chargement profil → force signOut ✅

### 1.2 Faiblesses
- **Pas de MFA** — Aucune authentification multi-facteur
- **Pas de session revocation centralisée** — Si un token est compromis, il reste valide jusqu'à expiration
- **localStorage pour token** — Vulnérable à XSS (atténué par CSP strict)
- **`__lovable_token` stocké en localStorage ET sessionStorage** — Token de preview qui persiste inutilement

### 1.3 Protection des routes
- **RoleGuard**: Vérifie `hasMinRole(globalRole, minRole)` ✅
- **AuthRouter**: Redirige apporteurs vers leur espace ✅
- **Redirect non-auth**: `Navigate to="/"` ✅
- **Pas de page de login dédiée** — Le composant login est intégré dans le workspace

## 2. Permissions

### 2.1 Cohérence Frontend/Backend

| Vérification | Frontend | Backend (Edge) | Backend (RLS) |
|---|---|---|---|
| Rôle global (N0-N6) | ✅ permissionsEngine.ts | ✅ _shared/auth.ts | ✅ has_min_global_role() |
| Modules | ✅ hasAccess() | ⚠️ Partiel (fallback role-only) | ✅ has_module_v2() RPC |
| Options modules | ✅ hasModuleOption() | ⚠️ Fallback (N5+ only) | ✅ has_module_option_v2() |
| Agence | ✅ agencyId check | ✅ assertAgencyAccess() | ✅ RLS agency_id |

**Problème critique**: Les fonctions `hasModule()` et `hasModuleOption()` dans `_shared/auth.ts` sont marquées DEPRECATED et **retournent toujours `false` sauf pour N5+**. Cela signifie que les Edge Functions qui utilisent ces fonctions (au lieu de SQL) refusent l'accès aux utilisateurs N0-N4 même s'ils ont le module activé.

### 2.2 Anti-escalade de privilèges
- **create-user**: `canEditTarget()` vérifie que le créateur ne peut pas créer un rôle supérieur au sien ✅
- **delete-user**: Vérification similaire ✅
- **Mais**: La vérification se fait côté Edge Function, pas côté RLS → si la fonction a un bug, l'escalade est possible

### 2.3 Bypass possibles
- **N5/N6 bypass tous les modules** → documenté et intentionnel ✅
- **`verify_jwt = false`** sur 13 Edge Functions → chacune doit implémenter sa propre auth :

| Fonction | verify_jwt | Auth manuelle | Risque |
|---|---|---|---|
| `maintenance-alerts-scan` | false | CRON_SECRET attendu | ✅ si secret présent |
| `qr-asset` | false | Public (QR codes) | ✅ Intentionnel |
| `generate-monthly-report` | false | Auth manuelle | ⚠️ À vérifier |
| `purge-old-reports` | false | CRON job | ⚠️ À vérifier |
| `trigger-monthly-reports` | false | CRON job | ⚠️ À vérifier |
| `epi-generate-monthly-acks` | false | CRON job | ⚠️ À vérifier |
| `apporteur-auth-*` (×4) | false | Custom OTP | ✅ Justifié |
| `media-get-signed-url` | false | Auth manuelle | ⚠️ Critique |
| `media-garbage-collector` | false | CRON job | ⚠️ À vérifier |
| `compute-apporteur-metrics` | false | CRON job | ⚠️ À vérifier |
| `export-all-data` | false | getClaims() | ⚠️ Auth applicative |
| `email-to-ticket` | false | Webhook inbound | ⚠️ À vérifier |
| `reply-ticket-email` | false | ? | 🔴 À auditer |
| `notify-new-ticket` | false | ? | 🔴 À auditer |
| `migrate-export` | false | ? | 🔴 À auditer |

## 3. Secrets

### 3.1 Secrets côté Edge Functions
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — gérés par Supabase ✅
- `RESEND_API_KEY` — secret Supabase ✅
- `SENTRY_DSN` — secret Supabase ✅
- `SENSITIVE_DATA_ENCRYPTION_KEY` — secret Supabase ✅ (critique)
- `CRON_SECRET` — attendu mais non audité
- Clés API Apogee — stockage non audité

### 3.2 Exposition frontend
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — clés publiques ✅
- `VITE_SENTRY_DSN` — publique (standard) ✅
- `VITE_MAPBOX_TOKEN` — si présent, publique (pas idéal mais standard Mapbox)
- **Aucune clé privée détectée dans le code source** ✅
- **Audit `auditExposedSecrets()` en mode dev** ✅

### 3.3 Risques
- **`SENSITIVE_DATA_ENCRYPTION_KEY`** — Perte = données RGPD irrécupérables 🔴
- **Pas de rotation de secrets documentée**
- **SERVICE_ROLE_KEY** utilisée dans plusieurs Edge Functions → compromission = accès total DB

## 4. Storage

### 4.1 Accès fichiers
- **Signed URLs** via Edge Function `media-get-signed-url` ✅
- **Durée signed URLs** non auditée (vérifier si trop longue)
- **Buckets permissions** — gérés par RLS Storage (non audité dans ce scope)

### 4.2 Upload
- **Validation taille** côté client (5MB images, limites documents) ✅
- **Validation type MIME** — partielle (vérifié sur certains uploads)
- **Pas de scan antivirus** sur les uploads

## 5. CSP (Content Security Policy)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.gpteng.co https://fonts.googleapis.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co 
            https://api.mapbox.com https://events.mapbox.com 
            https://fonts.googleapis.com https://fonts.gstatic.com 
            https://*.sentry.io https://*.lovable.app;
object-src 'none';
base-uri 'self';
```

**Analyse**:
- ✅ `object-src 'none'` — bloque Flash/plugins
- ✅ `base-uri 'self'` — empêche injection de `<base>`
- ⚠️ `'unsafe-inline'` sur script-src et style-src — nécessaire pour Vite/React mais réduit la protection XSS
- ⚠️ Via `<meta>` tag, pas header serveur — moins robuste (peut être override par injection HTML avant le meta)
- ⚠️ `frame-src 'self'` — pourrait être `'none'` si pas d'iframe utilisé

## 6. Score sécurité

| Domaine | Score |
|---|---|
| Authentification | 7/10 (pas de MFA, token en localStorage) |
| Autorisation | 7/10 (bonne hiérarchie, mais Edge Functions auth deprecated) |
| Secrets | 8/10 (bien stockés, mais rotation absente) |
| CSP | 6/10 (unsafe-inline, meta tag) |
| Storage | 6/10 (signed URLs OK, pas de scan antivirus) |
| **Global** | **7/10** |
