# AUDIT PRODUCTION-GRADE — RAPPORT FINAL

> Operia / HC Services  
> Date: 2026-03-08  
> Auditeur: Lovable AI  
> Scope: Architecture, sécurité, fiabilité, observabilité, self-host readiness

---

## 1. Score Production Readiness

| Domaine | Score | Commentaire |
|---|---|---|
| **Architecture** | 7/10 | Bien structurée mais SPOF Supabase total |
| **Sécurité** | 7/10 | Bonne base, mais MFA absent et 13 endpoints jwt=false |
| **Fiabilité** | 6/10 | Pas de circuit breaker, timeout fictif AuthContext, listUsers O(n) |
| **Observabilité** | 5/10 | Sentry partiel, pas d'alertes, pas de métriques business |
| **Exploitabilité** | 6/10 | Pas de CI/CD, pas de rollback, pas de staging |
| **Self-host readiness** | 7/10 | Faisable avec Supabase self-hosted, CORS à configurer |

### **Score global: 6.3 / 10**

> **Verdict**: Operia est fonctionnelle en production pour un usage interne avec un volume modéré d'utilisateurs. Elle n'est pas encore au niveau d'un SaaS production-grade public. Les fondations sont solides (permissions, chiffrement, RLS) mais l'observabilité et l'exploitabilité sont insuffisantes pour garantir une disponibilité élevée.

---

## 2. Top 10 Risques

| # | Risque | Impact | Probabilité | Criticité |
|---|---|---|---|---|
| 1 | **Perte de `SENSITIVE_DATA_ENCRYPTION_KEY`** | Données RGPD irrécupérables | Faible | 🔴 CRITIQUE |
| 2 | **Supabase = SPOF total** | Panne complète de l'application | Faible | 🔴 CRITIQUE |
| 3 | **`listUsers()` sans pagination** dans create-user | Doublon email non détecté si >1000 users | Moyenne | 🔴 CRITIQUE |
| 4 | **13 Edge Functions `verify_jwt=false`** | Accès non autorisé si auth manuelle défaillante | Moyenne | 🟠 HAUTE |
| 5 | **Pas de monitoring externe** sur health-check | Panne non détectée | Haute | 🟠 HAUTE |
| 6 | **Pas de CI/CD** — déploiement sans tests | Régression en production | Haute | 🟠 HAUTE |
| 7 | **Timeout fictif AuthContext** | Crash app si profil lent (>10s) | Faible | 🟡 MOYENNE |
| 8 | **Pas de backup Storage** | Perte définitive de fichiers | Faible | 🟡 MOYENNE |
| 9 | **CRONs de purge non planifiés** | Tables grossissent indéfiniment | Moyenne | 🟡 MOYENNE |
| 10 | **DevDeps en dependencies** | Bundle install lent, confusion | Haute | 🟢 FAIBLE |

---

## 3. Recommandations

### 🔴 Critiques (à corriger en priorité)

| # | Action | Effort | AXE |
|---|---|---|---|
| C1 | Sauvegarder `SENSITIVE_DATA_ENCRYPTION_KEY` dans un vault externe (1Password, AWS KMS) et documenter la procédure de rotation | 2h | AXE 5, 8 |
| C2 | Remplacer `listUsers()` par `getUserByEmail()` ou recherche paginée dans `create-user` | 1h | AXE 6 |
| C3 | Configurer un monitoring externe (UptimeRobot, Better Uptime) sur `/functions/v1/health-check` | 30min | AXE 7 |
| C4 | Corriger le timeout fictif dans AuthContext (utiliser AbortController + Promise.race) | 1h | AXE 3 |
| C5 | Auditer les 5 Edge Functions `verify_jwt=false` non-CRON (`reply-ticket-email`, `notify-new-ticket`, `migrate-export`, `email-to-ticket`, `media-get-signed-url`) pour vérifier que l'auth manuelle est correctement implémentée | 3h | AXE 4 |

