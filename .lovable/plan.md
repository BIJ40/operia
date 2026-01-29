
# Plan d'implémentation - Authentification autonome Apporteur (Phase 1 + 2)

## Contexte

Refonte complète du système d'authentification apporteur pour le découpler de Supabase Auth. L'objectif est de créer un système OTP + session custom totalement isolé du système utilisateur interne (profiles/auth.users).

### Décisions verrouillées
- **Domaine** : helpconfort.services/apporteur (cookies SameSite=Strict)
- **Email** : Resend (déjà configuré via RESEND_API_KEY)
- **Données accessibles** : Dossiers, Devis, Factures, Demandes, Planification
- **OTP** : 15 minutes TTL, usage unique
- **Invitations longues** : Lien séparé 48h → déclenche flow OTP
- **Sessions** : 90 jours, cookie httpOnly en prod, localStorage en dev

---

## Phase 1 : Backend (SQL + Edge Functions)

### 1.1 Migration SQL - Nouvelles tables

**apporteur_managers** (remplace apporteur_users)
- id, apporteur_id, agency_id, email, first_name, last_name
- role ('reader'/'manager'), is_active, email_verified_at
- last_login_at, invited_by, created_at, updated_at
- Contrainte : `UNIQUE (apporteur_id, email)` (un email peut gérer plusieurs apporteurs)
- Index : `lower(email)` pour recherche rapide

**apporteur_sessions**
- id, manager_id, token_hash (SHA-256), expires_at, revoked_at
- ip_address, user_agent, created_at
- Index partiel sur sessions actives

**apporteur_otp_codes**
- id, manager_id, code_hash (SHA-256), expires_at, used_at, ip_address
- TTL : 15 minutes strict

**apporteur_invitation_links** (pour invitations longues 48h)
- id, manager_id, token_hash, expires_at, used_at

**Modification apporteurs**
- Ajouter colonne `portal_enabled BOOLEAN DEFAULT false`

### 1.2 Edge Functions Auth

**apporteur-auth-send-code**
```
POST { email: string }
→ Rate limit (email+ip) : 3/15min
→ Vérifie manager existe et actif
→ Génère OTP 6 digits, hash SHA-256, stocke TTL 15min
→ Envoie via Resend
→ Retourne 200 { success: true } (non révélateur)
```

**apporteur-auth-verify-code**
```
POST { email: string, code: string }
→ Rate limit : 5 essais/15min
→ Vérifie code_hash valide et non expiré
→ Marque used_at
→ Génère token session UUID v4
→ Stocke token_hash dans apporteur_sessions
→ Set-Cookie httpOnly + retourne manager infos
→ En dev : retourne aussi token dans body
```

**apporteur-auth-validate-session**
```
GET (cookie ou Bearer token)
→ Hash token, vérifie session valide
→ Retourne { valid: boolean, session?: {...} }
```

**apporteur-auth-logout**
```
POST
→ Marque revoked_at sur session
→ Clear cookie
```

### 1.3 Helpers partagés

- `src/apporteur/lib/hash.ts` : SHA-256 côté Deno
- Rate limiting : utiliser `_shared/rateLimit.ts` existant avec clés composites
- CORS : utiliser `_shared/cors.ts` existant

---

## Phase 2 : Frontend Auth

### 2.1 Nouveau contexte

**ApporteurSessionContext** (remplace ApporteurAuthContext)
- État : session, isLoading, isAuthenticated
- Actions : requestCode(email), verifyCode(email, code), logout(), refreshSession()
- Stockage : 
  - Prod : cookie httpOnly (automatique)
  - Dev/Preview : localStorage + header Bearer

### 2.2 Page de login OTP

**ApporteurLoginPage** (/apporteur non authentifié)
- Étape 1 : Saisie email → "Recevoir un code"
- Étape 2 : Saisie code 6 digits → "Se connecter"
- Lien "Changer d'email" pour revenir
- UI cohérente avec le design HelpConfort

### 2.3 Refactoring

**ApporteurGuard**
- Utiliser `useApporteurSession()` au lieu de `useApporteurAuth()`
- Conserver le bypass DEV mode en preview/localhost

**ApporteurLayout**
- Remplacer ApporteurLoginDialog par la page login intégrée
- Supprimer les références à supabase.auth

**Routes**
- /apporteur → login si non auth, sinon redirect dashboard
- /apporteur/dashboard → contenu protégé

### 2.4 Hook API wrapper

**useApporteurApi**
- Wrapper fetch avec auth automatique
- En prod : credentials: 'include' (cookies)
- En dev : ajoute header Authorization: Bearer

---

## Fichiers à créer

```
supabase/functions/
├── apporteur-auth-send-code/index.ts
├── apporteur-auth-verify-code/index.ts
├── apporteur-auth-validate-session/index.ts
└── apporteur-auth-logout/index.ts

src/apporteur/
├── contexts/ApporteurSessionContext.tsx
├── pages/ApporteurLoginPage.tsx
├── hooks/useApporteurApi.ts
└── lib/sessionStorage.ts
```

## Fichiers à modifier

```
supabase/config.toml (ajouter 4 edge functions)
src/apporteur/components/ApporteurLayout.tsx
src/apporteur/components/ApporteurGuard.tsx → refactor
src/routes/apporteur.routes.tsx
```

## Fichiers à supprimer (après migration)

