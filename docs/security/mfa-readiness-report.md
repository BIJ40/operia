# MFA Readiness Report — Operia

> Date : 2026-03-08

## 1. État actuel de l'authentification

| Aspect | État |
|--------|------|
| Méthode de login | Email + mot de passe via Supabase Auth (GoTrue) |
| Token storage | localStorage (standard Supabase) |
| Auto-refresh | ✅ Activé |
| Password recovery | ✅ Flow complet avec `/reset-password` |
| Compte désactivé | ✅ Vérifié à chaque chargement profil |
| MFA | ❌ Non activé avant cette étape |
| Session revocation | ❌ Non disponible (limitation Supabase) |

## 2. Faisabilité MFA avec Supabase

### Supabase Auth MFA — Capacités

Supabase Auth v2 supporte nativement le MFA TOTP :

| API | Disponible | Usage |
|-----|-----------|-------|
| `mfa.enroll()` | ✅ | Créer un facteur TOTP (retourne QR + secret) |
| `mfa.challenge()` | ✅ | Initier un challenge |
| `mfa.verify()` | ✅ | Vérifier un code TOTP |
| `mfa.listFactors()` | ✅ | Lister les facteurs d'un user |
| `mfa.unenroll()` | ✅ | Supprimer un facteur |
| `mfa.getAuthenticatorAssuranceLevel()` | ✅ | Connaître le AAL (aal1/aal2) |

### Niveaux d'assurance (AAL)

- **AAL1** : Authentification par mot de passe uniquement
- **AAL2** : Authentification par mot de passe + vérification TOTP

### Verdict

**✅ Faisable immédiatement** avec des adaptations limitées :

1. Le SDK `@supabase/supabase-js@2.81.1` inclut toutes les APIs MFA
2. Le composant `InputOTP` existe déjà dans le projet (input-otp)
3. Le composant `react-qr-code` est déjà installé
4. L'architecture auth split (AuthCoreContext / PermissionsContext / ProfileContext) permet d'ajouter un hook MFA sans toucher aux contextes existants
5. Le système `RoleGuard` existant peut être composé avec un `MfaGuard` additionnel

## 3. Contraintes identifiées

| Contrainte | Impact | Mitigation |
|-----------|--------|-----------|
| Pas de MFA côté Edge Functions | Les Edge Functions ne vérifient pas le AAL | Planifier l'ajout de vérification AAL dans les fonctions sensibles |
| localStorage pour tokens | Vulnérable XSS même avec MFA | CSP strict atténue le risque |
| Pas de SMS MFA | Uniquement TOTP | Suffisant pour les admins (apps authenticator) |
| Pas d'admin MFA override | Si admin perd son authenticator | Recovery via Supabase Dashboard |
| Enrollment non obligatoire au signup | Doit être ajouté progressivement | Mode advisory → enforced |

## 4. Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Admin perd son device | Moyenne | Élevé | Recovery codes futurs + Supabase Dashboard |
| Disruption login existants | Faible | Élevé | Mode advisory d'abord |
| Fragmentation UX | Faible | Moyen | MfaGuard composable, non intrusif |

## 5. Solution retenue

### Architecture

```
Login (email/password)
  → AAL1 (session standard)
  → Accès normal à l'app
  → Zones sensibles protégées par MfaGuard
    → Si MFA non enrollé + mode advisory → Banner d'incitation
    → Si MFA non enrollé + mode enforced → Blocage + enrollment forcé
    → Si MFA enrollé + AAL1 → Challenge TOTP → AAL2 → Accès
```

### Composants créés

| Fichier | Rôle |
|---------|------|
| `src/lib/mfa.ts` | Configuration MFA (rôles requis, mode enforcement) |
| `src/hooks/useMfa.ts` | Hook React wrappant les APIs Supabase MFA |
| `src/components/auth/MfaEnrollDialog.tsx` | Dialog d'enrollment (QR code + vérification) |
| `src/components/auth/MfaChallengeDialog.tsx` | Dialog de challenge (saisie code TOTP) |
| `src/components/auth/MfaGuard.tsx` | Guard composable pour zones sensibles |

### Mode de déploiement

**Mode actuel : `advisory`** — Les admins voient un banner les incitant à activer le MFA, mais ne sont pas bloqués.

Passage en `enforced` par simple changement d'une constante dans `src/lib/mfa.ts`.