### 🟠 Importantes (amélioration forte)

| # | Action | Effort | AXE |
|---|---|---|---|
| I1 | Envelopper les Edge Functions critiques dans `withSentry` (create-user, proxy-apogee, export-all-data, suggest-planning, generate-monthly-report) | 2h | AXE 7 |
| I2 | Vérifier que les CRONs de purge sont planifiés (purge_old_activity_logs, purge_expired_rate_limits, etc.) | 1h | AXE 5 |
| I3 | Déplacer les devDeps mal placées (vitest, jsdom, playwright, tar, glob, tsx) | 30min | AXE 6 |
| I4 | Documenter la procédure de restauration complète (DB + Storage + secrets) | 2h | AXE 8 |
| I5 | Ajouter gestion HTTP 429 (rate limit) dans le retry du QueryClient | 30min | AXE 3 |
| I6 | Corriger l'incohérence `project_id` dans `supabase/config.toml` | 5min | AXE 9 |

### 🟢 Confort (optimisations futures)

| # | Action | Effort | AXE |
|---|---|---|---|
| F1 | Ajouter un circuit breaker pour proxy-apogee | 4h | AXE 2 |
| F2 | Étendre `monitorEdgeCall` à 15+ appels edge critiques | 2h | AXE 7 |
| F3 | Mettre en place GitHub Actions pour CI (tests auto) | 4h | AXE 9 |
| F4 | Lazy-load les dépendances lourdes (mapbox, fabric, pdfjs) | 3h | AXE 6 |
| F5 | Unifier `agency_id` / `agence` (slug) dans profiles | 8h | AXE 5 |
| F6 | Documenter le self-host avec docker-compose Supabase | 4h | AXE 10 |
| F7 | Implémenter soft-delete sur les tables critiques | 4h | AXE 5, 8 |
| F8 | Ajouter MFA (TOTP) pour les comptes admin N5/N6 | 8h | AXE 4 |

---

## 4. Documents d'audit détaillés

| AXE | Document | Focus |
|---|---|---|
| 1 | [architecture.md](./architecture.md) | Architecture, SPOF, dépendances |
| 2 | [critical-flows.md](./critical-flows.md) | Flux end-to-end, cartographie |
| 3 | [error-handling.md](./error-handling.md) | Gestion erreurs, propagation |
| 4 | [security.md](./security.md) | Auth, permissions, secrets, CSP |
| 5 | [data-integrity.md](./data-integrity.md) | Tables, triggers, RLS, intégrité |
| 6 | [performance.md](./performance.md) | Requêtes, latence, bundle |
| 7 | [observability.md](./observability.md) | Logs, monitoring, alertes |
| 8 | [backup-recovery.md](./backup-recovery.md) | Sauvegardes, reprise, RPO/RTO |
| 9 | [deployment.md](./deployment.md) | CI/CD, secrets, rollback |
| 10 | [self-host.md](./self-host.md) | Portabilité, dépendances Lovable |

---

## 5. Conclusion

Operia est une application **bien architecturée sur le plan fonctionnel** avec un système de permissions robuste (7 niveaux de rôles, moteur centralisé, RLS sur toutes les tables), un chiffrement AES-256-GCM pour les données sensibles, et une base de code TypeScript maintenable.

Les principales lacunes sont **opérationnelles, pas architecturales**:
- L'observabilité est insuffisante pour détecter et diagnostiquer les incidents rapidement
- L'absence de CI/CD et de staging augmente le risque de régressions en production
- Certaines Edge Functions sans `verify_jwt` nécessitent un audit de leur auth manuelle
- La dépendance unique à Supabase crée un SPOF qui ne peut être mitigé qu'au niveau SLA

**En l'état, Operia est exploitable en production pour un réseau de franchise interne avec 20-50 agences et quelques centaines d'utilisateurs.** Pour évoluer vers un SaaS public multi-tenant, il faudra adresser les recommandations critiques et importantes ci-dessus.
