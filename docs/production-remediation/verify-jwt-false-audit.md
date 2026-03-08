# 🔍 Audit des Edge Functions en `verify_jwt = false`

> **Date** : 2026-03-08  
> **Périmètre** : Fonctions sensibles non-cron, non purement publiques

---

## Résumé

| Fonction | Usage | Auth réelle | Statut |
|---|---|---|---|
| `reply-ticket-email` | Réponse email agent → demandeur | JWT manuel ✅ | ✅ OK |
| `notify-new-ticket` | Notification email nouveau ticket | JWT manuel ✅ | ✅ OK |
| `migrate-export` | Export complet BDD pour migration | Secret query param ⚠️ | ⚠️ À durcir |
| `email-to-ticket` | Webhook Resend entrant | Svix signature ✅ | ✅ OK |
| `media-get-signed-url` | URL signée pour fichiers | JWT via `getClaims()` ✅ | ✅ OK |
| `export-all-data` | Export admin N5+ | JWT via `getClaims()` ✅ | ✅ OK |

---

## Analyse détaillée

### 1. `reply-ticket-email` — ✅ OK

- **Usage** : Agent authentifié envoie une réponse email au demandeur d'un ticket
- **Raison verify_jwt=false** : La fonction utilise le signing-keys system qui nécessite la validation manuelle
- **Auth réelle** :
  - Vérifie `Authorization: Bearer` header (L24-29)
  - Appelle `supabase.auth.getUser()` avec le token (L38-46)
  - Récupère `user.id` pour traçabilité (L48)
- **Contrôles métier** : Vérifie que le ticket existe et a un email de demandeur
- **Verdict** : Sécurité correcte — authentification JWT effective en code

### 2. `notify-new-ticket` — ✅ OK

- **Usage** : Envoie des notifications email aux destinataires configurés à la création d'un ticket
- **Raison verify_jwt=false** : Signing-keys system
- **Auth réelle** :
  - Vérifie `Authorization` header (L48-54)
  - Crée un client Supabase scopé avec le token de l'appelant (L56-60)
  - Appelle `supabase.auth.getUser()` (L62-68)
- **CORS** : Utilise le système centralisé `handleCorsPreflightOrReject` avec whitelist d'origines
- **Verdict** : Sécurité correcte

### 3. `migrate-export` — ⚠️ À surveiller

- **Usage** : Export complet de la BDD (toutes tables, auth users, storage) pour migration vers self-host
- **Raison verify_jwt=false** : Utilise un secret partagé au lieu de JWT (cas d'usage migration)
- **Auth réelle** :
  - Vérifie `MIGRATION_SECRET` via query parameter `?secret=xxx` (L92-93)
  - Aucune vérification JWT
- **Risques identifiés** :
  - Le secret transite en clair dans l'URL (visible dans les logs serveur, historique navigateur)
  - Pas de rate limiting
  - Accès total à toutes les données via SERVICE_ROLE_KEY
- **Atténuants** :
  - La fonction est destinée à un usage ponctuel (migration)
  - Le secret doit être configuré manuellement
  - CORS centralisé est en place
- **Verdict** : Acceptable pour un outil de migration ponctuel, mais le secret dans l'URL est un pattern faible. Recommandation : déplacer le secret dans un header `X-Migration-Secret` dans une future itération.

### 4. `email-to-ticket` — ✅ OK

- **Usage** : Webhook Resend (inbound email) → création/mise à jour de tickets
- **Raison verify_jwt=false** : Webhook externe — pas de JWT Supabase possible
- **Auth réelle** :
  - Vérifie la signature **Svix** (HMAC-SHA256) fournie par Resend (L127-133)
  - Vérifie `RESEND_WEBHOOK_SECRET` configuré (L115-122)
  - Tolerance timestamp de 5 minutes (anti-replay) (L65-66)
  - Validation timing-safe des signatures (L19-25)
- **Contrôles** :
  - Filtre uniquement les events `email.received` (L140-145)
  - Sanitization du contenu email (L101-105)
  - Troncature du body à 10000 chars
- **Verdict** : Excellente sécurité — pattern webhook standard avec signature cryptographique

### 5. `media-get-signed-url` — ✅ OK

- **Usage** : Génère des URLs signées temporaires pour accéder aux fichiers de la médiathèque
- **Raison verify_jwt=false** : Signing-keys system
- **Auth réelle** :
  - Vérifie `Authorization: Bearer` (L39-45)
  - Utilise `supabase.auth.getClaims()` pour validation JWT (L48-56)
  - Extraction du `userId` depuis les claims (L58)
- **Contrôles d'accès** :
  - Vérification du profil utilisateur (L61-73)
  - Vérification de correspondance d'agence (L112-118)
  - Vérification de scope via RPC `can_access_folder_scope` (L149-153)
  - Bypass uniquement pour N5+ (L109, L121)
  - Audit trail via `document_access_logs` (L208-217)
- **CORS** : Système centralisé avec whitelist
- **Verdict** : Sécurité exemplaire — defense-in-depth avec scope, agence, et audit

### 6. `export-all-data` — ✅ OK (hors périmètre initial mais audité)

- **Usage** : Export paginé de tables pour backup/analyse par admins N5+
- **Raison verify_jwt=false** : Signing-keys system
- **Auth réelle** :
  - Vérifie `Authorization: Bearer` (L21-23)
  - Utilise `getClaims()` (L33-36)
  - Vérifie `global_role` ≥ N5 (L40-43)
- **Contrôles** : Whitelist dynamique des tables, pagination forcée avec limites par table
- **Verdict** : Sécurité correcte

---

## Fonctions verify_jwt=false NON auditées ici (hors périmètre)

Ces fonctions sont en `verify_jwt=false` mais sont des cas légitimes (cron jobs, auth custom, ou utilitaires publics) :

| Fonction | Raison légitime |
|---|---|
| `maintenance-alerts-scan` | Cron job — auth par `CRON_SECRET` |
| `qr-asset` | Endpoint public — génère des QR codes |
| `generate-monthly-report` | Cron job |
| `purge-old-reports` | Cron job |
| `trigger-monthly-reports` | Cron job |
| `epi-generate-monthly-acks` | Cron job |
| `media-garbage-collector` | Cron job |
| `compute-apporteur-metrics` | Cron job |
| `apporteur-auth-*` (4 fonctions) | Auth custom OTP — authentification propre |

---

## Recommandations

| Priorité | Action | Effort |
|---|---|---|
| ⚠️ Faible | `migrate-export` : Déplacer le secret du query param vers un header HTTP | 30min |
| ℹ️ Info | Documenter dans le README que `verify_jwt=false` est le pattern standard avec signing-keys | 15min |
