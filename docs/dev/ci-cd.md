# Operia — Pipeline CI/CD

## Vue d'ensemble

La pipeline CI s'exécute automatiquement sur chaque `push` et `pull_request` vers `main`/`master`.

```
Setup → TypeScript + Unit Tests (parallèle, bloquants) → Build (bloquant)
     ↘ Lint (parallèle, non bloquant)
     ↘ Edge Tests (parallèle, non bloquant)
```

## Statut des jobs

| Job | Outil | Bloquant | Notes |
|-----|-------|----------|-------|
| **✅ TypeScript** | `tsc --noEmit` | **Oui** | 0 erreur requis |
| **✅ Unit Tests** | `vitest run` | **Oui** | Tous les tests doivent passer |
| **✅ Build** | `vite build` | **Oui** | Compilation réussie requise |
| **⚠️ Lint** | `eslint` | **Non (temporaire)** | ~1900 problèmes legacy — `continue-on-error: true` |
| **⚠️ Edge Function Tests** | `deno test` | **Non (temporaire)** | Incompatibilité lock Deno v5 — `continue-on-error: true` |
| **🎭 E2E** | `playwright` | Conditionnel | Uniquement si `E2E_BASE_URL` configuré |

### Pourquoi Lint est non bloquant ?

Le projet contient ~1900 problèmes ESLint hérités. Bloquer les merges sur ce volume de dette empêcherait tout déploiement. Le job reste visible pour suivre la résorption progressive.

### Pourquoi Edge Tests sont non bloquants ?

Le lockfile Deno v5 génère des erreurs de compatibilité avec `setup-deno`. Le job reste visible pour détecter les régressions dès que le tooling sera mis à jour.

## Secrets GitHub requis

| Secret/Variable | Obligatoire | Usage |
|-----------------|-------------|-------|
| `SUPABASE_URL` | Oui (pour edge tests) | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Oui (pour edge tests) | Clé anon publique |
| `E2E_BASE_URL` (variable) | Non | Active les tests E2E si présent |

## Branch protection recommandée

Checks à sélectionner comme **required** dans GitHub → Settings → Branches → `main` :

1. **🔍 TypeScript**
2. **🧪 Unit Tests**
3. **🏗️ Build**

Ne **pas** sélectionner comme required :
- ⚠️ Lint (legacy debt)
- ⚠️ Edge Function Tests (tooling)

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
