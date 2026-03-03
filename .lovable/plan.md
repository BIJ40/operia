

## Diagnostic

L'edge function `apporteur-auth-verify-code` fonctionne correctement (testé: retourne 200 avec le token). Le problème est un **bug CORS côté navigateur**: le `fetch()` utilise `credentials: 'include'` mais les headers CORS retournés ne contiennent **pas** `Access-Control-Allow-Credentials: true`. Le navigateur rejette donc la réponse, ce qui déclenche le `catch` et affiche "Erreur de connexion au serveur".

## Plan de correction

### 1. Ajouter `Access-Control-Allow-Credentials` dans `_shared/cors.ts`

Modifier `getCorsHeaders()` pour inclure `'Access-Control-Allow-Credentials': 'true'` quand l'origin est explicitement autorisée (requis par la spec Fetch pour `credentials: 'include'`).

### 2. Vérifier la cohérence dans `handleCorsPreflightOrReject`

Le preflight OPTIONS doit aussi retourner ce header.

### Fichier impacté
- `supabase/functions/_shared/cors.ts` : ajouter `Access-Control-Allow-Credentials: true` dans `getCorsHeaders()`

C'est un changement d'une seule ligne qui débloque toute la chaîne d'authentification apporteur.

