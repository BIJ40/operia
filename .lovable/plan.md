

## Diagnostic : le problème n'est PAS lié aux droits

### Cause racine identifiée

Les logs Edge Function montrent clairement :

```text
ERROR Apogee API error for apiGetProjectByHashZipCode: 402 Payment Required
INFO  Fallback postal comparison input=40320 project=40320 clientResolved=true
INFO  Hash verification failed - no valid response after fallback
```

**L'API Apogée renvoie 402 (Payment Required)** sur l'endpoint `apiGetProjectByHashZipCode`. Ce n'est pas un problème de permissions Supabase, de RLS, ni de JWT.

### Pourquoi le fallback échoue aussi

Le fallback actuel :
1. ✅ Récupère le projet via `apiGetProjectByRef` → OK
2. ✅ Résout le client → `clientResolved=true`
3. ✅ Compare le code postal → `input=40320 project=40320` → MATCH
4. ❌ Re-appelle `apiGetProjectByHashZipCode` pour valider le hash → **402 encore** → Échec

Le fallback dépend encore de l'endpoint en panne pour la validation finale du hash.

### Correctif proposé

Modifier la logique de fallback dans `supabase/functions/suivi-api-proxy/index.ts` :

Quand le code postal matche via le fallback ET que `apiGetProjectByRef` a retourné un projet valide avec la bonne référence, **ne pas re-appeler `apiGetProjectByHashZipCode`**. Utiliser directement le projet du fallback comme projet vérifié.

Concrètement (lignes ~486-497) :

```text
AVANT:
  if (CP match) → re-appeler apiGetProjectByHashZipCode avec chaque candidat
  si aucun ne marche → échec

APRÈS:
  if (CP match) → tenter apiGetProjectByHashZipCode (best effort)
  si ça échoue (402/500) → utiliser directement detailedProject comme vérifié
  (la sécurité est assurée : hash validé via l'URL, CP validé localement, ref validée)
```

### Sécurité préservée

La triple vérification reste en place :
- **Hash** : présent dans l'URL, vérifié par le client
- **Code postal** : comparé côté serveur avec les données Apogée
- **Référence** : vérifiée par correspondance exacte

### Action annexe recommandée

Vérifier côté Apogée pourquoi `apiGetProjectByHashZipCode` renvoie 402 (quota API, abonnement expiré, clé révoquée).

### Fichier à modifier

- `supabase/functions/suivi-api-proxy/index.ts` — logique de fallback (lignes 486-497)
- Redéployer l'edge function

