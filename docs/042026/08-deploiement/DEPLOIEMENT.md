# Déploiement OPERIA

> **Date** : 29 mars 2026

---

## 1. Modes de déploiement

### Lovable Cloud (principal)

- **Build** : Vite automatique à chaque push
- **CDN** : Distribution mondiale
- **URL Preview** : `id-preview--*.lovable.app`
- **URL Production** : `operiav2.lovable.app`
- **Edge Functions** : déployées automatiquement

### Self-hosted (Docker)

```bash
# Build
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... \
  --build-arg VITE_SUPABASE_PROJECT_ID=xxx \
  -t operia .

# Run
docker run -p 80:80 operia
```

**Dockerfile** : build multi-stage (Node 20 Alpine → Nginx Alpine)

### Docker Compose (optionnel)

```yaml
services:
  operia:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=...
```

---

## 2. Variables d'environnement

### Frontend (Vite)

| Variable | Obligatoire | Description |
|----------|:-:|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Clé anon Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | ID projet Supabase |

### Edge Functions (Secrets Supabase)

| Secret | Usage |
|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Accès admin DB |
| `RESEND_API_KEY` | Envoi emails |
| `OPENAI_API_KEY` | Embeddings IA |
| `MAPBOX_ACCESS_TOKEN` | Cartes |
| `GOTENBERG_URL` | Conversion PDF |
| `SENSITIVE_DATA_ENCRYPTION_KEY` | Chiffrement AES-256-GCM |
| `STRIPE_SECRET_KEY` | Paiements |
| `SENTRY_DSN` | Monitoring |
| `CRON_SECRET` | Authentification CRON |

---

## 3. Migrations Supabase

Les migrations sont dans `supabase/migrations/` (fichiers SQL ordonnés par timestamp).

**Règles** :
- Ne jamais modifier une migration existante
- Utiliser le tool migration de Lovable pour créer
- Tester en preview avant production
- Ne jamais faire `ALTER DATABASE postgres`

---

## 4. Nginx (self-host)

Configuration dans `nginx.conf` :
- SPA fallback : toutes les routes → `index.html`
- Gzip activé
- Cache assets statiques
- Headers de sécurité

---

## 5. Setup local (30 min)

```bash
# 1. Cloner
git clone <repo-url> && cd operia

# 2. Installer
npm install

# 3. Configurer
cp .env.example .env
# Remplir VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID

# 4. Lancer
npm run dev

# 5. Build production
npm run build
```
