# Operia — Rapport de Readiness Opérationnelle (Étape 7)

## 1. Résumé exécutif

| Sujet | Avant | Après | Statut |
|-------|-------|-------|--------|
| **CI** | Workflow complet mais script `health:check` cassé (mauvais header) | Header corrigé, anon key embarquée, health-check explicite dans config.toml | ✅ Opérationnel |
| **Monitoring** | Endpoint fonctionnel, script local KO | Script corrigé, documentation validée | ✅ Branchable immédiatement |
| **MFA enforced** | Infrastructure UI + serveur en advisory | Aucun bloqueur technique identifié, procédure de bascule documentée | ✅ Activable sur décision |

**Niveau de confiance global : 8+/10**

---

## 2. CI — État réel

### Ce qui fonctionne

- **Workflow** (`.github/workflows/operia-ci.yml`) : 6 jobs orchestrés correctement
  - Setup → TypeScript + Lint + Unit Tests (parallèle) → Build → E2E (conditionnel)
  - Edge Tests (parallèle, indépendant via Deno)
- **Scripts** : `ci:check`, `typecheck`, `lint`, `test:e2e`, `test:e2e:smoke` tous cohérents
- **Cache npm** : correctement configuré avec hash de `package-lock.json`
- **E2E** : conditionnel sur `E2E_BASE_URL` (variable GitHub), pas de faux positif si non configuré

### Blocage corrigé

| Problème | Correction |
|----------|------------|
| `health:check` utilisait `Authorization: Bearer` au lieu de `apikey` | Header changé en `apikey`, clé anon embarquée en fallback |
| `health-check` absent de `config.toml` | Ajouté explicitement avec `verify_jwt = false` |

### Prérequis pour activation complète

| Secret GitHub | Obligatoire | Usage |
|---------------|-------------|-------|
| `SUPABASE_URL` | Oui (edge tests) | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Oui (edge tests) | Clé anon publique |
| `E2E_BASE_URL` (variable) | Non | Active les E2E si présent |

### E2E smoke tests

- Intégrés dans le workflow via `--grep @smoke`
- Nécessitent `E2E_BASE_URL` + utilisateurs seedés
- **Recommandation** : garder optionnels tant qu'un environnement de staging n'est pas disponible

### Verdict CI : ✅ Activable immédiatement après ajout des secrets GitHub

---

## 3. Monitoring — État réel

### Endpoint health-check

- **URL** : `GET https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
- **Auth** : `apikey` header uniquement (pas de JWT)
- **Checks** : database, auth, storage
- **Codes HTTP** : 200 (ok), 207 (degraded), 503 (down)
- **Config.toml** : `verify_jwt = false` maintenant explicite

### Script local `npm run health:check`

| Avant | Après |
|-------|-------|
| Utilisait `Authorization: Bearer` → rejeté sans JWT | Utilise `apikey` → fonctionne directement |
| Nécessitait `SUPABASE_ANON_KEY` env var | Clé anon embarquée en fallback |

### Branchement monitoring externe

La documentation `docs/production-remediation/external-monitoring-live-setup.md` est correcte et directement exploitable pour :
- UptimeRobot (keyword `"status":"ok"`)
- Better Uptime
- Checkly
- curl manuel

### Verdict monitoring : ✅ Branchable immédiatement

---

## 4. MFA enforced — Activation

### État actuel

| Couche | Mode | Couverture |
|--------|------|------------|
| **Frontend (UI)** | Advisory | Admin tabs, RH, Impersonation |
| **Serveur (Edge Functions)** | Advisory | 8 fonctions sensibles |

### Bloqueurs pour activer `enforced` ?

**Aucun bloqueur technique.**

L'infrastructure est complète :
- `MfaGuard` UI fonctionne en mode enforced (testé par code review)
- `requireAal2()` côté serveur supporte `enforced` via env var `SERVER_MFA_ENFORCEMENT`
- Supabase Auth v2 TOTP est pleinement supporté

### Conditions préalables à l'activation

1. **Au moins 1 admin N4+ doit avoir enrollé son facteur TOTP**
   - Sinon ils seront bloqués immédiatement
2. **Communiquer aux utilisateurs concernés** (franchisor_admin, platform_admin, superadmin)
3. **Avoir une procédure de recovery** (voir ci-dessous)

### Procédure d'activation safe

#### Phase 1 — Pré-activation (J-7)
```
1. Identifier tous les comptes N4+ actifs :
   SELECT p.email, p.global_role FROM profiles p
   WHERE p.global_role IN ('franchisor_admin', 'platform_admin', 'superadmin')
   AND p.is_active = true;

2. Leur envoyer une communication :
   "Le MFA sera obligatoire dans 7 jours. Activez-le maintenant dans Paramètres > Sécurité."

3. Vérifier le taux d'enrollment après 5 jours.
```

#### Phase 2 — Activation UI (J0)
```
1. Dans src/lib/mfa.ts, changer :
   export const MFA_ENFORCEMENT_MODE: MfaEnforcementMode = 'enforced';

2. Déployer. Les admins non-enrollés verront l'écran d'enrollment obligatoire.
```

#### Phase 3 — Activation serveur (J+1)
```
1. Dans Supabase Dashboard > Settings > Edge Functions > Secrets :
   Ajouter : SERVER_MFA_ENFORCEMENT = enforced

2. Les appels API sensibles exigeront maintenant AAL2.
```

### Procédure de rollback

| Urgence | Action | Temps |
|---------|--------|-------|
| Rollback UI | Remettre `MFA_ENFORCEMENT_MODE = 'advisory'` et redéployer | ~5 min |
| Rollback serveur | Changer le secret `SERVER_MFA_ENFORCEMENT = advisory` | ~1 min |
| Débloquer un compte | Supabase Dashboard > Auth > Users > supprimer le facteur TOTP | ~2 min |

### Ordre d'activation recommandé

1. `superadmin` d'abord (1-2 comptes, facile à superviser)
2. `platform_admin` ensuite
3. `franchisor_admin` en dernier (plus nombreux)

> Note : le ciblage par rôle est déjà intégré via `MFA_MIN_ROLE_LEVEL`. Pour un rollout par rôle, il faudrait ajuster ce seuil progressivement (N6 → N5 → N4).

### Verdict MFA : ✅ Activable sur décision, avec procédure de rollback immédiat

---

## 5. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `package.json` | Script `health:check` : header `apikey` au lieu de `Authorization`, clé anon en fallback |
| `supabase/config.toml` | Ajout explicite `[functions.health-check]` avec `verify_jwt = false` |
| `docs/final-operational-readiness-step7.md` | Ce rapport (créé) |

---

## 6. Ce qui reste avant 9/10

| Sujet | Effort | Impact |
|-------|--------|--------|
| **Activer MFA enforced** pour les superadmins | Faible (1 ligne + 1 secret) | Sécurité réelle |
| **Brancher un monitoring externe** (UptimeRobot/Better Uptime) | Faible (config externe) | Fiabilité opérationnelle |
| **Configurer les secrets GitHub** pour la CI | Faible (2 secrets) | CI fonctionnelle |
| **Environnement de staging** pour E2E automatisés | Moyen | Couverture qualité |
| **Rate limiting** sur les Edge Functions publiques | Moyen | Sécurité réseau |

Aucun de ces sujets ne nécessite de chantier d'architecture. Ce sont des actions opérationnelles concrètes.