```
src/contexts/ApporteurAuthContext.tsx
src/apporteur/components/ApporteurLoginDialog.tsx
supabase/functions/create-apporteur-user/
supabase/functions/invite-apporteur-user/
```

---

## Tests manuels checklist

### Auth flow
- [ ] Email inexistant → réponse 200 générique, pas d'email envoyé
- [ ] Rate limit email+ip → 429 après 3 demandes en 15min
- [ ] Code invalide → 401 + compteur incrémenté
- [ ] Code expiré (>15min) → 401
- [ ] Code valide → cookie posé + session créée
- [ ] Refresh page → session restaurée automatiquement
- [ ] Logout → session revoquée + cookie supprimé
- [ ] Token invalide après logout → 401

### Dev mode
- [ ] Localhost → bypass toujours actif avec banner
- [ ] Preview Lovable → bypass actif
- [ ] Production → bypass désactivé

### Sécurité
- [ ] Token jamais visible dans les logs
- [ ] Hash SHA-256 vérifié en DB
- [ ] Session expire après 90 jours

---

## Ordre d'exécution

1. **Migration SQL** : Créer les 5 tables + modifier apporteurs
2. **Edge Functions** : 4 fonctions auth dans l'ordre send → verify → validate → logout
3. **Frontend Context** : ApporteurSessionContext + hooks
4. **UI Login** : ApporteurLoginPage avec flow OTP
5. **Refactor Guards** : ApporteurGuard + Layout
6. **Tests** : Vérification manuelle complète
7. **Nettoyage** : Supprimer anciens fichiers (Phase 5 ultérieure)

---

## Section technique détaillée

### Schéma SQL complet

```sql
-- 1. Table managers (remplace apporteur_users)
CREATE TABLE public.apporteur_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apporteur_managers_unique_per_apporteur UNIQUE (apporteur_id, email)
);

CREATE INDEX idx_apporteur_managers_email_lower ON public.apporteur_managers (lower(email));
CREATE INDEX idx_apporteur_managers_apporteur ON public.apporteur_managers (apporteur_id);

-- 2. Table sessions
CREATE TABLE public.apporteur_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apporteur_sessions_token ON public.apporteur_sessions (token_hash);
CREATE INDEX idx_apporteur_sessions_active ON public.apporteur_sessions (manager_id) 
  WHERE revoked_at IS NULL AND expires_at > now();

-- 3. Table OTP codes
CREATE TABLE public.apporteur_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apporteur_otp_valid ON public.apporteur_otp_codes (manager_id, code_hash) 
  WHERE used_at IS NULL;

-- 4. Table invitation links (48h)
CREATE TABLE public.apporteur_invitation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.apporteur_managers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apporteur_invites_token ON public.apporteur_invitation_links (token_hash);

-- 5. Modifier apporteurs
ALTER TABLE public.apporteurs ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT false;

-- 6. Trigger updated_at
CREATE TRIGGER update_apporteur_managers_updated_at 
  BEFORE UPDATE ON public.apporteur_managers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Signature Edge Functions

```typescript
// apporteur-auth-send-code
POST /apporteur-auth-send-code
Body: { email: string }
Response: { success: boolean, message: string }

// apporteur-auth-verify-code  
POST /apporteur-auth-verify-code
Body: { email: string, code: string }
Response: { 
  success: boolean,
  manager?: { id, apporteurId, apporteurName, email, firstName, lastName, role },
  expiresAt?: string,
  token?: string // DEV only
}
Headers: Set-Cookie: apporteur_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7776000

// apporteur-auth-validate-session
GET /apporteur-auth-validate-session
Headers: Cookie: apporteur_token=... OR Authorization: Bearer ...
Response: { valid: boolean, session?: {...} }

// apporteur-auth-logout
POST /apporteur-auth-logout
Response: { success: boolean }
Headers: Set-Cookie: apporteur_token=; Max-Age=0
```

### Flow complet

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Utilisateur entre email                                             │
│     ↓                                                                   │
│  2. POST /apporteur-auth-send-code { email }                            │
│     → Rate limit check (email+ip)                                       │
│     → Lookup manager par email                                          │
│     → Génère OTP 6 digits                                               │
│     → Stocke hash(OTP) + expires_at + 15min                             │
│     → Envoie email via Resend                                           │
│     → Retourne 200 (non révélateur)                                     │
│                                                                         │
│  3. Utilisateur reçoit email, entre code                                │
│     ↓                                                                   │
│  4. POST /apporteur-auth-verify-code { email, code }                    │
│     → Rate limit check (essais erronés)                                 │
│     → Vérifie hash(code) match + non expiré + non utilisé               │
│     → Marque used_at                                                    │
│     → Génère session token (UUID v4)                                    │
│     → Stocke hash(token) + expires_at + 90 jours                        │
│     → Set-Cookie httpOnly                                               │
│     → Retourne infos manager                                            │
│                                                                         │
│  5. Requêtes ultérieures                                                │
│     → Cookie envoyé automatiquement                                     │
│     → validate-session vérifie hash(token)                              │
│     → Edge functions métier utilisent service role + filtre apporteur   │
│                                                                         │
│  6. Logout                                                              │
│     → POST /apporteur-auth-logout                                       │
│     → Marque session revoked_at                                         │
│     → Clear cookie                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```
