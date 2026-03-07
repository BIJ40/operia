

## Problème

Après la migration, les mots de passe des utilisateurs existants dans `auth.users` n'ont pas été récupérés. Quand ils tentent de se connecter → "Email ou mot de passe incorrect". Il n'existe **aucun flux "Mot de passe oublié"** dans l'app — le login dit juste "contactez votre administrateur".

Le mécanisme `must_change_password` + `WelcomeWizard` fonctionne uniquement **après** une connexion réussie, donc il ne peut pas aider si l'utilisateur ne peut pas se connecter du tout.

## Solution

Ajouter un flux complet **"Mot de passe oublié"** en self-service :

### 1. Lien "Mot de passe oublié" sur le formulaire de login
- Ajouter un lien sous le champ mot de passe dans `LoginFormCard.tsx`
- Au clic, afficher un champ email + bouton "Envoyer le lien de réinitialisation"
- Appel `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

### 2. Page `/reset-password`
- Créer `src/pages/ResetPassword.tsx` — page publique
- Détecte le token `type=recovery` dans le hash de l'URL (Supabase redirige avec ce paramètre)
- Formulaire : nouveau mot de passe + confirmation
- Validation identique à `ChangePasswordDialog` (8+ chars, maj, min, chiffre, symbole)
- Appel `supabase.auth.updateUser({ password })` puis met `must_change_password = false`
- Après succès, redirige vers `/`

### 3. Route dans App.tsx
- Ajouter `<Route path="/reset-password" element={<ResetPassword />} />` (déjà dans les routes publiques de `AuthRouter`)

### Pour les utilisateurs migrés spécifiquement
- Ce flux résout le problème : l'utilisateur clique "Mot de passe oublié", reçoit un email de Supabase, et peut définir un nouveau mot de passe
- Aucune intervention admin nécessaire
- Le flux fonctionne aussi pour les futurs oublis de mot de passe

### Fichiers modifiés/créés
- **Modifié** : `src/components/LoginFormCard.tsx` — ajout du lien + formulaire "mot de passe oublié"
- **Créé** : `src/pages/ResetPassword.tsx` — page de réinitialisation
- **Modifié** : `src/App.tsx` — ajout de la route `/reset-password`

