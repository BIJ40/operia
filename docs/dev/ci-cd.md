# Operia — Pipeline CI/CD

## Vue d'ensemble

La pipeline CI s'exécute automatiquement sur chaque `push` et `pull_request` vers `main`/`master`.

```
Setup → TypeScript + Lint + Unit Tests (parallèle) → Build → E2E (conditionnel)
                                                   ↗
                               Edge Tests (parallèle, indépendant)
```

## Jobs

| Job | Outil | Condition | Seuil |
|-----|-------|-----------|-------|
| **TypeScript** | `tsc --noEmit` | Toujours | 0 erreur |
| **Lint** | `eslint` | Toujours | 0 erreur |
| **Unit Tests** | `vitest run` | Toujours | 255+ tests passent |
| **Edge Tests** | `deno test` | Toujours | 19 tests passent |
| **Build** | `vite build` | Après typecheck+lint+tests | Compilation réussie |
| **E2E** | `playwright` | Si `E2E_BASE_URL` configuré | Tous les specs passent |

## Secrets GitHub requis

| Secret/Variable | Obligatoire | Usage |
|-----------------|-------------|-------|
| `SUPABASE_URL` | Oui (pour edge tests) | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Oui (pour edge tests) | Clé anon publique |
| `E2E_BASE_URL` (variable) | Non | Active les tests E2E si présent |

## Lancer la CI en local

```bash
# Vérification rapide (typecheck + tests + build)
npm run ci:check

# Tests unitaires seuls
npx vitest run

# Tests Edge Functions (nécessite Deno)
deno test supabase/functions/tests/ --allow-net --allow-env --allow-read

# Tests E2E (nécessite le serveur dev)
npm run dev &
E2E_BASE_URL=http://localhost:5173 npm run test:e2e
```

## Corriger un build cassé

1. **TypeScript** — Lire l'erreur `tsc`, corriger le type ou l'import
2. **Lint** — `npm run lint` localement, corriger les warnings/erreurs
3. **Unit Tests** — `npx vitest run` pour reproduire, corriger le test ou le code
4. **Edge Tests** — Vérifier les secrets Supabase, relancer `deno test`
5. **Build** — Souvent lié à un problème TypeScript déjà visible en typecheck

## Bloquer les merges

Pour empêcher les merges quand la CI échoue :

1. GitHub → Settings → Branches → Branch protection rules
2. Ajouter une règle pour `main`
3. Cocher **Require status checks to pass before merging**
4. Sélectionner les jobs : `Build`, `Unit Tests`, `TypeScript`
