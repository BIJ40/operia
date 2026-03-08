# Rapport Final — Vague 2 de Remédiation Production-Grade

**Date :** 2026-03-08
**Périmètre :** 6 sujets importants post-audit

---

## 1. Résumé exécutif

### Corrigé
- **migrate-export :** Secret déplacé du query param vers le header `X-Migration-Secret` (avec compatibilité temporaire). Rate limiting in-memory ajouté (10 req/min).
- **config.toml :** `project_id` corrigé de `uxcovgqhgjsuibgdvcof` vers `qvrankgpfltadxegeiky` (projet réellement connecté).
- **withSentry :** Wrapper appliqué à 4 Edge Functions critiques (`create-user`, `export-all-data`, `suggest-planning`, `generate-monthly-report`).
- **Pré-check publication :** Script `npm run prepublish:check` ajouté (build validation).

### Audité et documenté
- **Health-check :** Analysé, jugé stable et compatible. Configurations prêtes pour UptimeRobot, Better Uptime, Checkly.
- **Purge CRONs :** 7 fonctions de purge/cron identifiées. Planification non visible dans le code — probablement configurée directement en base.

### Reste ouvert
- Suppression du support query param `?secret=` sur migrate-export (Vague 3)
- Vérification effective des `pg_cron` jobs en base de données
- Ajout d'auth sur `epi-generate-monthly-acks` (actuellement ouverte)
- Versionnement des configurations `pg_cron` dans le code source

---

## 2. Fichiers modifiés

| Fichier | Nature de la modification |
|---------|--------------------------|
| `supabase/functions/migrate-export/index.ts` | Header secret + rate limiting |
| `supabase/config.toml` | Correction project_id |
| `package.json` | Ajout script `prepublish:check` |
| `supabase/functions/create-user/index.ts` | Wrap withSentry |
| `supabase/functions/export-all-data/index.ts` | Wrap withSentry |
| `supabase/functions/suggest-planning/index.ts` | Import + wrap withSentry |
| `supabase/functions/generate-monthly-report/index.ts` | Import + wrap withSentry |

## Documents créés

| Document | Contenu |
|----------|---------|
| `docs/production-remediation/migrate-export-hardening.md` | Nouvelle API, plan de dépréciation |
| `docs/production-remediation/external-monitoring-live-setup.md` | Configs copier-coller monitoring |
| `docs/production-remediation/withsentry-rollout-wave2.md` | Fonctions traitées/non traitées |
| `docs/production-remediation/purge-crons-audit.md` | Inventaire CRONs + fréquences |
| `docs/production-remediation/final-report-wave2.md` | Ce document |

---

## 3. Risques traités

| Risque | Avant | Après | Réduction |
|--------|-------|-------|-----------|
| Secret migrate-export en URL | Critique | Faible | 🟢 Secret en header, rate limit |
| Incohérence project_id | Moyen | Résolu | 🟢 Corrigé |
| Functions sans Sentry | Moyen | Faible | 🟢 4/5 fonctions couvertes |
| Pas de validation pré-deploy | Moyen | Faible | 🟢 Script `prepublish:check` |
| Monitoring non branché | Important | Prêt | 🟡 Configs documentées, à brancher |
| CRONs non vérifiées | Moyen | Documenté | 🟡 À vérifier en base |

---

## 4. Garanties de non-régression

### UX
Aucune modification d'interface utilisateur.

### Permissions
Aucune modification de contrôle d'accès. Les fonctions modifiées conservent exactement la même logique d'autorisation.

### Contrats API
- **migrate-export :** Backward compatible — le query param `?secret=` reste fonctionnel temporairement.
- **Toutes les autres fonctions :** Même format de requête et de réponse.

### Données
Aucune modification de schéma, aucune migration, aucune suppression.

---

## 5. Tests / Vérifications réalisés

| Vérification | Méthode | Résultat |
|-------------|---------|----------|
| Build frontend | `vite build` via preview | ✅ Pas d'erreur |
| Cohérence withSentry | Revue de code manuelle | ✅ Wrapper compatible avec CORS et auth |
| proxy-apogee non modifié | Analyse du code existant | ✅ Déjà instrumenté, pas de double-wrap |
| migrate-export backward compat | Revue logique — `headerSecret \|\| querySecret` | ✅ Les deux méthodes fonctionnent |
| config.toml project_id | Comparé avec le projet connecté `qvrankgpfltadxegeiky` | ✅ Corrigé |

---

## 6. Points restants pour la suite

### Vague 3 — Suggestions

1. **Supprimer le support query param** sur `migrate-export` (breaking change planifié)
2. **Ajouter CRON_SECRET** à `epi-generate-monthly-acks` (actuellement sans auth)
3. **Vérifier et documenter les pg_cron jobs** existants en base (`SELECT * FROM cron.job`)
4. **Versionner la config pg_cron** dans un fichier SQL du projet
5. **Ajouter des tests E2E** pour les Edge Functions critiques
6. **MFA** pour les comptes administrateurs (N4+)
7. **Migrer les JWT** de `localStorage` vers un stockage plus sûr (httpOnly cookies)
8. **Ajouter withSentry** aux fonctions cron restantes (`purge-old-reports`, `trigger-monthly-reports`, etc.)
