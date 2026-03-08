# Étape 6 — Enforcement MFA côté serveur (Edge Functions sensibles)

**Date** : 2026-03-08  
**Statut** : ✅ Implémenté — mode `advisory` actif, prêt pour `enforced`

---

## 1. Résumé exécutif

### Avant cette étape
- Le MFA protégeait uniquement le **frontend** (MfaGuard sur les composants admin, RH, impersonation)
- Un utilisateur AAL1 pouvait théoriquement appeler directement les Edge Functions sensibles via `curl` ou un client API, contournant la protection MFA UI

### Ce qui est maintenant protégé côté serveur
- **8 Edge Functions sensibles** intègrent désormais une vérification AAL2 via un helper centralisé `requireAal2()`
- Le mécanisme est **progressif** : contrôlé par la variable d'environnement `SERVER_MFA_ENFORCEMENT` (`off` / `advisory` / `enforced`)
- En mode `advisory` (défaut actuel), les accès AAL1 sont **loggés mais autorisés** — zéro rupture
- En mode `enforced`, les utilisateurs N4+ sans AAL2 reçoivent une **erreur 403** avec code `MFA_REQUIRED`

---

## 2. Cartographie des Edge Functions sensibles

| Fonction | Usage | Rôle min | AAL2 requis | Justification |
|---|---|---|---|---|
| `sensitive-data` | Lecture/écriture données RGPD chiffrées (SSN, ICE) | N0 (self) / N2+ (RH) | ✅ Oui | Données les plus sensibles du système |
| `export-all-data` | Export complet de toutes les tables | N5+ | ✅ Oui | Exfiltration totale possible |
| `export-full-database` | Export DB en 6 parties | N5+ | ✅ Oui | Même risque que export-all-data |
| `create-user` | Création de comptes utilisateurs | N2+ | ✅ Oui | Création de comptes avec rôles élevés |
| `delete-user` | Suppression de comptes | N5+ | ✅ Oui | Action destructive irréversible |
| `reset-user-password` | Réinitialisation de mot de passe | N2+ | ✅ Oui | Prise de contrôle de compte |
| `update-user-email` | Modification d'email | N2+ | ✅ Oui | Redirection d'identité |
| `create-dev-account` | Création de comptes de développement | N5+ | ✅ Oui | Création de backdoors potentielles |

### Fonctions NON protégées (justification)

| Fonction | Raison |
|---|---|
| `export-my-data` | Export des propres données de l'utilisateur (RGPD Art. 20), pas de données tierces |
| `media-get-signed-url` | URLs signées temporaires, pas de données sensibles directes |
| `seed-test-users` | Fonction de développement/test uniquement |
| `chat-guide`, `search-embeddings`, etc. | Fonctions de consultation sans données sensibles |
| Fonctions `apporteur-auth-*` | Système d'auth autonome séparé (OTP) |
| Fonctions `verify_jwt = false` (crons) | Pas d'auth utilisateur, protégées par secrets internes |

---

## 3. Mécanisme partagé créé

### Fichier : `supabase/functions/_shared/mfa.ts`

**Fonction principale** : `requireAal2(req, userRoleLevel, userId, options)`

**Fonctionnement** :
1. Lit le mode d'enforcement depuis `SERVER_MFA_ENFORCEMENT` (env var)
2. Si `off` → toujours passer
3. Si le rôle utilisateur < seuil (N4 par défaut) → toujours passer
4. Extrait le claim `aal` du JWT (décodage base64 du payload)
5. Si `aal === 'aal2'` → passer
6. Si `advisory` → log warning, passer
7. Si `enforced` → retourner 403 avec `{ error: 'MFA requis', code: 'MFA_REQUIRED' }`

**Options** :
- `minRoleLevel` : seuil de rôle personnalisable par fonction
- `functionName` : nom pour les logs

**Activation progressive** :
```bash
# Dans Supabase Dashboard > Edge Functions > Secrets
SERVER_MFA_ENFORCEMENT=off       # Désactivé
SERVER_MFA_ENFORCEMENT=advisory  # Logs uniquement (défaut)
SERVER_MFA_ENFORCEMENT=enforced  # Bloque les AAL1 pour N4+
```

---

## 4. Fichiers modifiés

| Fichier | Modification |
|---|---|
| `supabase/functions/_shared/mfa.ts` | **Créé** — Helper centralisé AAL2 |
| `supabase/functions/sensitive-data/index.ts` | Import + appel `requireAal2` après contrôle d'accès |
| `supabase/functions/export-all-data/index.ts` | Import + appel `requireAal2` après vérification N5+ |
| `supabase/functions/export-full-database/index.ts` | Import + appel `requireAal2` après vérification N5+ |
| `supabase/functions/create-user/index.ts` | Import + appel `requireAal2` après vérification N2+ |
| `supabase/functions/delete-user/index.ts` | Import + appel `requireAal2` après vérification N5+ |
| `supabase/functions/reset-user-password/index.ts` | Import + appel `requireAal2` après vérification droits |
| `supabase/functions/update-user-email/index.ts` | Import + appel `requireAal2` après vérification droits |
| `supabase/functions/create-dev-account/index.ts` | Import + appel `requireAal2` après vérification N5+ |
| `docs/security/final-step6-server-mfa-enforcement.md` | **Créé** — Ce rapport |

---

## 5. Garanties de non-régression

| Aspect | Garantie |
|---|---|
| **Logique métier** | Inchangée — l'AAL2 check est ajouté APRÈS les vérifications de rôle/accès existantes |
| **Permissions** | Inchangées — même système de rôles, mêmes contrôles |
| **Contrats API** | Conservés — mêmes entrées/sorties JSON, seul un 403 supplémentaire possible en mode enforced |
| **Mode advisory** | Aucun blocage — les utilisateurs existants ne voient aucun changement |
| **Activation progressive** | Variable d'environnement `SERVER_MFA_ENFORCEMENT` contrôle tout |
| **Réversibilité** | Mettre `SERVER_MFA_ENFORCEMENT=off` désactive immédiatement toute vérification |

---

## 6. Limites restantes

| Limite | Impact | Solution future |
|---|---|---|
| **Mode `advisory` actif** | Les appels AAL1 passent encore (avec log) | Passer en `enforced` quand les admins ont activé le MFA |
| **Pas de vérification AAL via Supabase Auth API** | Le JWT payload est décodé localement (sans vérification de signature côté MFA helper) | La signature JWT est déjà validée par `getUser()` dans chaque fonction — le claim `aal` est fiable |
| **Fonctions cron (verify_jwt=false)** | Ne passent pas par ce mécanisme | Protégées par des secrets internes (CRON_SECRET, etc.) |
| **Edge Functions non listées** | Les nouvelles fonctions sensibles doivent manuellement intégrer `requireAal2` | Documenter dans le guide de développement |

---

## 7. Procédure d'activation de l'enforcement

1. **Vérifier** que les comptes N4+ ont activé le MFA via le dashboard
2. **Passer en mode enforced** : `SERVER_MFA_ENFORCEMENT=enforced` dans les secrets Edge Functions
3. **Monitorer** les logs Edge Functions pour détecter des 403 MFA inattendus
4. **Rollback** si nécessaire : `SERVER_MFA_ENFORCEMENT=advisory`
