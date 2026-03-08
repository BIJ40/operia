

## Diagnostic : "Non autorisé" partout sur l'espace Apporteur

### Cause racine identifiée

Les Edge Functions `get-apporteur-dossiers`, `get-apporteur-stats` et `get-apporteur-planning` ont `verify_jwt = true` dans `config.toml`. Cela signifie que le gateway Supabase exige un JWT valide dans l'en-tête `Authorization`. Or, pour un utilisateur connecté uniquement via OTP (pas de session Supabase Auth), le client envoie la **clé anon** comme Bearer token.

Le problème : le gateway accepte la clé anon (JWT valide), mais la fonction `authenticateApporteur` dans `_shared/apporteurAuth.ts` **n'a aucun log** sur le chemin d'échec. Si le token custom ne matche pas en base, la fonction retourne `null` silencieusement → l'edge function retourne `{ error: "Non autorisé" }` → le bandeau amber s'affiche.

Les données en base sont correctes (apporteur actif, apogee_client_id=40, agence slug=dax, session non expirée). Le problème est probablement un **mismatch de token** (le hash stocké ne correspond pas au token envoyé par le client).

### Corrections (3 fichiers, 0 nouvelle feature)

**1. `supabase/config.toml`** — Passer les fonctions apporteur data en `verify_jwt = false`

Les 3 fonctions data gèrent leur propre authentification via `authenticateApporteur`. Le `verify_jwt = true` est redondant et force le client à envoyer un JWT Supabase qu'il n'a pas forcément.

```
get-apporteur-stats → verify_jwt = false
get-apporteur-dossiers → verify_jwt = false
get-apporteur-planning → verify_jwt = false
```

**2. `supabase/functions/_shared/apporteurAuth.ts`** — Ajouter du logging diagnostique

Ajouter `console.log` sur chaque étape de l'authentification pour tracer exactement où ça échoue :
- Token custom reçu ? (oui/non, longueur)
- Hash trouvé en base ? (oui/non)
- Manager actif ? Apporteur actif ?
- `apogee_client_id` présent ?
- Agency slug trouvé ?

**3. `supabase/functions/get-apporteur-dossiers/index.ts`** (+ stats + planning) — Logger l'échec auth

Ajouter un `console.warn` quand `authenticateApporteur` retourne `null` pour que l'échec apparaisse dans les logs.

### Résultat attendu

- Les edge functions apporteur fonctionneront sans JWT Supabase (uniquement le token OTP custom)
- Les logs permettront de diagnostiquer exactement où l'auth échoue
- Si le problème persiste, les logs indiqueront la cause exacte

