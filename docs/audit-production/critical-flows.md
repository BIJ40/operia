# AXE 2 — Flux Critiques

> Audit production-grade Operia — 2026-03-08

---

## 1. Login utilisateur

```
UI (LoginForm)
  ↓ email + password
AuthContext.login()
  ↓ supabase.auth.signInWithPassword()
GoTrue Auth Service
  ↓ JWT token
AuthContext.loadUserData()
  ↓ Promise.all([
  │   supabase.from('profiles').select(...)
  │   supabase.rpc('get_user_effective_modules')
  │ ])
Database (RLS + RPC)
  ↓ profil + modules
AuthContext setState
  ↓ setSentryUser()
App rendu conditionnel
```

| Critère | Évaluation |
|---|---|
| Étapes | 5 |
| Timeout | 10s (setTimeout dans loadUserData) — ⚠️ le timeout ne cancel pas réellement la requête |
| Gestion erreur | Toast + log Sentry |
| Retry | Non (login = action utilisateur) |
| **Risque** | Le `setTimeout` throw mais ne cancel pas `Promise.all` → fuite mémoire potentielle |

---

## 2. Création utilisateur

```
UI (AdminUsersUnified)
  ↓ formulaire
useUserManagement.createUser()
  ↓ monitorEdgeCall('create-user', ...)
supabase.functions.invoke('create-user')
  ↓ POST /functions/v1/create-user
Edge Function create-user
  ↓ 1. Auth vérification (JWT)
  ↓ 2. Rate limit (10/10min/user)
  ↓ 3. Validation rôle appelant (N2+ requis)
  ↓ 4. Anti-escalade de privilèges
  ↓ 5. supabaseAdmin.auth.admin.createUser()
  ↓ 6. Polling profil (10 retries × 300ms = 3s max)
  ↓ 7. Update profil (agence, rôle, modules)
  ↓ 8. Insert user_modules
  ↓ 9. Envoi email via Resend (non-bloquant)
GoTrue + Database
  ↓ response
UI toast success/error
```

| Critère | Évaluation |
|---|---|
| Étapes | 9 sous-étapes dans l'Edge Function |
| Timeout | Aucun timeout explicite côté Edge Function ⚠️ |
| Gestion erreur | try/catch global, erreurs structurées |
| Retry | Non côté client |
| **Risque 1** | `listUsers()` sans pagination — ⚠️ si >1000 users, le check doublon email échoue silencieusement |
| **Risque 2** | Polling profil (10×300ms) peut échouer si trigger `handle_new_user` est lent |
| **Risque 3** | Email envoyé avec mot de passe en clair dans le corps HTML |

---

## 3. Export données (export-all-data)

```
UI (AdminDatabaseExport)
  ↓ monitorEdgeCall('export-all-data', ...)
supabase.functions.invoke('export-all-data')
  ↓ Auth: getClaims() + vérification N5+
  ↓ Mode 1: Liste tables
  ↓ Mode 2: Count par batch
  ↓ Mode 3: Export paginé par table
Service Role Client (bypass RLS)
  ↓ .from(tableName).select('*')
Database
  ↓ JSON data
UI: téléchargement fichier
```

| Critère | Évaluation |
|---|---|
| Gestion erreur | try/catch, erreurs par table |
| Auth | getClaims() + profil check N5+ ✅ |
| **Risque** | `verify_jwt = false` dans config → l'auth est purement applicative, un appel curl avec un JWT valide expiré pourrait passer si getClaims ne valide pas l'expiration |
| **Risque 2** | Tables lourdes (activity_log, blocks) avec pageSize=3-10 → export très lent |

---

## 4. Gestion fichiers (media-get-signed-url)

```
UI (MediaLibrary / RH documents)
  ↓ supabase.functions.invoke('media-get-signed-url')
Edge Function
  ↓ verify_jwt = false ⚠️
  ↓ Auth manuelle par header
  ↓ Génération signed URL
Supabase Storage
  ↓ URL signée (60s-3600s)
UI: affichage/téléchargement
```

| Critère | Évaluation |
|---|---|
| **Risque** | `verify_jwt = false` → la fonction doit implémenter sa propre auth. Si mal faite → accès non autorisé aux fichiers |
| Timeout signed URL | Configurable mais pas audité |

---

## 5. Ticketing (support interne)

