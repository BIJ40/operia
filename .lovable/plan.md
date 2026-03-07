

## Probleme identifie

Le `useEffect` dans `AppContent` tente de detecter `type=recovery` dans le hash URL pour rediriger vers `/reset-password`. Mais il y a une **race condition** : le client Supabase traite le token du hash **avant** que le `useEffect` ne s'execute, ce qui :
1. Etablit une session authentifiee (l'utilisateur est connecte)
2. Consomme/nettoie le hash de l'URL
3. Le `useEffect` ne trouve plus `type=recovery` dans le hash

Resultat : l'utilisateur se retrouve connecte sur `/` (qui affiche le dashboard ou le login) au lieu d'etre redirige vers le formulaire de nouveau mot de passe.

## Solution

Ecouter l'evenement `PASSWORD_RECOVERY` de Supabase dans `AppContent` et rediriger vers `/reset-password` quand cet evenement se declenche. C'est fiable car Supabase emet cet evenement **apres** avoir traite le token, et la session est deja etablie.

### Fichier modifie : `src/App.tsx`

- Remplacer le `useEffect` qui detecte `type=recovery` dans le hash par un listener `supabase.auth.onAuthStateChange` qui ecoute l'evenement `PASSWORD_RECOVERY`
- Quand l'evenement est detecte, `navigate('/reset-password', { replace: true })`
- La page `ResetPassword` n'a plus besoin du hash — elle verifie juste la session existante (deja implemente avec `getSession`)

### Fichier modifie : `src/pages/ResetPassword.tsx`

- Simplifier la detection : au lieu d'attendre uniquement `PASSWORD_RECOVERY`, accepter aussi une session existante directement (deja fait)
- Aucun changement majeur necessaire

### Aucun autre fichier modifie

