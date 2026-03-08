# Operia — Go-Live Readiness (Étape 8)

## 1. Résumé exécutif

| Levier | Prêt ? | Action humaine requise |
|--------|--------|----------------------|
| **MFA enforced** | ✅ Oui | Changer 1 constante frontend + 1 secret Supabase |
| **Monitoring externe** | ✅ Oui | Créer un monitor dans UptimeRobot ou Better Uptime |
| **CI GitHub** | ✅ Oui | Ajouter 2 secrets GitHub + activer branch protection |

**Niveau de confiance : 9/10** — Aucun bloqueur technique. Seules des actions de configuration externe restent.

---

## 2. MFA Enforced — Procédure d'activation

### Pré-requis

- Au moins 1 compte superadmin a enrollé son TOTP (vérifiable dans Supabase Dashboard > Auth > Users > facteurs MFA)
- Les admins concernés ont été prévenus (email, Slack, ou message interne)

### Rôles concernés

| Rôle | Niveau | Concerné |
|------|--------|----------|
| `superadmin` | N6 | ✅ Oui |
| `platform_admin` | N5 | ✅ Oui |
| `franchisor_admin` | N4 | ✅ Oui |
| `franchisor_user` | N3 | ❌ Non |
| `base_user` | N1 | ❌ Non |

### Étape A — Activer côté frontend

**Fichier :** `src/lib/mfa.ts`, ligne 44

```typescript
// AVANT
export const MFA_ENFORCEMENT_MODE: MfaEnforcementMode = 'advisory';

// APRÈS
export const MFA_ENFORCEMENT_MODE: MfaEnforcementMode = 'enforced';
```

**Effet :** Les admins N4+ non-enrollés verront un écran bloquant les invitant à configurer le MFA. Les admins enrollés devront vérifier leur code TOTP pour accéder aux zones sensibles.

### Étape B — Activer côté serveur (Edge Functions)

**Où :** Supabase Dashboard > Settings > Edge Functions > Secrets

```
Nom :    SERVER_MFA_ENFORCEMENT
Valeur : enforced
```

**Effet :** Les 8 Edge Functions sensibles (create-user, delete-user, reset-user-password, update-user-email, sensitive-data, export-all-data, export-full-database, create-dev-account) rejetteront les appels AAL1 avec HTTP 403 + `MFA_REQUIRED`.

### Ordre d'activation recommandé

```
Jour J-7 : Communiquer aux admins N4+
Jour J   : Activer le frontend (enforced)
Jour J+1 : Vérifier qu'aucun admin n'est bloqué sans recours
Jour J+2 : Activer le serveur (SECRET enforced)
```

### Rollback immédiat

| Urgence | Action | Délai |
|---------|--------|-------|
| Frontend | `MFA_ENFORCEMENT_MODE = 'advisory'` → redéployer | ~3 min |
| Serveur | Secret `SERVER_MFA_ENFORCEMENT = advisory` dans Supabase Dashboard | ~30 sec |
| Débloquer 1 compte | Supabase Dashboard > Auth > Users > sélectionner l'utilisateur > supprimer le facteur TOTP | ~1 min |

### Rollout progressif par rôle (optionnel)

Pour activer le MFA uniquement pour les superadmins d'abord :

```typescript
// src/lib/mfa.ts
export const MFA_MIN_ROLE_LEVEL = GLOBAL_ROLES.superadmin; // 6 au lieu de 4
```

Puis descendre progressivement : 6 → 5 → 4.

---

## 3. Monitoring externe — Configuration copier-coller

### Endpoint

```
GET https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check
```

### Header requis (un seul)

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI
```

> Pas de header `Authorization` nécessaire. `verify_jwt = false` dans config.toml.

### Réponse attendue (HTTP 200)

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T...",
  "totalLatencyMs": 245,
  "checks": [
    { "name": "database", "status": "ok", "latencyMs": 89 },
    { "name": "auth", "status": "ok", "latencyMs": 67 },
    { "name": "storage", "status": "ok", "latencyMs": 82 }
  ]
}
```

### Validation manuelle (copier-coller dans un terminal)

```bash
curl -s \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI" \
  | python3 -m json.tool
```

**Résultat attendu :** JSON avec `"status": "ok"` et HTTP 200.

### UptimeRobot — Configuration exacte

| Champ | Valeur |
|-------|--------|
| Monitor Type | HTTP(s) - Keyword |
| Friendly Name | `Operia Health Check` |
| URL | `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check` |
| Monitoring Interval | 5 minutes |
| Custom HTTP Headers | `apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI` |
| Keyword | `"status":"ok"` |
| Keyword Type | Keyword should exist |
| Alert Contact | Votre email ou Slack webhook |

