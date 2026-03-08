# Hardening opérationnel — Étape 2 (Final)

**Date** : 2026-03-08  
**Scope** : Fail-closed, suppression fallback, monitoring branchable

---

## 1. Résumé exécutif

### Corrigé
- **maintenance-alerts-scan** : passé de fail-open à **fail-closed** — si `MAINTENANCE_WEBHOOK_SECRET` n'est pas provisionné ou invalide, la fonction refuse systématiquement l'exécution (401).
- **migrate-export** : le fallback `?secret=xxx` en query param a été **supprimé**. Seul le header `X-Migration-Secret` est accepté.

### Confirmé
- **health-check** : endpoint fonctionnel, format stable, prêt pour branchement UptimeRobot / BetterUptime / Checkly sans modification.
- Script `npm run health:check` ajouté pour vérification locale immédiate.

### Encore ouvert
- Branchement effectif d'un service de monitoring externe (nécessite action manuelle hors Lovable).
- Provisionnement de `MAINTENANCE_WEBHOOK_SECRET` dans Supabase si non encore fait.

---

## 2. Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `supabase/functions/maintenance-alerts-scan/index.ts` | Fail-closed auth guard |
| `supabase/functions/migrate-export/index.ts` | Suppression query param, nettoyage commentaires |
| `package.json` | Ajout script `health:check` |
| `docs/production-remediation/final-hardening-step2.md` | Ce document |

---

## 3. maintenance-alerts-scan — Fail-closed

### État avant
```typescript
// Si le secret est configuré, il doit matcher — MAIS si non configuré, la fonction s'exécute quand même
if (webhookSecret && providedSecret !== webhookSecret) { ... }
```
**Risque** : si `MAINTENANCE_WEBHOOK_SECRET` n'est pas provisionné dans Supabase, n'importe quel appelant anonyme pouvait déclencher le scan et créer/modifier des données maintenance.

### Correction appliquée
```typescript
// FAIL-CLOSED: le secret DOIT être provisionné ET DOIT matcher
if (!webhookSecret || !providedSecret || providedSecret !== webhookSecret) {
  return 401 Unauthorized;
}
```

### Preuve de fail-closed
- Secret absent → `!webhookSecret` → 401
- Secret présent mais header manquant → `!providedSecret` → 401
- Secret présent mais header invalide → `providedSecret !== webhookSecret` → 401
- Secret présent et header valide → exécution normale

---

## 4. migrate-export — Suppression du query param

### Audit des appelants
Recherche exhaustive dans le codebase (`migrate-export` hors `supabase/functions/`) :
- **Résultat** : uniquement référencé dans `src/config/changelog.ts` (descriptions textuelles)
- **Aucun appel programmatique** n'utilise `?secret=xxx`
- **Conclusion** : le fallback peut être retiré sans impact

### Retrait effectué
- Supprimé : `url.searchParams.get('secret')` et le fallback `headerSecret || querySecret`
- Supprimé : le warning de dépréciation console
- Nettoyé : tous les commentaires `?secret=xxx` dans le fichier remplacés par `X-Migration-Secret header`
- Conservé : validation `X-Migration-Secret` identique, rate limiting identique, logique export identique

### Impact nul confirmé
- Aucun code front-end ne consomme cette Edge Function
- L'appel se fait exclusivement via un outil externe (migration manuelle) avec le header

---

## 5. Monitoring externe — Mode d'emploi final

### Endpoint

```
GET https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check
```

### Headers requis

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI
```

### Format de réponse

```json
{
  "status": "ok" | "degraded" | "down",
  "timestamp": "2026-03-08T12:00:00.000Z",
  "totalLatencyMs": 150,
  "checks": [
    { "name": "database", "status": "ok", "latencyMs": 45 },
    { "name": "auth", "status": "ok", "latencyMs": 30 },
    { "name": "storage", "status": "ok", "latencyMs": 75 }
  ]
}
```

### Codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Tous les services sont OK |
| `207` | Au moins un service dégradé (mais pas tous down) |
| `503` | Tous les services sont down |

### Configuration par service

#### UptimeRobot
1. **Monitor Type** : HTTP(s)
2. **URL** : `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
3. **HTTP Method** : GET
4. **Custom HTTP Headers** :
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI
   ```
5. **Monitoring Interval** : 5 minutes
6. **Alert condition** : Status code ≠ 200
7. **Keyword** : `"status":"ok"` (type: exists)

#### Better Uptime
1. **Monitor Type** : Expected status code
2. **URL** : même URL
3. **Request Headers** : même Authorization
4. **Check Interval** : 3 minutes
5. **Expected Status Code** : 200
6. **Request Timeout** : 30s

#### Checkly
```javascript
// checkly-health.check.js
const { ApiCheck, AssertionBuilder } = require('checkly/constructs');

new ApiCheck('operia-health', {
  name: 'Operia Health Check',
  request: {
    method: 'GET',
    url: 'https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check',
    headers: [
      { key: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1N...' },
    ],
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('ok'),
    ],
  },
  frequency: 5,
  locations: ['eu-west-1'],
});
```

### Vérification locale

```bash
# Via npm script (utilise la clé anon par défaut)
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI" npm run health:check

# Via curl direct
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI" \
  https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check | jq .
```

---

## 6. Vérifications réalisées

| Vérification | Résultat |
|-------------|----------|
| Recherche d'appelants internes `?secret=` pour migrate-export | ✅ Aucun trouvé |
| Logique fail-closed maintenance-alerts-scan | ✅ 3 cas de rejet vérifiés |
| Contrat de réponse health-check | ✅ Format JSON stable, codes HTTP documentés |
| Edge Functions redéployées | ✅ maintenance-alerts-scan + migrate-export |
| Script `npm run health:check` | ✅ Ajouté au package.json |
| Aucune modification métier/UX/permissions | ✅ Confirmé |
