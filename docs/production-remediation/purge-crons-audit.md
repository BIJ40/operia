# Audit des CRONs de Purge

## Fonctions de purge identifiées

### 1. `purge-old-reports`
- **Rôle :** Supprime les rapports mensuels (DB + fichiers Storage) de plus de 12 mois
- **Auth :** `CRON_SECRET` via header `X-CRON-SECRET`
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non — doit être planifié via `pg_cron` ou service externe

### 2. `trigger-monthly-reports`
- **Rôle :** Déclenche la génération des rapports mensuels pour toutes les agences actives
- **Auth :** `CRON_SECRET` via header `X-CRON-SECRET`
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non

### 3. `maintenance-alerts-scan`
- **Rôle :** Scan quotidien des événements de maintenance pour générer des alertes (overdue, upcoming)
- **Auth :** `MAINTENANCE_WEBHOOK_SECRET` via header `x-webhook-secret`
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non

### 4. `epi-generate-monthly-acks`
- **Rôle :** Génère les accusés de réception EPI mensuels pour toutes les agences
- **Auth :** ⚠️ **Aucune authentification** — fonction ouverte
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non
- **Risque :** Faible (opération idempotente, pas de suppression)

### 5. `media-garbage-collector`
- **Rôle :** Supprime les assets médias orphelins (non référencés en DB)
- **Auth :** `CRON_SECRET` via `Bearer` token OU JWT admin N5+
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non

### 6. `compute-apporteur-metrics`
- **Rôle :** Agrège les métriques quotidiennes des apporteurs depuis l'API Apogée
- **Auth :** Via CORS et vérification d'agence
- **verify_jwt :** `false`
- **Config TOML :** Présent
- **Planification visible dans le code :** ❌ Non

### 7. Fonctions de purge DB (via `pg_cron`)

D'après la mémoire projet, des tâches `pg_cron` sont configurées directement en base :
- **03:00 quotidien :** Purge `rate_limits` expirés, `ai_search_cache`, sessions temporaires
- **Rétention 6 mois :** `purge_old_activity_logs`
- **Rétention 12 mois :** `purge_old_ticket_history`

> ⚠️ Ces planifications sont dans la base de données, pas dans le code source. Elles ne sont donc pas versionnées et pourraient être perdues lors d'une restauration.

## Fréquences recommandées

| Fonction | Fréquence | Méthode recommandée |
|----------|-----------|---------------------|
| `purge-old-reports` | 1x/mois, le 2 à 04:00 | `pg_cron` + `net.http_post` |
| `trigger-monthly-reports` | 1x/mois, le 1er à 06:00 | `pg_cron` + `net.http_post` |
| `maintenance-alerts-scan` | 1x/jour à 07:00 | `pg_cron` + `net.http_post` |
| `epi-generate-monthly-acks` | 1x/mois, le 1er à 05:00 | `pg_cron` + `net.http_post` |
| `media-garbage-collector` | 1x/semaine, dimanche 03:00 | `pg_cron` + `net.http_post` |
| `compute-apporteur-metrics` | 1x/jour à 02:00 | `pg_cron` + `net.http_post` |

## Exemple de configuration `pg_cron`

```sql
-- Purge rapports anciens — 1er dimanche du mois à 04:00
SELECT cron.schedule(
  'purge-old-reports-monthly',
  '0 4 2 * *',
  $$
  SELECT net.http_post(
    url := 'https://qvrankgpfltadxegeiky.supabase.co/functions/v1/purge-old-reports',
    headers := '{"Content-Type": "application/json", "X-CRON-SECRET": "VOTRE_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Risques si non planifiées

| Fonction | Risque |
|----------|--------|
| `purge-old-reports` | Accumulation de fichiers Storage → coûts croissants |
| `maintenance-alerts-scan` | Alertes de maintenance non générées → risque opérationnel |
| `media-garbage-collector` | Fichiers orphelins accumulés → coûts Storage |
| `epi-generate-monthly-acks` | Accusés EPI non générés → non-conformité |
| `compute-apporteur-metrics` | Métriques apporteurs obsolètes → tableaux de bord incorrects |

## Statut actuel

⚠️ **La planification des fonctions Edge via `pg_cron` n'est pas visible dans le code source.** Elle est probablement configurée directement en base de données. Il est impossible de vérifier depuis le code si ces crons sont réellement actifs.

### Recommandation

1. Vérifier dans le dashboard Supabase (SQL Editor) : `SELECT * FROM cron.job;`
2. Si des crons manquent, les créer via la console SQL
3. **Documenter les crons actifs** dans un fichier versionné pour traçabilité