### Better Uptime — Configuration exacte

| Champ | Valeur |
|-------|--------|
| Monitor Type | Keyword |
| URL | `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check` |
| Required keyword | `"status":"ok"` |
| Request headers | `{"apikey": "eyJhbGciOiJIUzI1NiIs...HbI"}` (clé complète) |
| Check period | 3 minutes |
| Recovery period | 2 checks |
| Confirmation period | 2 minutes |

### Seuils d'alerte recommandés

| Signal | Warning | Critique |
|--------|---------|----------|
| HTTP ≠ 200 | 2 checks consécutifs | 3 checks consécutifs |
| `totalLatencyMs` | > 3 000 ms | > 8 000 ms |
| Champ `status` | `degraded` | `down` |

### Validation post-setup

Après configuration du monitor :
1. Lancer `npm run health:check` en local → doit retourner `"status": "ok"`
2. Attendre 10 minutes → vérifier que le monitor est vert
3. (Optionnel) Simuler une alerte : impossible sans accès infra, mais un check `degraded` (207) déclenchera l'alerte keyword

---

## 4. CI GitHub — Activation

### Secrets à configurer

**GitHub > Settings > Secrets and variables > Actions**

| Secret | Obligatoire | Valeur | Usage |
|--------|-------------|--------|-------|
| `SUPABASE_URL` | ✅ Oui | `https://qvrankgpfltadxegeiky.supabase.co` | Edge Function tests (Deno) |
| `SUPABASE_ANON_KEY` | ✅ Oui | `eyJhbGciOiJIUzI1NiIs...HbI` (clé complète) | Edge Function tests (Deno) |

**GitHub > Settings > Variables > Actions**

| Variable | Obligatoire | Valeur | Usage |
|----------|-------------|--------|-------|
| `E2E_BASE_URL` | ❌ Non | URL d'un environnement de staging | Active les tests E2E Playwright |

### Ce qui tourne sans staging

Sans `E2E_BASE_URL`, la CI exécute :

```
✅ TypeScript (tsc --noEmit)
✅ Lint (eslint)
✅ Unit Tests (vitest)
✅ Edge Function Tests (deno test)
✅ Build (vite build)
⏭️ E2E (skipped — conditionnel)
```

**C'est un mode minimal viable complet et crédible.**

### Procédure d'activation (5 minutes)

```
1. GitHub > votre repo > Settings > Secrets and variables > Actions
2. Cliquer "New repository secret"
3. Ajouter SUPABASE_URL = https://qvrankgpfltadxegeiky.supabase.co
4. Ajouter SUPABASE_ANON_KEY = [clé anon complète]
5. Pousser un commit ou ouvrir une PR → la CI se lance automatiquement
```

### Branch protection recommandée

**GitHub > Settings > Branches > Add rule**

| Réglage | Valeur |
|---------|--------|
| Branch name pattern | `main` |
| Require status checks | ✅ Oui |
| Status checks requis | `🔍 TypeScript`, `🧪 Unit Tests`, `🏗️ Build` |
| Require branches up to date | ✅ Oui |
| Include administrators | ✅ Recommandé |

> Les Edge Tests et E2E sont volontairement exclus des checks requis pour ne pas bloquer les merges si les secrets ne sont pas configurés ou si le staging n'existe pas.

### Vérification post-activation

1. Pousser un commit sur une branche → ouvrir une PR vers `main`
2. Vérifier que les 5 jobs (hors E2E) passent au vert
3. Vérifier que le merge est bloqué si un job échoue

---

## 5. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `docs/final-step8-go-live-readiness.md` | Créé — ce rapport |

Aucune modification de code nécessaire. L'étape 7 a corrigé les derniers problèmes techniques (`health:check` header, `config.toml`).

---

## 6. Derniers blocages avant 9/10

| Sujet | Type | Effort |
|-------|------|--------|
| **Activer MFA enforced** | Action humaine (1 constante + 1 secret) | 5 min |
| **Créer le monitor externe** | Action humaine (UptimeRobot/Better Uptime) | 10 min |
| **Ajouter les secrets GitHub** | Action humaine (2 secrets) | 5 min |
| **Activer branch protection** | Action humaine (réglages GitHub) | 5 min |

**Total : ~25 minutes d'actions humaines pour atteindre 9/10.**

Aucun chantier d'architecture, aucune migration, aucun code supplémentaire requis.
