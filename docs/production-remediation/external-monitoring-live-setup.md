# Monitoring Externe — Configuration Opérationnelle

## Endpoint

```
GET https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check
```

### Headers requis

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI
```

> Note : `health-check` n'a pas `verify_jwt` dans config.toml, donc pas de header Authorization nécessaire. Seul l'apikey Supabase est requis.

### Réponse

```json
{
  "status": "ok",           // "ok" | "degraded" | "down"
  "timestamp": "2026-03-08T12:00:00.000Z",
  "totalLatencyMs": 245,
  "checks": [
    { "name": "database", "status": "ok", "latencyMs": 89 },
    { "name": "auth",     "status": "ok", "latencyMs": 67 },
    { "name": "storage",  "status": "ok", "latencyMs": 82 }
  ]
}
```

### Codes HTTP

| Code | Signification |
|------|---------------|
| 200  | Tout OK |
| 207  | Dégradé (au moins un check KO) |
| 503  | Tout down |

## Configurations prêtes à copier-coller

### curl (test manuel)

```bash
curl -s \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI" \
  | python3 -m json.tool
```

### UptimeRobot

1. **Monitor Type :** HTTP(s) - Keyword
2. **URL :** `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
3. **Custom HTTP Headers :**
   ```
   apikey: eyJhbGciOiJIUzI1NiIs...
   ```
4. **Keyword :** `"status":"ok"`
5. **Keyword Type :** Keyword should exist
6. **Monitoring Interval :** 5 minutes
7. **Alert Contact :** Configurer email/Slack

### Better Uptime

1. **Monitor Type :** Keyword
2. **URL :** `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
3. **Required keyword :** `"status":"ok"`
4. **Request headers :**
   ```json
   { "apikey": "eyJhbGciOiJIUzI1NiIs..." }
   ```
5. **Check period :** 3 minutes
6. **Recovery period :** 2 checks

### Checkly

```javascript
const { expect } = require('chai');

const response = await request.get(
  'https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check',
  {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY
    }
  }
);

expect(response.status).to.equal(200);
const body = JSON.parse(response.body);
expect(body.status).to.equal('ok');
expect(body.totalLatencyMs).to.be.below(5000);
```

## Seuils d'alerte recommandés

| Métrique | Warning | Critique |
|----------|---------|----------|
| Status HTTP | ≠ 200 pendant 2 checks | ≠ 200 pendant 3 checks |
| `totalLatencyMs` | > 3000ms | > 8000ms |
| `status` field | `degraded` | `down` |
| Indisponibilité | > 5 minutes | > 15 minutes |

## État actuel du health-check

La fonction est stable et retourne les 3 checks (database, auth, storage). Aucune modification n'a été nécessaire — le format de réponse est déjà propre et compatible avec tous les services de monitoring.
