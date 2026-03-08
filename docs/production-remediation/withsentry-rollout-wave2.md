# withSentry Rollout — Vague 2

## Objectif

Étendre la couverture Sentry aux Edge Functions critiques restantes en les enveloppant avec le wrapper `withSentry` existant (`supabase/functions/_shared/withSentry.ts`).

## Fonctions traitées

| Fonction | Statut | Notes |
|----------|--------|-------|
| `create-user` | ✅ Enveloppé | Import `withSentry` ajouté, `serve(withSentry(...))` |
| `export-all-data` | ✅ Enveloppé | Import `withSentry` ajouté, `Deno.serve(withSentry(...))` |
| `suggest-planning` | ✅ Enveloppé | Import `withSentry` ajouté, `Deno.serve(withSentry(...))` |
| `generate-monthly-report` | ✅ Enveloppé | Import `withSentry` ajouté, `Deno.serve(withSentry(...))` |

## Fonctions NON traitées

| Fonction | Raison |
|----------|--------|
| `proxy-apogee` | ❌ **Déjà instrumenté.** Cette fonction importe et utilise directement `captureEdgeException` dans son catch block (ligne 357). L'ajouter dans `withSentry` causerait un double-reporting des erreurs vers Sentry. L'instrumentation actuelle est correcte et suffisante. |

## Garanties de compatibilité

Le wrapper `withSentry` :
- **N'interfère pas avec CORS** : les fonctions gèrent déjà CORS via `handleCorsPreflightOrReject` / `withCors`. Le wrapper ajoute ses propres CORS headers uniquement sur les erreurs non capturées (500). En fonctionnement normal, les headers CORS de la fonction sont préservés.
- **N'interfère pas avec l'auth** : le wrapper ne touche pas aux headers d'autorisation.
- **Préserve les réponses** : en cas de succès, la réponse originale est retournée telle quelle, avec les CORS headers ajoutés.
- **Capture silencieuse** : en cas d'erreur non capturée, Sentry est appelé en fire-and-forget. Aucun popup, aucun impact utilisateur.

## Comportement du wrapper

```
Requête → withSentry → handler original → Réponse
                 ↓ (si throw non capturé)
          Sentry (fire-and-forget) → 500 JSON
```

Les erreurs qui sont déjà capturées par les `try/catch` internes des fonctions ne remontent PAS au wrapper — elles sont gérées normalement par la fonction.
