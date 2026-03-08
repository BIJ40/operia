# AXE 10 — Self-Host Readiness

> Audit production-grade Operia — 2026-03-08

---

## 1. Dépendances à Supabase

| Composant | Self-hostable | Complexité | Alternative |
|---|---|---|---|
| **PostgreSQL** | ✅ Oui | Faible | Tout PG 15+ |
| **GoTrue (Auth)** | ✅ Oui | Moyenne | Supabase self-hosted ou Keycloak |
| **Edge Functions (Deno)** | ⚠️ Partiel | Haute | Deno Deploy self-hosted ou migrer vers Node.js |
| **Storage** | ✅ Oui | Moyenne | MinIO (S3-compatible) |
| **Realtime** | ✅ Oui | Moyenne | Supabase Realtime self-hosted |
| **PostgREST** | ✅ Oui | Faible | PostgREST standard |
| **Supabase JS SDK** | ✅ Compatible | Faible | Pointe vers self-hosted URL |

### 1.1 Edge Functions — Principal obstacle

Les 70+ Edge Functions utilisent le runtime Deno avec des imports ESM depuis `esm.sh`. Pour self-host:
- Option 1: Supabase self-hosted (inclut Edge Functions via Deno Deploy)
- Option 2: Migrer chaque Edge Function vers Node.js/Express
- Option 3: Utiliser Deno Deploy standalone

**Effort estimé pour migration Node.js**: 3-6 semaines (70+ fonctions)

### 1.2 SDK Supabase
Le client Supabase (`@supabase/supabase-js`) fonctionne avec n'importe quelle instance Supabase (cloud ou self-hosted). Il suffit de changer `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 2. Dépendances à Lovable

| Composant | Dépendance | Substituable |
|---|---|---|
| **Hébergement SPA** | Lovable CDN | ✅ Vercel, Netlify, Nginx, Caddy |
| **Build pipeline** | Vite (standard) | ✅ `npm run build` → fichiers statiques |
| **Preview URLs** | Lovable-specific | ❌ Non nécessaire en self-host |
| **CORS whitelist** | `*.lovable.app` hardcodé | ⚠️ À modifier dans `_shared/cors.ts` et `withSentry.ts` |
| **`lovable-tagger`** | devDependency | ✅ Retirable sans impact |
| **`cdn.gpteng.co`** | Référencé dans CSP | ⚠️ À retirer du CSP |

### 2.1 Points d'attention CORS
Les origines Lovable sont hardcodées dans :
- `supabase/functions/_shared/cors.ts` (lignes 6-12 + patterns)
- `supabase/functions/_shared/withSentry.ts` (lignes 14-17)

Pour self-host, il faut :
1. Remplacer les origines par le domaine de production
2. Utiliser `ALLOWED_ORIGINS` env variable (déjà supporté dans cors.ts) ✅

### 2.2 CSP
Le `index.html` référence `https://cdn.gpteng.co` dans le CSP → à retirer pour self-host.

## 3. Build

### 3.1 Build process
```bash
npm install
npm run build  # → dist/
```

Le build produit des fichiers statiques servables par n'importe quel serveur HTTP.

### 3.2 Variables d'environnement requises
```
VITE_SUPABASE_URL=https://your-supabase.example.com
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SENTRY_DSN=https://your-sentry-dsn (optionnel)
```

### 3.3 Configuration serveur
- Serveur HTTP avec SPA fallback (`index.html` pour toutes les routes)
- HTTPS obligatoire (auth cookies, CSP)
- Headers recommandés: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

## 4. Ce qui empêche un self-host complet

| Bloquant | Criticité | Effort |
|---|---|---|
| Edge Functions runtime Deno | 🔴 | 3-6 semaines si migration Node |
| CORS hardcodé Lovable | 🟡 | 1 heure (env var déjà supportée) |
| CSP `cdn.gpteng.co` | 🟢 | 5 minutes |
| Supabase platform setup | 🟠 | 1-2 jours (docker-compose) |
| Secrets migration | 🟡 | 2 heures |
| DNS + HTTPS | 🟡 | Variable |

### Verdict
**Self-host est faisable** avec Supabase self-hosted (Docker). Le principal effort est la mise en place de l'infrastructure Supabase + la configuration CORS/CSP. Si Edge Functions doivent être migrées hors Supabase, c'est un chantier de plusieurs semaines.

## 5. Recommandations

| Priorité | Action |
|---|---|
| 🟠 Important | Documenter la procédure de self-host avec Supabase Docker |
| 🟠 Important | Externaliser toutes les origines CORS dans des env variables |
| 🟡 Confort | Créer un `docker-compose.yml` pour environnement de développement local |
| 🟡 Confort | Documenter les secrets requis et leur source |
