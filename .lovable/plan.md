
Diagnostic

- Do I know what the issue is? Oui.
- Ce n’est pas un problème de preview ni de RLS Supabase : `suivi-api-proxy` s’exécute bien, et l’échec se produit dans la logique de vérification.
- Les logs montrent 2 causes combinées pour le dossier `202601008` :
  1. `apiGetProjectByHashZipCode` renvoie encore `500` car `buildHashZipPayloads()` envoie toujours `codePostal` + `zipCode` + `zipcode` au lieu de `codePostal` seul.
  2. Quand cet appel casse, le fallback ne résout pas le vrai client via `clientId` + `apiGetClients`; il ne regarde que `project.client`, donc il journalise `Fallback postal comparison input=40320 project=` et rejette un code valide.

Plan d’intervention express

1. Corriger le hotfix principal dans `supabase/functions/suivi-api-proxy/index.ts`
   - faire envoyer à `buildHashZipPayloads()` uniquement :
     ```ts
     { ref, hash, codePostal }
     ```
   - mettre à jour le log pour afficher `payload.codePostal`

2. Renforcer le fallback sécurisé
   - ajouter un helper pour résoudre le client réel depuis :
     - `project.client`
     - `project.clientId`
     - `project.data?.clientId`
   - si nécessaire, appeler `apiGetClients` et retrouver le client du dossier
   - élargir l’extraction du CP aux variantes `codePostal/postalCode/cp` et `adresse/address`

3. Rejouer la validation hash + code postal proprement
   - comparer le CP saisi au CP client normalisé
   - si ça matche, relancer `apiGetProjectByHashZipCode` avec le bon `codePostal`
   - conserver un mode fail-closed : si le hash n’est toujours pas validé, on refuse l’accès

4. Faire un second passage de fiabilisation sur les autres fonctions suivi
   - aligner la même normalisation dans :
     - `supabase/functions/suivi-stripe-checkout/index.ts`
     - `supabase/functions/suivi-send-client-photos/index.ts`
     - `supabase/functions/suivi-update-client-contact/index.ts`
     - `supabase/functions/suivi-update-client-email/index.ts`
     - `supabase/functions/suivi-signaler-empechement/index.ts`
   - objectif : éviter d’autres “code postal incorrect” après l’ouverture du dossier

Détails techniques

- Fichier critique : `supabase/functions/suivi-api-proxy/index.ts`
- Le frontend n’est pas la panne principale ici.
- Pour l’urgence, une republication frontend n’est pas nécessaire si on ne touche qu’à l’edge function.
- Le correctif prioritaire est donc un redéploiement de `suivi-api-proxy`.

Validation après implémentation

- Tester avec :
  - preview : `/suivi/dax/202601008/5fbe517f`
  - domaine suivi publié : `/dax/202601008/5fbe517f`
- Vérifier 3 cas :
  1. `40320` ouvre bien le dossier
  2. un faux CP reste refusé
  3. les logs ne montrent plus le `500` lié au payload hash+zip

Point de vigilance

- Si `apiGetProjectByHashZipCode` renvoie encore `500` même avec `codePostal` seul, alors la panne restante est côté Apogée et non côté Lovable. Dans ce cas, le nouveau logging permettra de le prouver immédiatement sans affaiblir la sécurité.
