# AXE 3 — Gestion des Erreurs

> Audit production-grade Operia — 2026-03-08

---

## 1. Architecture erreurs

### Frontend
- **GlobalErrorBoundary**: Capture toutes les erreurs React non gérées → Sentry + UI de fallback ✅
- **safeQuery / safeMutation / safeInvoke**: Wrappers Supabase avec correlationId + logging ✅
- **Toast notifications**: ~2800 usages de `toast.error` / `toast.success` dans 140 fichiers
- **Logger structuré**: `createLogger` avec niveaux debug/info/warn/error, forwarding Sentry sur error ✅

### Edge Functions
- **withSentry wrapper**: Capture erreurs non gérées + timing + CORS ✅
- **try/catch**: Présent dans toutes les fonctions critiques (~735 occurrences)
- **Erreurs structurées**: Réponses JSON avec `{ error: "message" }` + status HTTP

### Database
- **RLS violations**: Retournées comme erreurs Supabase (gérées par safeQuery)
- **Triggers**: Erreurs potentiellement silencieuses (ex: trigger `track_entity_changes`)

## 2. Problèmes identifiés

### 2.1 Erreurs silencieuses (catch vide)

**987 `catch {}` identifiés dans 95 fichiers**. La majorité sont justifiés (JSON.parse fallback, sessionStorage), mais certains masquent des erreurs réelles :

```typescript
// ⚠️ Exemples problématiques
} catch {
  // ignore  (dans AdminDatabaseExport.tsx — export table failure silencieux)
}

} catch {
  failedTables.push(t.name);  // Log partiel, pas de notification utilisateur
}
```

**Verdict**: La plupart des `catch {}` sont sur du parsing/storage non critique → acceptable. Mais ~10% masquent des erreurs métier.

### 2.2 Timeout fictif dans AuthContext

```typescript
const timeoutId = setTimeout(() => {
  throw new Error('Timeout: chargement profil trop long');
}, 10000);
```

Ce timeout **throw dans un callback setTimeout**, pas dans la Promise. Il ne cancel pas `Promise.all` et produit une erreur uncaught qui remonte au GlobalErrorBoundary au lieu de gérer gracieusement le timeout.

**Impact**: Si le profil met >10s, l'app crash avec une erreur non gérée au lieu d'afficher un message propre.

### 2.3 Propagation d'erreurs Edge → Frontend

Le pattern standard est correct :
```
Edge Function → JSON { error: "message" } → status 400/401/403/500
Frontend → supabase.functions.invoke() → { data, error }
```

Mais certains appels ne vérifient pas `data.error` (la réponse peut être `{ error: "..." }` avec status 200) :
- Environ 49 fichiers appellent `supabase.functions.invoke` 
- Tous ne passent pas par `safeInvoke`

### 2.4 Erreurs réseau non différenciées

Le QueryClient retry sur toutes les erreurs sauf 401/403/404. Mais les erreurs 429 (rate limit) et 503 (service unavailable) ne sont pas différenciées → retry inutile sur rate limit.

### 2.5 Edge Functions sans withSentry

Plusieurs fonctions critiques utilisent `serve()` directement sans `withSentry` :
- `create-user` → pas de wrapper Sentry
- `export-all-data` → pas de wrapper Sentry
- `health-check` → pas de wrapper Sentry (acceptable)
- `proxy-apogee` → pas de wrapper Sentry

Ces fonctions ont leur propre try/catch mais les erreurs ne sont pas systématiquement envoyées à Sentry.

## 3. Matrice de couverture erreurs

| Composant | Try/Catch | Log | Toast UI | Sentry | Retry |
|---|---|---|---|---|---|
| Auth (login/logout) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Requêtes DB (hooks) | ✅ via TanStack | ✅ | ✅ | Partiel | ✅ (×2) |
| Edge Functions calls | ✅ | ✅ | ✅ | Partiel (3/70) | ❌ |
| Edge Functions impl | ✅ | ✅ console | N/A | Partiel | N/A |
| Storage uploads | ✅ | ✅ | ✅ | ❌ | ❌ |
| Proxy Apogee | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Corriger le timeout fictif dans AuthContext (utiliser AbortController) |
| 🟠 Important | Envelopper `create-user`, `export-all-data`, `proxy-apogee` dans withSentry |
| 🟠 Important | Ajouter gestion 429 dans le retry du QueryClient |
| 🟡 Confort | Standardiser l'usage de `safeInvoke` pour tous les appels Edge Functions |
| 🟡 Confort | Auditer les ~100 `catch {}` pour identifier les erreurs métier masquées |
