# AXE 7 — Observabilité

> Audit production-grade Operia — 2026-03-08

---

## 1. État actuel

### 1.1 Sentry (Frontend)
- **SDK**: `@sentry/react` v10 ✅
- **Environnements**: `development` / `preview` / `staging` / `production` ✅
- **Filtrage**: ChunkLoadError, network errors, ResizeObserver ignorés ✅
- **User context**: userId, email, globalRole, agencySlug ✅
- **Breadcrumbs**: Fonction `addBreadcrumb` disponible mais peu utilisée
- **Sample rate**: 100% des erreurs ✅

### 1.2 Sentry (Edge Functions)
- **Implémentation custom** (`_shared/sentry.ts`) — HTTP POST direct vers Sentry store API
- **Tags**: runtime=deno, function name, globalRole, agencySlug ✅
- **Stack trace parsing**: Implémenté mais basique (regex-based)
- **Couverture**: Via `withSentry` wrapper — **pas utilisé par toutes les fonctions**

### 1.3 Logger structuré (Frontend)
- `createLogger({ module })` → niveaux debug/info/warn/error ✅
- **Production**: Seuls warn/error émis (debug/info filtrés sauf `VITE_DEBUG_LOGS=true`) ✅
- **Sentry forwarding**: Tous les `error` envoyés à Sentry automatiquement ✅
- **175+ fichiers** utilisent le logger legacy (ponté vers createLogger) ✅

### 1.4 Edge Monitor (Frontend)
- `monitorEdgeCall()` — mesure durée, capture erreurs, log slow calls (>3s)
- **Utilisé sur 3 appels seulement**: `create-user`, `media-get-signed-url`, `export-all-data`
- **Historique in-memory**: 100 dernières métriques (dev only)

### 1.5 Health Check
- Edge Function `health-check` vérifie: Database, Auth, Storage
- Retourne latence par service + status global (ok/degraded/down)
- **CORS**: `Access-Control-Allow-Origin: *` (plus permissif que les autres fonctions)
- **Pas de monitoring externe configuré** (UptimeRobot, etc.)

## 2. Zones sans observabilité

### 2.1 Edge Functions non couvertes par Sentry

| Fonction | withSentry | Risque |
|---|---|---|
| `create-user` | ❌ | Erreurs non remontées à Sentry |
| `export-all-data` | ❌ | Idem |
| `proxy-apogee` | ❌ | Flux critique non observé |
| `suggest-planning` | ❌ | IA planning non observée |
| `generate-monthly-report` | ❌ | Reports non observés |
| `sensitive-data` | ⚠️ Partiel | captureEdgeException dans catch global uniquement |

### 2.2 Pas de métriques business
- Pas de compteur de créations d'utilisateurs par jour
- Pas de compteur de tickets créés
- Pas de métrique de temps de réponse moyen
- Pas de suivi du nombre d'utilisateurs actifs

### 2.3 Pas d'alertes automatiques
- Pas d'alerte sur taux d'erreurs élevé
- Pas d'alerte sur latence dégradée
- Pas d'alerte sur espace storage
- Pas d'alerte sur taille de tables (activity_log, rate_limits)

### 2.4 Pas de logs persistants côté frontend
- Les logs `console.*` disparaissent quand l'utilisateur ferme l'onglet
- Pas de remote logging (ex: LogRocket, Datadog RUM)
- Sentry capture uniquement les erreurs, pas les logs info/warn

## 3. Matrice d'observabilité

| Composant | Logs | Métriques | Alertes | Traces |
|---|---|---|---|---|
| Frontend (React) | ✅ Console | ❌ | ✅ Sentry errors | ✅ Sentry breadcrumbs |
| Edge Functions | ✅ Console (Supabase logs) | ❌ | ⚠️ Sentry partiel | ❌ |
| Database | ❌ (pg_stat non accessible) | ❌ | ❌ | ❌ |
| Storage | ❌ | ❌ | ❌ | ❌ |
| Auth | ❌ | ❌ | ❌ | ❌ |
| Apogee API | ✅ Logs proxy | ❌ | ❌ | ❌ |

## 4. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Configurer un monitoring externe sur `/functions/v1/health-check` (UptimeRobot, Better Uptime) |
| 🟠 Important | Envelopper les 5 Edge Functions critiques dans withSentry |
| 🟠 Important | Étendre monitorEdgeCall à tous les appels edge critiques (au moins 10-15) |
| 🟡 Confort | Ajouter des métriques business dans activity_log (compteurs agrégés) |
| 🟡 Confort | Configurer des alertes Sentry sur le taux d'erreurs |
| 🟡 Confort | Envisager Datadog RUM ou LogRocket pour les sessions utilisateur |
