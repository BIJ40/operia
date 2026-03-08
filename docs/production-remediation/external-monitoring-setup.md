# 📡 Guide d'intégration monitoring externe — health-check

> **Date** : 2026-03-08  
> **Statut** : Prêt à brancher

---

## 1. Endpoint health-check

### URL
```
GET https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check
```

### Authentification
Aucune (endpoint public par design — `verify_jwt` non listé dans config.toml, donc true par défaut).

> **Note** : L'endpoint nécessite l'en-tête `apikey` standard Supabase pour passer le gateway :
```
apikey: <SUPABASE_ANON_KEY>
```

### Réponse type
```json
{
  "status": "ok",
  "timestamp": "2026-03-08T10:00:00.000Z",
  "totalLatencyMs": 245,
  "checks": [
    { "name": "database", "status": "ok", "latencyMs": 120 },
    { "name": "auth", "status": "ok", "latencyMs": 85 },
    { "name": "storage", "status": "ok", "latencyMs": 40 }
  ]
}
```

### Codes HTTP
| Code | Signification |
|---|---|
| `200` | Tous les checks OK |
| `207` | Partiellement dégradé (au moins un check OK, au moins un en erreur) |
| `503` | Tous les checks en erreur — service down |

### Checks effectués
| Check | Méthode | Ce qu'il teste |
|---|---|---|
| `database` | `SELECT id FROM profiles LIMIT 1` | Connectivité PostgreSQL |
| `auth` | `GET /auth/v1/settings` | Service d'authentification |
| `storage` | `GET /storage/v1/bucket` | Service de stockage fichiers |

---

## 2. Configuration UptimeRobot

1. **Créer un nouveau monitor**
   - Type : `HTTP(s)`
   - URL : `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
   - Méthode : `GET`
   - Intervalle : `5 minutes`

2. **Headers personnalisés**
   ```
   apikey: <VOTRE_SUPABASE_ANON_KEY>
   ```

3. **Critères d'alerte**
   - HTTP Status ≠ 200 → Alerte
   - Timeout : 30 secondes
   - Confirmations avant alerte : 2 (éviter les faux positifs)

4. **Notifications**
   - Email de l'équipe technique
   - Webhook Slack (optionnel)

---

## 3. Configuration Better Uptime

1. **Nouveau monitor HTTP**
   - URL : `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
   - Méthode : `GET`
   - Check period : `3 minutes`
   - Request headers :
     ```json
     { "apikey": "<VOTRE_SUPABASE_ANON_KEY>" }
     ```

2. **Conditions d'alerte**
   - Response code NOT IN [200] → Warning
   - Response code IN [503] → Critical
   - Response code IN [207] → Warning (dégradé)

3. **Validation du body (optionnel)**
   - Chercher `"status":"ok"` dans le body pour un check plus strict

---

## 4. Configuration Checkly / Datadog

### Checkly
```javascript
// API Check
const response = await fetch('https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check', {
  headers: { 'apikey': process.env.SUPABASE_ANON_KEY }
});
const body = await response.json();
assert(response.status === 200, `Status: ${response.status}`);
assert(body.status === 'ok', `Health: ${body.status}`);
assert(body.totalLatencyMs < 5000, `Latency: ${body.totalLatencyMs}ms`);
```

### Datadog HTTP Check
- URL : `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check`
- Headers : `apikey:<ANON_KEY>`
- Assertions : `status_code is 200`, `body contains "ok"`

---

## 5. Seuils d'alerte recommandés

| Métrique | Warning | Critical |
|---|---|---|
| HTTP Status | ≠ 200 pendant 2 checks consécutifs | 503 pendant 1 check |
| Latence totale | > 3000ms | > 10000ms |
| Latence database | > 2000ms | > 5000ms |
| Latence auth | > 2000ms | > 5000ms |
| Disponibilité mensuelle | < 99.5% | < 99% |

---

## 6. Status page publique (optionnel)

Si vous souhaitez exposer un status page :
- **Better Uptime** et **UptimeRobot** proposent des pages publiques gratuites
- URL suggérée : `status.helpconfort.services`
- Monitors à exposer : health-check global uniquement (ne pas exposer les checks individuels)

---

## 7. Vérification rapide (curl)

```bash
# Test basique
curl -s -H "apikey: <ANON_KEY>" \
  https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check | jq .

# Test avec vérification du code retour
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: <ANON_KEY>" \
  https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check
# Attendu: 200
```
