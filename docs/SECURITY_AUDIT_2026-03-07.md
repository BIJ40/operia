# 🔒 AUDIT SÉCURITÉ — 7 Mars 2026

**Auditeur** : Expert Cybersécurité SaaS (IA)  
**Version** : V0.9.1 — Permissions Unifiées  
**Scope** : Auth, sessions, permissions, RLS, Edge Functions, XSS, injections, multi-tenancy

---

## 📊 SECURITY SCORE : 7.1 / 10

| Critère | Note | Poids | Commentaire |
|---------|------|-------|-------------|
| Authentification | 8/10 | 20% | Supabase Auth + OTP custom bien séparés |
| Gestion sessions | 7/10 | 15% | Tokens hachés, mais durée session OTP excessive |
| Permissions (RBAC) | 8/10 | 20% | Système V2 solide, pas d'escalade triviale |
| RLS Supabase | 6/10 | 15% | Policies `USING(true)` restantes détectées |
| Edge Functions | 6/10 | 15% | 20 fonctions verify_jwt=false, certaines sans auth interne |
| Protection XSS | 7/10 | 10% | DOMPurify systématique sauf 1 composant |
| Secrets & env | 8/10 | 5% | Bien séparés, 1 secret hardcodé trouvé |

---

## 1. ANALYSE AUTHENTIFICATION

### 1.1 Flux Principal (Supabase Auth)
```
Client → supabase.auth.signInWithPassword() → JWT
       → AuthContext.tsx (loadUserData)
       → profiles + get_user_effective_modules RPC
       → Session localStorage (Supabase SDK)
```

**✅ Points forts :**
- `autoRefreshToken: true` — renouvellement automatique
- `persistSession: true` — survit au reload
- `getUser()` utilisé pour validation JWT (pas juste `getSession()`)
- Protection contra token refresh tab-switch (currentUserIdRef)
- Compte désactivé (`is_active=false`) → déconnexion forcée côté client + serveur
- `must_change_password` flag avec WelcomeWizardGate
- Password recovery via `onAuthStateChange('PASSWORD_RECOVERY')`

**⚠️ Points d'attention :**
- `globalRole` lu depuis `profiles.global_role` (client-side), mais validé aussi côté serveur (RPC + Edge Functions)
- Le `suggestedGlobalRole` est un fallback calculé côté client — non exploitable car les Edge Functions utilisent leur propre vérification serveur

### 1.2 Flux Apporteur (OTP Custom)
```
Email → apporteur-auth-send-code (OTP 6 chiffres, 10 min)
     → apporteur-auth-verify-code (rate limit 5/15min)
     → Session token SHA-256 hashed → apporteur_sessions
     → Cookie httpOnly (prod) / localStorage (dev)
     → apporteur-auth-validate-session (chaque appel API)
```

**✅ Points forts :**
- OTP haché SHA-256 (jamais stocké en clair)
- Rate limiting avec blocage 30 min après 5 échecs
- Tokens de session hachés (SHA-256) — pas de stockage clair côté serveur
- Cookie `HttpOnly; Secure; SameSite=Strict` en production
- Vérification `is_active` + `portal_enabled` à chaque validation

**⚠️ Risques :**
- Session 365 jours (excessif — recommandé: 30-90 jours max)
- Bypass test `000000` pour `apporteur@test.com` en mode dev/preview (acceptable si correctement scopé)

### 1.3 Mode Maintenance
- `useMaintenanceMode()` bloque l'UI si l'utilisateur n'est pas whitelisté
- Bloquant côté frontend uniquement — **les API restent accessibles** ✅ (les Edge Functions ont leur propre auth)

---

## 2. ANALYSE GESTION DE SESSIONS

| Aspect | Supabase Auth | Apporteur OTP |
|--------|--------------|---------------|
| Stockage | localStorage (SDK) | Cookie httpOnly + localStorage dev |
| Durée | 1h access + refresh | **365 jours** ⚠️ |
| Renouvellement | Automatique | Aucun |
| Révocation | `signOut()` | `apporteur-auth-logout` (révoque token) |
| Multi-device | Oui (Supabase gère) | Oui (multiple sessions) |
| Token theft | JWT court-lived → risque limité | Token long-lived → **risque élevé** |

