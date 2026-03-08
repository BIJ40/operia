

## Correction : ajout du guard CRON_SECRET sur `epi-generate-monthly-acks`

### Problème
La fonction `epi-generate-monthly-acks` (verify_jwt=false) n'a aucune vérification d'authentification. N'importe quel appelant anonyme peut déclencher la création/modification massive de données EPI RH.

### Correction
Ajouter un guard `CRON_SECRET` identique à celui de `trigger-monthly-reports` :

1. **Ajouter `x-cron-secret` dans les CORS headers** autorisés
2. **Ajouter le bloc de vérification** avant toute logique métier :
   - Lire `CRON_SECRET` depuis `Deno.env`
   - Comparer avec le header `X-CRON-SECRET`
   - Retourner 401 si absent ou invalide

### Fichier modifié
- `supabase/functions/epi-generate-monthly-acks/index.ts`

### Garanties
- Aucun changement de logique métier
- Aucun changement de contrat de réponse (même JSON en succès)
- Le secret `CRON_SECRET` est déjà provisionné dans l'environnement Supabase (utilisé par `trigger-monthly-reports`)
- Tout appelant existant (pg_cron, appel manuel) doit simplement ajouter le header `X-CRON-SECRET`

