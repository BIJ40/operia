

## Diagnostic : "Erreur de connexion au serveur" sur le portail Apporteur

### Cause racine

Le secret **`RESEND_API_KEY`** est **absent** des secrets Supabase. La ligne 14 de `apporteur-auth-send-code/index.ts` fait :

```ts
const resend = new Resend(Deno.env.get("RESEND_API_KEY")); // undefined
```

Cela crashe immédiatement au démarrage de la fonction avec :
```
TypeError: Failed to construct 'Headers': Argument 1 is not a valid ByteString
```

La fonction ne peut même pas répondre — d'ou le catch coté client qui affiche "Erreur de connexion au serveur".

### Impact

8 edge functions utilisent `RESEND_API_KEY` :
- `apporteur-auth-send-code` (OTP login) — **BLOQUANT**
- `notify-apporteur-request`
- `cancel-apporteur-request`
- `create-user` (envoi email bienvenue)
- `reset-user-password`
- `notify-new-ticket`
- `reply-ticket-email`
- `email-to-ticket`

### Correction

1. **Ajouter le secret `RESEND_API_KEY`** dans les secrets Supabase avec votre clé API Resend.

2. **Correction défensive** (optionnelle mais recommandée) : déplacer l'initialisation Resend à l'intérieur du handler pour éviter un crash au démarrage si le secret est manquant, et retourner une erreur 500 propre.

### Ce qu'il faut faire maintenant

Avez-vous un compte Resend avec une clé API ? Si oui, je peux l'ajouter comme secret. Sinon, il faut en créer un sur [resend.com](https://resend.com) et vérifier le domaine `helpconfort.services`.