### 🔴 CRITIQUE : Session OTP 365 jours
**Fichier** : `supabase/functions/apporteur-auth-verify-code/index.ts` (ligne 42)  
```typescript
const SESSION_DURATION_DAYS = 365;
```
**Risque** : Un token volé reste valide 1 an.  
**Correction** : Réduire à 30-90 jours + ajouter rotation de token.

---

## 3. ANALYSE PERMISSIONS (RBAC)

### 3.1 Architecture V2 — Évaluation

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (frontend)                                           │
│  AuthContext → globalRole + enabledModules                   │
│  hasAccess() → permissionsEngine.ts                          │
│  PermissionGuard / RoleGuard → UI conditionnelle             │
├─────────────────────────────────────────────────────────────┤
│  SERVEUR (Edge Functions)                                    │
│  getUserContext() → profiles.global_role                     │
│  assertRoleAtLeast() → vérification niveau                   │
│  canEditTarget() → anti-escalade                             │
├─────────────────────────────────────────────────────────────┤
│  DATABASE (RLS Policies)                                     │
│  has_min_global_role() → SECURITY DEFINER                    │
│  has_module_v2() → user_modules check                        │
│  is_admin() → N5+ check                                     │
└─────────────────────────────────────────────────────────────┘
```

**✅ Points forts :**
- Triple vérification : client → Edge Function → RLS
- `canEditTarget()` empêche l'escalade de privilèges (N2 ne peut créer que N0-N1)
- `SECURITY DEFINER` fonctions pour éviter la récursion RLS
- Bypass N5+ clairement documenté et intentionnel
- `globalRole` stocké dans `profiles` (pas dans `user_metadata` JWT — empêche la manipulation)

**✅ Anti-escalade vérifié :**
```typescript
// create-user/index.ts — ligne 131
const editCheck = canEditTarget(callerLevel, targetRoleLevel, callerAgency, targetAgency)
if (!editCheck.allowed) throw new Error(editCheck.reason)
```

### 3.2 Test Théorique : Élévation de Privilèges

| Vecteur | Résultat | Raison |
|---------|----------|--------|
| Modifier `profiles.global_role` via client | ❌ Bloqué | RLS policy empêche UPDATE de `global_role` par l'utilisateur |
| Appeler `create-user` pour se créer N6 | ❌ Bloqué | `canEditTarget()` vérifie N_caller > N_target |
| Modifier localStorage `enabledModules` | ⚠️ UI modifiée | Mais sans effet : Edge Functions + RLS vérifient côté serveur |
| Forger un JWT avec rôle élevé | ❌ Bloqué | `getUser()` valide le token auprès de Supabase Auth |
| Accéder à une agence tierce | ❌ Bloqué | RLS `agency_id` scoping + Edge Functions vérifient `profile.agency_id` |

---

## 4. ANALYSE EDGE FUNCTIONS

### 4.1 Inventaire `verify_jwt = false` (20 fonctions)

| Fonction | Auth interne | Risque |
|----------|-------------|--------|
| `apporteur-auth-send-code` | Rate limit + validation email | ✅ OK — endpoint d'envoi OTP |
| `apporteur-auth-verify-code` | Rate limit + hash OTP | ✅ OK |
| `apporteur-auth-validate-session` | Hash token check | ✅ OK |
| `apporteur-auth-logout` | Token validation | ✅ OK |
| `email-to-ticket` | **Svix signature (HMAC)** | ✅ OK — webhook Resend |
| `reply-ticket-email` | Svix signature | ✅ OK |
| `notify-new-ticket` | JWT vérifié dans le code | ✅ OK |
| `maintenance-alerts-scan` | CRON (pas d'auth) | ⚠️ Appelable par quiconque |
| `qr-asset` | Token QR unique | ✅ OK — lecture publique limitée |
| `generate-monthly-report` | CRON | ⚠️ Appelable par quiconque |
| `purge-old-reports` | CRON | ⚠️ Appelable par quiconque |
| `trigger-monthly-reports` | CRON | ⚠️ Appelable par quiconque |
| `epi-generate-monthly-acks` | CRON | ⚠️ Appelable par quiconque |
| `media-garbage-collector` | Auth optionnelle (N5+) | ⚠️ Sans auth = exécution en mode CRON |
| `media-get-signed-url` | **JWT vérifié dans le code** | ✅ OK |
| `compute-apporteur-metrics` | CORS check | ⚠️ Pas d'auth utilisateur |
| `export-all-data` | **JWT vérifié + N5+ check** | ✅ OK |
| **`migrate-export`** | **Secret hardcodé en clair** | 🔴 **CRITIQUE** |
| `get-mapbox-token` | CORS uniquement | ⚠️ Token publique (acceptable) |
| `notify-new-ticket` | JWT en code | ✅ OK |

### 4.2 Fonctions CRON sans protection

Les fonctions marquées ⚠️ CRON sont appelables directement via :
```
POST https://qvrankgpfltadxegeiky.supabase.co/functions/v1/maintenance-alerts-scan
```
Sans aucun header d'authentification. Le risque est modéré car ces fonctions sont en lecture/écriture interne, mais un attaquant pourrait :
- Déclencher des scans de maintenance abusifs
- Forcer la génération de rapports (DoS)
- Purger des rapports anciens prématurément

**Correction** : Ajouter un `CRON_SECRET` vérifié par chaque fonction CRON.

---

## 5. 🔴 FAILLES CRITIQUES (3)

### C1. Secret de migration hardcodé en clair
**Fichier** : `supabase/functions/migrate-export/index.ts` (ligne 2)  
**Module** : Migration  
```typescript
const MIGRATION_SECRET = 'apogee-migrate-2026-secret';
```
**Risque** : Toute personne lisant le code source peut exporter l'intégralité de la base de données via :
```
GET /functions/v1/migrate-export?secret=apogee-migrate-2026-secret&mode=export&table=profiles
```
Cette fonction utilise `SUPABASE_SERVICE_ROLE_KEY` et accède à **toutes les tables** sans restriction.  
**Impact** : Fuite totale de données (profils, sessions, tickets, données RH sensibles).  
**CVSS estimé** : 9.8 (Critical)  
**Correction** :
1. Migrer le secret vers `Deno.env.get('MIGRATION_SECRET')`
2. Ajouter à Supabase Secrets
3. Idéalement, désactiver ou supprimer cette fonction en production

### C2. Session apporteur de 365 jours
**Fichier** : `supabase/functions/apporteur-auth-verify-code/index.ts` (ligne 42)  
**Module** : Apporteur Auth  
**Risque** : Token volé (XSS, accès physique, malware) → accès aux données apporteur pendant 1 an.  
**Impact** : Compromission durable du compte apporteur.  
**CVSS estimé** : 7.5 (High)  
**Correction** :
1. Réduire `SESSION_DURATION_DAYS` à 90 jours max
2. Implémenter une rotation de token (nouveau token à chaque validate-session)
3. Ajouter un mécanisme de révocation masse par agence

### C3. `create-dev-account` avec CORS `*`
**Fichier** : `supabase/functions/create-dev-account/index.ts` (ligne 4)  
**Module** : Admin  
```typescript
const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... };
```
**Risque** : Cette endpoint permet de créer des comptes admin (`platform_admin` par défaut). Le CORS wildcard permet à n'importe quel site de tenter l'appel. L'auth JWT N5+ protège, mais le CORS devrait être strict.  
**Impact** : Si un N5+ visite un site malveillant, une requête CSRF pourrait créer un compte admin.  
**CVSS estimé** : 6.5 (Medium-High)  
**Correction** : Utiliser `handleCorsPreflightOrReject()` centralisé au lieu du wildcard.

---

## 6. 🟠 FAILLES EXPLOITABLES (5)

### E1. XSS potentiel — HcServicesSection
**Fichier** : `src/components/hc-services-guide/HcServicesSection.tsx` (lignes 104, 175)  
**Module** : Guides HC Services  
```tsx
dangerouslySetInnerHTML={{ __html: section.content }}
```
**Risque** : Contenu HTML injecté **sans sanitization** DOMPurify. Tous les autres composants utilisent `createSanitizedHtml()`.  
**Impact** : XSS stocké si un admin insère du contenu malveillant dans les blocs HC Services.  
**Correction** : Remplacer par `dangerouslySetInnerHTML={createSanitizedHtml(section.content)}`.

### E2. Fonctions CRON sans authentification
**Fichier** : `maintenance-alerts-scan`, `generate-monthly-report`, `purge-old-reports`, `trigger-monthly-reports`, `epi-generate-monthly-acks`  
**Module** : Système  
**Risque** : Appelables sans auth → DoS par déclenchements répétés, purge abusive de données.  
**Correction** : Ajouter un secret CRON vérifié dans chaque fonction.

### E3. `compute-apporteur-metrics` sans auth utilisateur
**Fichier** : `supabase/functions/compute-apporteur-metrics/index.ts`  
**Module** : Apporteur Metrics  
**Risque** : verify_jwt=false et pas de vérification d'auth interne. N'importe qui avec l'URL peut déclencher un recalcul massif des métriques.  
**Correction** : Ajouter un secret CRON ou vérification JWT.

### E4. RLS `USING(true)` restantes (INSERT/UPDATE/DELETE)
**Fichier** : Multiple tables (détecté par Supabase scanner)  
**Module** : Database  
**Risque** : Certaines policies permettent des opérations INSERT/UPDATE/DELETE sans restriction. Tables non identifiées dans ce scan.  
**Correction** : Exécuter `SELECT * FROM pg_policies WHERE qual = 'true' AND cmd != 'SELECT'` et corriger.

### E5. `media-garbage-collector` sans auth en mode CRON
**Fichier** : `supabase/functions/media-garbage-collector/index.ts`  
**Module** : Médiathèque  
**Risque** : En mode CRON (sans Authorization header), la fonction s'exécute avec le service_role_key et peut supprimer des fichiers storage.  
**Correction** : Exiger un CRON_SECRET même en mode CRON.

---

## 7. 🟡 FAILLES MINEURES (7)

### M1. Leaked Password Protection désactivée
**Fichier** : Configuration Supabase Auth  
**Risque** : Les utilisateurs peuvent utiliser des mots de passe compromis (haveibeenpwned).  
**Correction** : Activer dans Supabase Dashboard > Auth > Settings.

### M2. Extension `pg_trgm` dans le schema `public`
**Fichier** : Configuration Supabase  
**Risque** : Extensions dans `public` peuvent interférer avec les policies RLS.  
**Correction** : Migrer vers le schema `extensions`.

### M3. DOMPurify `ALLOW_DATA_ATTR: true`
**Fichier** : `src/lib/sanitize.ts` (ligne 37)  
**Risque** : Les attributs `data-*` sont autorisés sans restriction. Pourrait être utilisé pour du data exfiltration CSS.  
**Correction** : Lister explicitement les `data-*` autorisés au lieu du wildcard.

### M4. `style` autorisé dans DOMPurify
**Fichier** : `src/lib/sanitize.ts` (ligne 34)  
**Risque** : L'attribut `style` permet des injections CSS (data exfiltration via `background: url(...)`).  
**Correction** : Utiliser `FORBID_ATTR: ['style']` et gérer le styling via classes CSS.

### M5. Console.log d'informations auth en dev
**Fichier** : `src/contexts/AuthContext.tsx` (multiple lignes)  
**Risque** : Logs de rôles, modules, userId en mode dev. Pas critique mais bruit en console.  
**Correction** : S'assurer que `import.meta.env.DEV` gate est toujours présent.

### M6. `get-mapbox-token` expose un token d'API
**Fichier** : `supabase/functions/get-mapbox-token/index.ts`  
**Risque** : Token Mapbox accessible via Edge Function avec CORS uniquement. Pas de vérification d'auth.  
**Correction** : Acceptable si le token est un public token Mapbox (scope lecture seule). Vérifier le scope du token.

### M7. `create-dev-account` ne valide pas les inputs
**Fichier** : `supabase/functions/create-dev-account/index.ts`  
**Risque** : Pas de validation du `globalRole` fourni. Un N5 pourrait créer un `superadmin` (N6). L'auth N5+ protège, mais un N5 ne devrait pas pouvoir créer N6.  
**Correction** : Ajouter `canEditTarget()` comme dans `create-user`.

---

## 8. TESTS THÉORIQUES

### 8.1 XSS (Cross-Site Scripting)

| Vecteur | Protégé | Détail |
|---------|---------|--------|
| Rich text guides (blocks) | ✅ | DOMPurify via `createSanitizedHtml()` |
| HC Services blocks | 🔴 **NON** | `dangerouslySetInnerHTML={{ __html: content }}` sans sanitization |
| Input fields | ✅ | React encode automatiquement les JSX expressions |
| URLs | ✅ | `href` autorisé mais DOMPurify nettoie `javascript:` |
| Email templates (Edge Functions) | ⚠️ | Interpolation `${firstName}` dans HTML — mais côté serveur uniquement |

### 8.2 Injection SQL

| Vecteur | Protégé | Détail |
|---------|---------|--------|
| Client Supabase JS | ✅ | SDK Supabase utilise des requêtes paramétrées |
| Edge Functions avec `.eq()`, `.ilike()` | ✅ | Paramétré par le SDK |
| RPC calls | ✅ | Arguments passés comme paramètres PL/pgSQL |
| `migrate-export` table parameter | ⚠️ | Validé contre `allTables.includes()` — OK |
| `admin-sql-runner` | N/A | Fichier non trouvé (supprimé ou jamais déployé) |

**Verdict** : Aucun risque d'injection SQL identifié. Le SDK Supabase paramétrise toutes les requêtes.

### 8.3 Injection Paramètres URL

| Vecteur | Protégé | Détail |
|---------|---------|--------|
| `migrate-export?secret=...&table=...` | 🔴 | Secret hardcodé — voir C1 |
| `qr-asset?token=...` | ✅ | Token vérifié en DB, pas d'injection possible |
| Routes React (`/admin/:id`) | ✅ | React Router + Supabase SDK paramétré |
| `export-all-data?table=X` | ✅ | Validation N5+ + table whitelist |

### 8.4 Accès API sans Auth

| Endpoint | Auth | Résultat |
|----------|------|----------|
| `POST /create-user` (sans header) | ❌ Rejeté | "Non autorisé" |
| `POST /apporteur-auth-send-code` (email random) | ⚠️ Rate limited | OTP envoyé si email existe — timing attack minimal |
| `GET /migrate-export?secret=XXX` | 🔴 **Accès total** | Export complet DB si secret connu |
| `POST /maintenance-alerts-scan` (sans auth) | ⚠️ Exécuté | Scan de maintenance déclenché |
| `POST /compute-apporteur-metrics` (sans auth) | ⚠️ Exécuté | Recalcul métriques déclenché |

### 8.5 Fuite Inter-Tenant

| Vecteur | Protégé | Détail |
|---------|---------|--------|
| Accès données autre agence (Supabase SDK) | ✅ | RLS `agency_id` scoping |
| Edge Function `media-get-signed-url` | ✅ | Vérifie `asset.agency_id === profile.agency_id` |
| Edge Function `create-user` | ✅ | N2 limité à sa propre agence |
| Edge Function `get-apporteur-stats` | ✅ | Scoping par `apporteur_user_id` |
| `DataPreloadContext` | ⚠️ | Charge toutes les agences si N3+ — mais données scoped par l'API Apogée |
| `export-all-data` | ⚠️ | Scoped N5+ — mais exporte toutes les agences (by design pour admin) |

**Verdict** : Pas de fuite inter-tenant exploitable pour les utilisateurs N0-N4.

---

## 9. ANALYSE RLS SUPABASE

### 9.1 Scan Automatisé
Le scanner Supabase a détecté :
- ⚠️ **RLS policies avec `USING(true)` ou `WITH CHECK(true)`** sur des opérations mutantes (INSERT/UPDATE/DELETE)
- ⚠️ Extension `pg_trgm` dans le schema `public`
- ⚠️ Leaked password protection désactivée

### 9.2 Fonctions Security Definer (vérification)

| Fonction | Usage | Sécurisé |
|----------|-------|----------|
| `is_admin(_user_id)` | RLS admin bypass | ✅ Utilise `has_min_global_role(5)` |
| `has_role(_user_id, _role)` | RLS role check | ✅ Lecture `user_roles` |
| `has_apogee_tickets_access()` | RLS ticketing | ✅ Check `user_modules` |
| `has_franchiseur_access()` | RLS réseau | ✅ Check `user_modules` + N3+ |
| `get_user_agency_id()` | RLS agency scoping | ✅ Lecture `profiles` |
| `get_collaborator_sensitive_data()` | Données sensibles | ✅ Double check: collaborateur + module RH |
| `get_user_effective_modules()` | Auth modules | ✅ Cascade plan → role → overrides |

### 9.3 Tables Sensibles — Vérification RLS

| Table | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| `profiles` | ✅ ON | Own profile + same agency | Via trigger | Own profile | Admin only |
| `collaborators` | ✅ ON | Same agency | Same agency | Same agency | Admin |
| `collaborator_sensitive_data` | ✅ ON | Via RPC only | Admin | Admin | Admin |
| `user_modules` | ✅ ON | Admin/own | Admin | Admin | Admin |
| `apporteur_sessions` | ✅ ON | — | Via Edge Function | — | — |
| `apogee_tickets` | ✅ ON | Module access | Module access | Module access | Admin |

---

## 10. MATRICE DE REMÉDIATION

### Priorité P0 — Immédiat (avant mise en production)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| P0.1 | **Migrer secret `migrate-export` vers env** | `migrate-export/index.ts` | 15 min |
| P0.2 | **Réduire session OTP à 90 jours** | `apporteur-auth-verify-code/index.ts` | 5 min |
| P0.3 | **Sanitizer XSS HcServicesSection** | `HcServicesSection.tsx` | 5 min |
| P0.4 | **Activer Leaked Password Protection** | Supabase Dashboard | 2 min |

### Priorité P1 — Court terme (semaine suivante)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| P1.1 | CORS strict sur `create-dev-account` | `create-dev-account/index.ts` | 10 min |
| P1.2 | Secret CRON pour fonctions verify_jwt=false | 5 fonctions CRON | 1h |
| P1.3 | Auth pour `compute-apporteur-metrics` | `compute-apporteur-metrics/index.ts` | 15 min |
| P1.4 | Audit `USING(true)` INSERT/UPDATE/DELETE | SQL audit | 1h |
| P1.5 | Anti-escalade dans `create-dev-account` | `create-dev-account/index.ts` | 10 min |

### Priorité P2 — Moyen terme

| # | Action | Effort |
|---|--------|--------|
| P2.1 | DOMPurify: interdire `style` attribute | 15 min |
| P2.2 | DOMPurify: restreindre `data-*` attributes | 15 min |
| P2.3 | Migrer `pg_trgm` vers schema `extensions` | 30 min |
| P2.4 | Rotation de token apporteur | 2h |
| P2.5 | Audit logs pour Edge Functions admin | 2h |

---

## 11. RÉSUMÉ EXÉCUTIF

```
┌────────────────────────────────────────────────────────┐
│           SECURITY SCORE : 7.1 / 10                    │
│                                                        │
│  🔴 CRITIQUES : 3                                      │
│     - Secret migration hardcodé (CVSS 9.8)             │
│     - Session OTP 365j (CVSS 7.5)                      │
│     - CORS wildcard sur create-dev-account (CVSS 6.5)  │
│                                                        │
│  🟠 EXPLOITABLES : 5                                   │
│     - XSS HcServicesSection                            │
│     - 5 CRON functions sans auth                       │
│     - compute-apporteur-metrics ouvert                 │
│     - RLS USING(true) restantes                        │
│     - media-garbage-collector sans CRON secret          │
│                                                        │
│  🟡 MINEURES : 7                                       │
│     - Leaked password protection off                   │
│     - Extension public schema                          │
│     - DOMPurify trop permissif                         │
│     - Mapbox token exposé                              │
│     - Inputs non validés create-dev-account            │
│     - Logs auth en dev                                 │
│     - style attribute autorisé                         │
│                                                        │
│  ✅ POINTS FORTS :                                     │
│     - Triple vérification client/edge/RLS              │
│     - Anti-escalade de privilèges (canEditTarget)      │
│     - OTP hashé SHA-256                                │
│     - Tokens de session hashés                         │
│     - Isolation multi-tenant RLS solide                │
│     - DOMPurify systématique (sauf 1 exception)        │
│     - CORS centralisé avec whitelist                   │
│     - Input validation partagée (_shared/validation)   │
│     - Pas d'injection SQL possible (SDK paramétré)     │
│     - Comptes désactivés → déconnexion forcée          │
└────────────────────────────────────────────────────────┘
```

---

*Audit Sécurité HelpConfort — V0.9.1 — 7 Mars 2026*  
*Prochaine révision recommandée : Après application des correctifs P0*