```
UI (SupportIndex / TicketDetail)
  ↓ hooks divers (useUserProjectTickets, useSupportTicketViews)
supabase.from('support_tickets / apogee_tickets').select(...)
Database (RLS)
  ↓ données filtrées
UI rendu
  ↓ Actions: répondre, changer statut, assigner
  ↓ supabase.functions.invoke('reply-ticket-email')
  ↓ supabase.functions.invoke('notify-new-ticket')
Edge Functions
  ↓ Resend email / notifications
```

| Critère | Évaluation |
|---|---|
| Gestion erreur | Partielle — certaines actions `catch {}` silencieuses |
| RLS | Activé sur les tables tickets ✅ |
| **Risque** | `notify-new-ticket` et `reply-ticket-email` ont `verify_jwt = false` → doivent implémenter auth manuelle |

---

## 6. Modules RH (données sensibles)

```
UI (RH pages)
  ↓ useSensitiveData() hook
supabase.functions.invoke('sensitive-data', { action: 'read'|'write' })
Edge Function sensitive-data
  ↓ Auth manuelle (JWT header)
  ↓ Rate limit (100/min)
  ↓ Vérification accès (isSelf, isAdmin, sameAgency+RH)
  ↓ AES-256-GCM encrypt/decrypt via Web Crypto API
  ↓ Audit log (last_accessed_by)
Database (service_role, bypass RLS)
  ↓ Données chiffrées
UI: affichage déchiffré
```

| Critère | Évaluation |
|---|---|
| Sécurité | Excellente — AES-256-GCM, audit trail, defense-in-depth ✅ |
| Rate limit | 100/min persistant avec fallback in-memory ✅ |
| **Risque** | Si `SENSITIVE_DATA_ENCRYPTION_KEY` est perdue → données irrécupérables 🔴 |
| **Risque 2** | Pas de rotation de clé documentée |

---

## 7. Proxy Apogee API

```
UI (hooks divers: useApogeeSync, KPI pages)
  ↓ apogeeProxy.ts → semaphore (2 concurrent max)
supabase.functions.invoke('proxy-apogee')
Edge Function proxy-apogee
  ↓ Auth + vérification agence
  ↓ Récupération credentials Apogee (API key + slug)
  ↓ fetch() vers https://{slug}.hc-apogee.fr/api/{endpoint}
Apogee ERP
  ↓ données métier
Edge Function → client
```

| Critère | Évaluation |
|---|---|
| Semaphore | ✅ Client-side limité à 2 appels concurrents |
| **Risque** | Pas de circuit breaker — si Apogee est lent, les requêtes s'empilent |
| **Risque 2** | Pas de cache serveur — chaque appel refait un fetch vers Apogee |
| **Risque 3** | API key Apogee stockée où ? → à auditer |

---

## 8. Apporteurs (auth autonome)

```
UI (Portail Apporteur)
  ↓ Email → OTP
apporteur-auth-send-code (verify_jwt = false)
  ↓ Génère OTP → hash stocké en DB
apporteur-auth-verify-code (verify_jwt = false)  
  ↓ Vérifie OTP → crée session custom (token_hash)
apporteur-auth-validate-session (verify_jwt = false)
  ↓ Valide session → retourne contexte
```

| Critère | Évaluation |
|---|---|
| Auth | Système OTP custom séparé de GoTrue ✅ (justifié pour portail externe) |
| Sécurité | OTP hashé, sessions avec expiration, nettoyage auto |
| **Risque** | 4 endpoints `verify_jwt = false` → surface d'attaque si CORS mal configuré |
| **Risque 2** | Rate limiting sur OTP ? → à vérifier dans `apporteur-auth-send-code` |

---

## Synthèse des risques par flux

| Flux | Fiabilité | Sécurité | Observabilité |
|---|---|---|---|
| Login | 🟢 Bon | 🟢 Bon | 🟢 Sentry + logs |
| Création user | 🟡 Moyen | 🟢 Bon | 🟢 monitorEdgeCall |
| Export données | 🟡 Moyen | 🟡 Moyen (jwt=false) | 🟡 Logs basiques |
| Media/fichiers | 🟡 Moyen | 🟡 Moyen (jwt=false) | 🔴 Pas de monitoring |
| Ticketing | 🟢 Bon | 🟡 Moyen | 🟡 Partiel |
| RH sensible | 🟢 Bon | 🟢 Excellent | 🟢 Audit trail |
| Proxy Apogee | 🟡 Moyen | 🟢 Bon | 🟡 Logs uniquement |
| Apporteurs | 🟢 Bon | 🟡 Moyen | 🟡 Logs basiques |
