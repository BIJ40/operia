# AXE 9 — Déploiement

> Audit production-grade Operia — 2026-03-08

---

## 1. Pipeline actuel

```
Code modifié dans Lovable
  ↓ Build automatique (Vite)
  ↓ Déploiement SPA sur Lovable CDN
  ↓ Edge Functions auto-déployées sur Supabase
  ↓ Migrations SQL via outil Supabase intégré
```

### 1.1 Caractéristiques
- **Pas de CI/CD traditionnel** (GitHub Actions, etc.)
- **Pas de pipeline de tests avant déploiement** → le code est déployé dès modification
- **Pas de staging environment** séparé (Test = environnement Lovable, Live = publication)
- **Pas de rollback automatique** — rollback = reverter manuellement le code
- **Pas de blue/green deployment**
- **Pas de canary releases**

### 1.2 Environnements

| Env | URL | Base de données | Utilisation |
|---|---|---|---|
| Preview (Test) | `id-preview--*.lovable.app` | Supabase Test | Dev & tests |
| Production (Live) | `operiav2.lovable.app` | Supabase Live | Utilisateurs réels |

- Les deux environnements partagent le même projet Supabase mais avec des données séparées
- Publication = déploiement code + schéma de Test vers Live
- **Les données ne sont jamais synchronisées** entre Test et Live

## 2. Gestion des secrets

### 2.1 Secrets frontend
- `VITE_SUPABASE_URL` — auto-injecté par Lovable ✅
- `VITE_SUPABASE_PUBLISHABLE_KEY` — auto-injecté ✅
- `VITE_SENTRY_DSN` — configuré manuellement
- Pas de fichier `.env` dans le repo ✅

### 2.2 Secrets Edge Functions
- Gérés via Supabase Dashboard > Functions > Secrets
- `SUPABASE_SERVICE_ROLE_KEY` — auto-géré par Supabase
- `RESEND_API_KEY`, `SENTRY_DSN`, `SENSITIVE_DATA_ENCRYPTION_KEY` — manuels
- **Pas de secret rotation automatique**
- **Pas d'alerte si un secret expire ou est supprimé**

### 2.3 Secrets exposés
- `supabase/config.toml` contient `project_id = "uxcovgqhgjsuibgdvcof"` — pas le même que le projet connecté (`qvrankgpfltadxegeiky`) → **incohérence** ⚠️
- Clé anon Supabase dans le code auto-généré — publique par design ✅

## 3. Risques

### 3.1 Déploiement sans tests
- Le code est déployé immédiatement sans passer par une suite de tests automatisée
- Les 255 tests Vitest et 19 tests Deno existent mais ne bloquent pas le déploiement
- **Risque**: Une régression peut atteindre la production sans être détectée

### 3.2 Pas de rollback rapide
- En cas de bug en production, il faut reverter le code dans Lovable
- Les migrations DB ne sont pas réversibles facilement
- **Risque**: Temps de résolution d'incident allongé

### 3.3 Incohérence config.toml
- `project_id` dans `supabase/config.toml` ne correspond pas au projet Supabase connecté
- Peut causer des confusions ou des erreurs de déploiement Edge Functions

### 3.4 Dépendance à Lovable pour le déploiement
- Si Lovable est indisponible → impossible de déployer
- Pas de pipeline de déploiement alternatif documenté

## 4. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Corriger l'incohérence `project_id` dans config.toml |
| 🟠 Important | Ajouter `npm run build && npm run test` comme pre-publish check |
| 🟠 Important | Documenter la procédure de rollback (code + DB) |
| 🟡 Confort | Mettre en place un GitHub Actions pour CI (tests auto sur push) |
| 🟡 Confort | Configurer des notifications de déploiement (Slack/email) |
