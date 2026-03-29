# Tests & Qualité OPERIA

> **Date** : 29 mars 2026

---

## 1. Stack de tests

| Outil | Usage | Config |
|-------|-------|--------|
| **Vitest** | Tests unitaires | `vitest.config.ts` |
| **Testing Library** | Tests composants React | `@testing-library/react` |
| **Playwright** | Tests E2E (prêt, non actif) | `@playwright/test` |
| **jsdom** | DOM virtuel pour tests | `jsdom` |

---

## 2. Tests unitaires existants

### Performance Engine (51 tests)

```
src/modules/performance/engine/__tests__/
├── computePerformance.test.ts
├── matchVisits.test.ts
├── durationHierarchy.test.ts
├── confidenceScore.test.ts
└── rules.test.ts
```

Couverture : calculs de durée, matching visites/créneaux, scores de confiance, seuils.

### StatIA

Tests de calcul métriques et normalisation dans `src/statia/`.

---

## 3. Seed users (test)

Edge Function `seed-test-users` crée des utilisateurs de test pour chaque rôle :

| Rôle | Email type |
|------|-----------|
| N0 (base_user) | `test-n0@operia.test` |
| N1 (franchisee_user) | `test-n1@operia.test` |
| N2 (franchisee_admin) | `test-n2@operia.test` |
| N3 (franchisor_user) | `test-n3@operia.test` |
| N4 (franchisor_admin) | `test-n4@operia.test` |
| N5 (platform_admin) | `test-n5@operia.test` |
| N6 (superadmin) | `test-n6@operia.test` |

---

## 4. Scénarios critiques à tester

### Permissions

- [ ] N1 sans délégation → aucun module plan
- [ ] N2 avec plan STARTER → modules STARTER uniquement
- [ ] N5+ → bypass complet
- [ ] Override individuel respecté
- [ ] Ghost key filtrée (pas dans module_registry)

### Auth

- [ ] Création utilisateur avec plafonnement N-1
- [ ] Suppression utilisateur N5+ uniquement
- [ ] Protection global_role (trigger)

### Données

- [ ] Sync Apogée avec données manquantes
- [ ] StatIA avec période sans données
- [ ] Performance avec zéro heures

---

## 5. E2E (Playwright — prêt, non activé)

Configuration prête dans `playwright.config.ts`. Tests E2E non encore écrits.

Scénarios prioritaires pour activation :
1. Login → dashboard → navigation onglets
2. Création utilisateur N1 par N2
3. Délégation droits N2 → N1
4. Accès module protégé (guard)
5. Changement de plan agence

---

## 6. Edge Function tests

Utiliser `supabase--test_edge_functions` pour tester les Edge Functions avec Deno test runner.

```bash
# Tester une fonction spécifique
supabase functions test create-user
```

Tests dans `supabase/functions/tests/`.
