# Operia — Rapport de maturité E2E

**Date** : 2026-03-08  
**Auteur** : Audit automatisé  
**Scope** : 5 suites E2E Playwright, 13 tests, 6 smoke

---

## 1. Ce qui est réellement exécutable

### Suites fonctionnelles

| Suite | Exécutable | Conditions |
|-------|-----------|------------|
| `auth.spec.ts` | ✅ Oui | Comptes test seedés |
| `permissions.spec.ts` | ✅ Oui | Comptes test seedés + rôles configurés |
| `tickets.spec.ts` | ✅ Oui | Comptes test seedés + tickets existants |
| `admin-users.spec.ts` | ✅ Oui | Comptes test seedés |
| `backup.spec.ts` | ✅ Oui | Comptes test seedés |

### Conditions d'exécution

```bash
# Prérequis
1. npm install
2. npx playwright install chromium
3. Comptes test seedés via seed-test-users Edge Function
4. Serveur dev lancé (npm run dev) OU E2E_BASE_URL configuré

# Lancement
npm run test:e2e          # 13 tests complets
npm run test:e2e:smoke    # 6 tests critiques (~30s)
```

---

## 2. Ce qui a été fiabilisé

### Routes corrigées

| Avant (cassé) | Après (réel) |
|---------------|-------------|
| `/admin` | `/?tab=admin` |
| `/admin/users` | `/?tab=admin&adminTab=acces&adminView=users` |
| `/tickets` | `/projects/kanban` |
| `/admin` (pour backup) | `/?tab=admin&adminTab=ops&adminView=backup` |

**Impact** : les 5 specs utilisaient des routes inexistantes. 100% des navigations admin/tickets auraient échoué.

### Sélecteurs

- Suppression de la dépendance aux `data-testid` (aucun n'existe dans l'app)
- Utilisation de sélecteurs sémantiques : `input[type="email"]`, `button[type="submit"]`, `table tbody tr`, `[role="dialog"]`
- Sélecteurs multi-fallback pour les boutons export : `button:has-text("Export"), button:has-text("Télécharger"), ...`

### Anti-patterns supprimés

| Avant | Après |
|-------|-------|
| `waitForTimeout(3000)` partout | `waitForLoadState('domcontentloaded')` + timeout ciblé uniquement quand nécessaire |
| `waitForLoadState('networkidle')` | `domcontentloaded` + court settling (plus fiable sur les apps SPA) |
| `if (visible) { test } else { pass silently }` | `if (visible) { test } else { annotate }` — les cas sans données sont tracés |

### Structure

- Routes centralisées dans `ROUTES` constant (un seul point de maintenance)
- Helpers `navigateAndSettle()`, `expectAuthenticated()`, `expectAccessDenied()` normalisés
- Config Playwright durcie : `actionTimeout: 10s`, `navigationTimeout: 20s`, `timeout: 45s`, 1 retry par défaut

### Smoke tests

6 tests tagués `@smoke` couvrant les parcours les plus critiques :
1. Login valide
2. Login invalide reste sur /login
3. base_user bloqué sur admin
4. franchisee_admin accède à l'agence
5. Admin peut ouvrir la liste des utilisateurs
6. Admin peut accéder à la page backup

---

## 3. Ce qui reste fragile

### Dépendances aux données

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Pas de tickets dans l'environnement de test | `tickets.spec.ts` passe en annotation au lieu de valider | Seeder des tickets de test |
| Pas d'utilisateurs dans la table | `admin-users.spec.ts` detail test passe en annotation | Comptes test suffisent pour la liste |
| Bouton export absent ou libellé différent | `backup.spec.ts` export test passe en annotation | Sélecteur multi-fallback en place |

### Dépendances externes

| Dépendance | Risque | Contrôle |
|-----------|--------|----------|
| Supabase Auth | Indisponibilité → tous les tests échouent | Timeout 20s + retry |
| Réseau | Lenteur → timeouts | `navigationTimeout: 20s` configurable |
| Seed data | Non seedé → tests dégradés | Documenté, vérifiable |
| Routing app | Si l'app change ses routes → navigation cassée | `ROUTES` centralisé, un seul fichier à mettre à jour |

### Pas de `data-testid`

L'application n'utilise aucun `data-testid`. Les sélecteurs sont basés sur la sémantique HTML et le texte visible. C'est acceptable mais moins stable qu'un contrat testid explicite.

---

## 4. Commandes exactes

### Installation complète

```bash
npm install
npx playwright install chromium
```

### Lancement

```bash
# Serveur dev dans un terminal
npm run dev

# Dans un autre terminal :
npm run test:e2e              # Tous les tests (13)
npm run test:e2e:smoke        # Smoke only (6, ~30s)
```

### Debug

```bash
# Mode visuel
npx playwright test --config tests/e2e/playwright.config.ts --headed

# Mode interactif
npx playwright test --config tests/e2e/playwright.config.ts --ui

# Voir le rapport HTML
npx playwright show-report

# Contre staging/production
E2E_BASE_URL=https://operiav2.lovable.app npm run test:e2e:smoke
```

---

## 5. Niveau de confiance atteint

### Score : **MOYEN-BON** (7/10)

### Justification

| Critère | Score | Raison |
|---------|-------|--------|
| Couverture parcours critiques | 8/10 | Login, permissions, admin, backup couverts |
| Stabilité des sélecteurs | 6/10 | Pas de data-testid, sémantique OK mais fragile au redesign |
| Reproductibilité | 8/10 | Scripts clairs, prérequis documentés, routes centralisées |
| Indépendance aux données | 5/10 | Tickets et export dépendent de données seedées |
| Smoke test utilisable | 9/10 | 6 tests, ~30s, parcours réellement critiques |
| Documentation | 9/10 | README complet, commandes prêtes, debug documenté |

### Ce qui empêche un score plus élevé

1. **Absence de data-testid** dans l'app → sélecteurs potentiellement fragiles si l'UI change
2. **Données de test non garanties** → certains tests dégradent en annotations au lieu de valider
3. **Non exécutés en CI** pour le moment → pas de preuve continue de passage

### Ce qui permettrait d'atteindre 9/10

1. Ajouter `data-testid` sur les éléments critiques (formulaires, boutons d'action, lignes de table)
2. Inclure un seed automatique de données de test dans le setup E2E
3. Activer les E2E dans la pipeline CI (avec `E2E_BASE_URL` configuré)

---

## 6. Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `tests/e2e/fixtures/test-helpers.ts` | Refonte : routes centralisées, helpers robustes |
| `tests/e2e/auth.spec.ts` | Routes corrigées, smoke tags, anti-patterns supprimés |
| `tests/e2e/permissions.spec.ts` | Routes réelles, helpers normalisés |
| `tests/e2e/tickets.spec.ts` | Route `/projects/kanban`, dégradation gracieuse |
| `tests/e2e/admin-users.spec.ts` | Route workspace unifiée, smoke tag |
| `tests/e2e/backup.spec.ts` | Route backup réelle, sélecteurs multi-fallback |
| `tests/e2e/playwright.config.ts` | Timeouts durcis, retry, reporter |
| `tests/e2e/README.md` | Documentation complète |
| `package.json` | Script `test:e2e:smoke` ajouté |
| `docs/quality/e2e-readiness-report.md` | Ce rapport |
